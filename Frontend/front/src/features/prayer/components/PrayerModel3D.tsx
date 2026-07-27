import { useEffect, useRef, useState } from 'react';
import type { MovementName, PrayerId } from '../types/prayer.types';
import { resolveMovementTiming } from '../constants/movementTimeline';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { THEME_CONFIGS } from '../../../shared/theme/themeVars';
import { createModelPoseLandmarker } from '../services/mediapipeService';
import { MODEL_POSE_MEDIAPIPE_CONFIG } from '../constants/prayerConfig';
import css from './PrayerModel3D.module.css';

const SKETCHFAB_SCRIPT_SRC = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
const MODEL_UID = 'eb0f80a7278243b4988b159fc957bbd5';

/** How much further back from the model the camera sits, relative to its default distance. */
const ZOOM_OUT_FACTOR = 1.0;

/** How often (ms) to poll playback time while animating toward a target timestamp. */
const ANIMATION_POLL_MS = 80;
/** Close enough to the target timestamp to stop and snap to it exactly. */
const TIME_EPSILON = 0.05;

interface CameraLookAt {
  position: [number, number, number];
  target: [number, number, number];
}

/** A material channel as returned by `getMaterialList` — only the fields this file touches. */
interface MaterialChannel {
  enable?: boolean;
  color?: [number, number, number];
  factor?: number;
  /** A baked texture map, if any. Texture and `color` are mutually exclusive in the
   * Sketchfab API — a channel with a texture ignores `color` entirely, so forcing a flat
   * color requires deleting this first. */
  texture?: unknown;
}

interface SketchfabMaterial {
  id: number;
  name: string;
  channels: Record<string, MaterialChannel | undefined>;
}

/** A scene node as returned by `getNodeMap` — only the field this file touches. */
interface SketchfabNode {
  name?: string;
}

interface SketchfabApi {
  start: () => void;
  play: (callback?: (err: unknown) => void) => void;
  pause: (callback?: (err: unknown) => void) => void;
  seekTo: (time: number, callback?: (err: unknown) => void) => void;
  getCurrentTime: (callback: (err: unknown, time: number) => void) => void;
  setSpeed: (speed: number, callback?: (err: unknown) => void) => void;
  getCameraLookAt: (callback: (err: unknown, camera: CameraLookAt) => void) => void;
  setCameraLookAt: (
    position: [number, number, number],
    target: [number, number, number],
    duration?: number,
    callback?: (err: unknown) => void
  ) => void;
  getMaterialList: (callback: (err: unknown, materials: SketchfabMaterial[]) => void) => void;
  setMaterial: (material: SketchfabMaterial, callback?: (err: unknown) => void) => void;
  setEnvironment: (options: { shadowEnabled?: boolean }, callback?: (err: unknown) => void) => void;
  getNodeMap: (callback: (err: unknown, nodes: Record<string, SketchfabNode>) => void) => void;
  hide: (instanceId: string, callback?: (err: unknown) => void) => void;
  /** Captures a screenshot of the rendered viewer as a base64 data URL — the only way to
   * get pixel data out of the Sketchfab canvas, since it lives in a cross-origin iframe
   * (a plain `drawImage`/`getImageData` off it would be CORS-tainted). Used to feed frames
   * to the face-tracking pose model (see the face-tracking effect in the component below). */
  getScreenShot: (
    width: number,
    height: number,
    mimetype: string,
    callback: (err: unknown, dataUrl: string) => void
  ) => void;
  addEventListener: (event: 'viewerready', callback: () => void) => void;
}

interface SketchfabClient {
  init: (
    uid: string,
    options: {
      success: (api: SketchfabApi) => void;
      error: () => void;
      autostart?: 0 | 1;
      transparent?: 0 | 1;
      ui_infos?: 0 | 1;
      ui_controls?: 0 | 1;
      ui_stop?: 0 | 1;
      ui_animations?: 0 | 1;
      ui_annotations?: 0 | 1;
      ui_help?: 0 | 1;
      ui_settings?: 0 | 1;
      ui_vr?: 0 | 1;
      ui_ar?: 0 | 1;
      ui_fullscreen?: 0 | 1;
      ui_hint?: 0 | 1;
      ui_watermark?: 0 | 1;
      ui_watermark_link?: 0 | 1;
    }
  ) => void;
}

declare global {
  interface Window {
    Sketchfab?: new (iframe: HTMLIFrameElement) => SketchfabClient;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Injects the official Sketchfab viewer script once and reuses it across mounts. */
function loadSketchfabScript(): Promise<void> {
  if (window.Sketchfab) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SKETCHFAB_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Sketchfab viewer API'));
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Turns off the scene's cast shadow (the dark patch the character throws onto the
 * carpet/ground), via the Viewer API's environment settings. */
function disableShadow(api: SketchfabApi): void {
  api.setEnvironment({ shadowEnabled: false });
}

/** Name pattern for meshes whose raised/hollow geometry (eyeballs, mouth cavity) stays
 * visible as a shape even after being recolored flat — recoloring only hides their
 * texture detail, not the bump/cavity itself, so this hides the nodes outright instead. */
const HIDE_NODE_PATTERN = /eye|teeth/i;

/** Hides specific mesh nodes (found by name via getNodeMap) rather than just recoloring
 * them, so their geometry disappears entirely instead of reading as a flat-colored bump. */
function hideFacialFeatures(api: SketchfabApi): void {
  api.getNodeMap((err, nodes) => {
    if (err || !nodes) return;
    // Left in deliberately, same reasoning as the materials debug in applyModelColors:
    // node names aren't guaranteed to match material names, so this confirms/corrects
    // HIDE_NODE_PATTERN against what the model's scene graph actually calls things.
    console.debug('[PrayerModel3D] nodes:', Object.values(nodes).map((n) => n?.name));
    Object.keys(nodes).forEach((instanceId) => {
      const name = nodes[instanceId]?.name;
      if (name && HIDE_NODE_PATTERN.test(name)) {
        api.hide(instanceId);
      }
    });
  });
}

/** Pulls the camera back from its default distance so the model reads a bit smaller/further away. */
function applyZoomOut(api: SketchfabApi): void {
  api.getCameraLookAt((err, camera) => {
    if (err || !camera) return;
    const { position, target } = camera;
    const zoomedPosition: [number, number, number] = [0, 1, 2].map(
      (i) => target[i] + (position[i] - target[i]) * ZOOM_OUT_FACTOR
    ) as [number, number, number];
    api.setCameraLookAt(zoomedPosition, target, 0);
  });
}

/**
 * Name pattern used to pick out the carpet/rug material, case-insensitive — in case the
 * model's own naming (or a future re-upload) varies between e.g. "rug"/"carpet"/"sajjad".
 * Every *other* material in the model is treated as part of the character (the model has
 * many separate materials — hands, face, feet, robe, headwear, etc. — with names that
 * don't share a common pattern, so rather than trying to name-match each one, anything
 * that isn't the carpet gets the same flat character color). Adjust this if the carpet
 * stops matching — see the console.debug in `applyModelColors` below, which prints every
 * material name the model actually has.
 */
const CARPET_PATTERN = /carpet|rug|saj+ad/i;

/** '#rrggbb' -> normalized [r,g,b] in 0..1, as the Sketchfab material API expects. */
function hexToRgb01(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Sets a material's base color and makes sure it's actually visible (some PBR channels
 * key their strength under a separate `factor` on top of `color`). Texture and `color` are
 * mutually exclusive per-channel in the Sketchfab API — a channel with a baked texture map
 * ignores `color` entirely, so any channel this touches has its `texture` deleted first
 * (this is why the carpet, which has no baked texture, recolored fine while the character's
 * textured skin/outfit materials didn't change at all). When `flat` is set, also pins
 * roughness to fully matte and metalness to fully non-metal, so the surface reads as a
 * plain flat color instead of picking up bright specular highlights from the scene lighting
 * — roughness at 0 (mirror-smooth) is what washes a flat color out toward white, not
 * roughness at 1 (fully rough/matte). Channels are left enabled (not disabled) since
 * disabling them made the shader fall back to a default appearance instead of respecting
 * these factors. */
function setMaterialColor(
  api: SketchfabApi,
  material: SketchfabMaterial,
  rgb: [number, number, number],
  flat = false,
): void {
  const albedo = material.channels.AlbedoPBR ?? material.channels.Albedo ?? material.channels.diffuse;
  if (albedo) {
    delete albedo.texture;
    albedo.enable = true;
    albedo.color = rgb;
    if (albedo.factor !== undefined) albedo.factor = 1;
  }
  if (flat) {
    const roughness = material.channels.RoughnessPBR;
    if (roughness) {
      delete roughness.texture;
      roughness.enable = true;
      if (roughness.factor !== undefined) roughness.factor = 1;
    }
    const metalness = material.channels.MetalnessPBR;
    if (metalness) {
      delete metalness.texture;
      metalness.enable = true;
      if (metalness.factor !== undefined) metalness.factor = 0;
    }
  }
  api.setMaterial(material);
}

/**
 * Recolors the whole model to two flat colors: the carpet/rug (found by {@link
 * CARPET_PATTERN}) and everything else (the character — skin, robe, headwear, etc.,
 * however many separate materials those are split into), which is flattened to a single
 * matte color with no roughness/metalness response. Goes through the Viewer API's material
 * list rather than a scene graph, since the model isn't loaded locally:
 * https://sketchfab.com/developers/viewer/api (getMaterialList/setMaterial).
 */
function applyModelColors(api: SketchfabApi, colors: { carpet?: string; character?: string }): void {
  api.getMaterialList((err, materials) => {
    if (err || !materials) return;
    // Left in deliberately: the only way to confirm/correct CARPET_PATTERN is to see
    // the model's actual material names, which aren't available outside a live viewer.
    console.debug('[PrayerModel3D] materials:', materials.map((m) => m.name));
    const carpetRgb = colors.carpet ? hexToRgb01(colors.carpet) : null;
    const characterRgb = colors.character ? hexToRgb01(colors.character) : null;
    materials.forEach((material) => {
      if (CARPET_PATTERN.test(material.name)) {
        if (carpetRgb) setMaterialColor(api, material, carpetRgb, false);
      } else if (characterRgb) {
        setMaterialColor(api, material, characterRgb, true);
      }
    });
  });
}

/**
 * Core stepper: plays forward or backward from wherever the animation currently sits
 * until it reaches `targetSeconds`, pauses there, then calls `onArrive` — instead of
 * jump-cutting with a bare seekTo(). `token` is compared against `tokenRef.current` before
 * every async continuation so a newer transition (a new token) silently cancels this one.
 */
function playToTime(
  api: SketchfabApi,
  targetSeconds: number,
  tokenRef: { current: number },
  token: number,
  onArrive?: () => void,
): void {
  api.getCurrentTime((err, current) => {
    if (err || token !== tokenRef.current) return;
    if (Math.abs(current - targetSeconds) < TIME_EPSILON) {
      api.pause();
      onArrive?.();
      return;
    }
    const forward = targetSeconds > current;
    api.setSpeed(forward ? 1 : -1);
    api.play();

    const poll = () => {
      if (token !== tokenRef.current) return;
      api.getCurrentTime((err2, t) => {
        if (err2 || token !== tokenRef.current) return;
        const reached = forward ? t >= targetSeconds : t <= targetSeconds;
        if (reached) {
          api.pause();
          api.setSpeed(1);
          api.seekTo(targetSeconds, () => {
            if (token === tokenRef.current) onArrive?.();
          });
        } else {
          setTimeout(poll, ANIMATION_POLL_MS);
        }
      });
    };
    setTimeout(poll, ANIMATION_POLL_MS);
  });
}

/** One-shot: plays to `targetSeconds` and holds there. `tokenRef` cancels any older
 * in-flight transition or loop (e.g. `loopToTime` below) still running for this model. */
function playUntil(api: SketchfabApi, targetSeconds: number, tokenRef: { current: number }): void {
  const token = ++tokenRef.current;
  playToTime(api, targetSeconds, tokenRef, token);
}

/**
 * Core looper: plays from `start` toward `end`, then snaps straight back to `start` in
 * a single seek and repeats. Deliberately just one seek per wrap — chaining a precise
 * arrival-snap onto `end` (as `playToTime` does) immediately followed by another seek
 * back to `start` visibly flashes through the clip's last frame on this model, so the
 * loop accepts a little overshoot past `end` (at most one poll tick) in exchange for
 * a single, direct jump back to `start` instead.
 */
function loopBetween(
  api: SketchfabApi,
  start: number,
  end: number,
  tokenRef: { current: number },
  token: number,
): void {
  const forward = end > start;
  const lap = () => {
    if (token !== tokenRef.current) return;
    api.setSpeed(forward ? 1 : -1);
    api.play();

    const poll = () => {
      if (token !== tokenRef.current) return;
      api.getCurrentTime((err, t) => {
        if (err || token !== tokenRef.current) return;
        const reached = forward ? t >= end : t <= end;
        if (reached) {
          api.seekTo(start, () => {
            if (token === tokenRef.current) lap();
          });
        } else {
          setTimeout(poll, ANIMATION_POLL_MS);
        }
      });
    };
    setTimeout(poll, ANIMATION_POLL_MS);
  };
  api.seekTo(start, () => {
    if (token === tokenRef.current) lap();
  });
}

/**
 * Loops a fixed window of the timeline (start → end → start …) regardless of where the
 * model currently sits — used while a movement is being demonstrated but the learner
 * hasn't actually performed it yet. Keeps looping until a newer token (a movement
 * change, or the same movement turning `confirmed`) cancels it.
 */
function loopRange(api: SketchfabApi, start: number, end: number, tokenRef: { current: number }): void {
  const token = ++tokenRef.current;
  loopBetween(api, start, end, tokenRef, token);
}

/**
 * Kicks off the right animation behavior for the current movement, looked up in
 * {@link MOVEMENT_TIMELINE} by prayer/rak'ah/movement name: while unconfirmed,
 * either loop its `start`-`end` segment on repeat (`loop: true`) or just play it
 * once and hold (`loop: false`); once confirmed, play through to `end` and stop
 * there regardless of the loop flag. A movement with no timing entry is left
 * alone — the model just holds wherever it already is.
 *
 * By convention, a movement's `end` is written to equal the *next* movement's
 * `start` (see movement-timeline-guide.md) — so "play to `end` once confirmed"
 * is exactly "continue to where the next movement begins", and that next
 * movement's own loop then starts from exactly where this one just stopped,
 * with no visible jump.
 */
/**
 * 0-based rak'ah index at which zuhr/asr/maghrib/isha rise out of the middle
 * tashahhud (rak'ah 2) into the next rak'ah's qiyam. Fajr never reaches this
 * index (it only has 2 rak'ahs), so checking the index alone is enough to
 * scope this to exactly those four prayers.
 */
const RISE_FROM_MIDDLE_TASHAHHUD_RAKA_INDEX = 2;

/**
 * Cuts straight to `targetSeconds` with a plain seek — no animated play through
 * the frames in between — then, if still unconfirmed, resumes the normal
 * start/end demo loop from there.
 */
function cutThenDrive(
  api: SketchfabApi,
  start: number,
  end: number,
  loop: boolean,
  confirmed: boolean,
  tokenRef: { current: number },
): void {
  const token = ++tokenRef.current;
  const target = confirmed || !loop ? end : start;
  api.pause();
  api.seekTo(target, () => {
    if (token !== tokenRef.current) return;
    if (!confirmed && loop) loopBetween(api, start, end, tokenRef, token);
  });
}

function driveAnimation(
  api: SketchfabApi,
  prayerId: PrayerId | null,
  movement: MovementName | null,
  rakaIndex: number | null,
  confirmed: boolean,
  tokenRef: { current: number },
): void {
  if (!prayerId || movement === null || rakaIndex === null) return;
  const timing = resolveMovementTiming(prayerId, rakaIndex + 1, movement);
  // TEMPORARY — remove once the raka-2 "keeps playing past sujood" report is
  // pinned down: logs every call so the console shows exactly what prayer/raka/
  // movement/confirmed combo was resolved (or failed to resolve) each time.
  console.log('[PrayerModel3D] driveAnimation', {
    prayerId, movement, rakaNumber: rakaIndex + 1, confirmed, timing,
  });
  if (!timing) return;

  // The middle tashahhud is held at a late timestamp, but rak'ah 3's qiyam
  // timing is still a placeholder that reuses rak'ah 1's early timestamps (see
  // the caveat atop movementTimeline.ts) — playing that transition normally
  // would scrub backward across the whole rak'ah. Cut straight there instead.
  if (movement === 'qiyam' && rakaIndex === RISE_FROM_MIDDLE_TASHAHHUD_RAKA_INDEX) {
    cutThenDrive(api, timing.start, timing.end, timing.loop, confirmed, tokenRef);
    return;
  }

  if (confirmed || !timing.loop) playUntil(api, timing.end, tokenRef);
  else loopRange(api, timing.start, timing.end, tokenRef);
}

/** A face-covering rectangle in the same terms the overlay's CSS wants: percentage of
 * the canvas width/height, `xPct`/`yPct` = center, `widthPct`/`heightPct` = size. */
interface FaceRect {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

/** How often (ms) to grab a fresh screenshot of the model and re-run pose detection.
 * Each tick is a real round trip (postMessage screenshot + a WASM inference call), so
 * this stays well below video frame rate; the CSS transition on the cover smooths the
 * gaps between updates into what still reads as continuous tracking. */
const FACE_TRACK_INTERVAL_MS = 30;

/** How much of the character's own on-screen bounding box (whichever is larger, width or
 * height — bowing/prostrating make the silhouette wide instead of tall) becomes the face
 * cover's diameter. The model's face is only ~1-2% of the frame on its own — too small
 * and orientation-dependent (BlazePose's facial landmarks collapse together in the fixed
 * side-profile view this camera uses) to size the cover from directly — so this instead
 * approximates a head-to-body ratio off the one measurement that stays reliable in any
 * pose: the character's own silhouette, found the same way as the detection crop below. */
const FACE_COVER_SIZE_FACTOR = 0.18;

/**
 * Grabs a screenshot of the current Sketchfab frame and decodes it into an `<img>`. The
 * screenshot comes back as a same-origin `data:` URL over postMessage — unlike a direct
 * `drawImage`/`getImageData` off the cross-origin iframe, decoding a `data:` URL isn't
 * CORS-tainted, which is what makes reading pixels out of this iframe possible at all.
 */
function captureScreenshot(api: SketchfabApi, width: number, height: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    api.getScreenShot(width, height, 'image/png', (err, dataUrl) => {
      if (err || !dataUrl) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  });
}

/** Pixel bounding box of the character (+ carpet, incidentally — it's a thin mat roughly
 * as wide as the character's stance, so this doesn't meaningfully widen the box) within a
 * screenshot, found via the alpha channel: the scene renders on a transparent background
 * (`transparent: 1` at init), so anything that isn't the character/carpet is fully
 * transparent. Returns null if nothing is found (e.g. a screenshot taken mid-transition). */
function findOpaqueBoundingBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return found ? { minX, minY, maxX, maxY } : null;
}

/** Crop region computed by {@link cropAndFlattenToWhite}, in the *source* screenshot's own
 * pixel coordinates — carried alongside the crop canvas so a landmark position detected
 * within it can be converted back to full-frame coordinates afterward. */
interface CropRegion {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Crops a screenshot to a bounding box plus margin, flattens it onto a white background,
 * and scales it up to a fixed square — the character reads as only a few percent of an
 * uncropped screenshot, which is too small for MediaPipe's pose detector to find at all
 * (it resizes whatever image it's given down to a small fixed resolution internally, so a
 * tiny subject disappears regardless of the screenshot's own resolution). Cropping tight
 * around the character first is what makes detection work; verified empirically — the
 * same detector finds nothing on an uncropped frame but detects the pose with >0.99
 * confidence once cropped this way. Flattening to white (rather than leaving the
 * transparent background as-is) matters too: the screenshot's RGB channels are zeroed out
 * wherever alpha is 0, so an unflattened crop would hand the detector a mostly-black image.
 */
function cropAndFlattenToWhite(
  img: HTMLImageElement,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  outSize: number,
): CropRegion {
  const marginX = (bbox.maxX - bbox.minX) * 0.6;
  const marginY = (bbox.maxY - bbox.minY) * 0.35;
  const x = Math.max(0, bbox.minX - marginX);
  const y = Math.max(0, bbox.minY - marginY);
  const w = Math.min(img.naturalWidth, bbox.maxX + marginX) - x;
  const h = Math.min(img.naturalHeight, bbox.maxY + marginY) - y;

  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outSize, outSize);
  ctx.drawImage(img, x, y, w, h, 0, 0, outSize, outSize);
  return { canvas, x, y, w, h };
}

/** A single BlazePose landmark, as returned by PoseLandmarker — only the fields used here. */
interface PoseLandmarkPoint {
  x: number;
  y: number;
}

/**
 * Turns a detected body's landmarks into a face-covering rect in full-frame percentage
 * terms. Centered on the nose (BlazePose index {@link MODEL_POSE_MEDIAPIPE_CONFIG.NOSE_INDEX});
 * sized off the character's overall silhouette (see {@link FACE_COVER_SIZE_FACTOR}) rather
 * than the spread between facial landmarks, since those collapse together in this camera's
 * fixed side-profile view and would badly underestimate head size.
 */
function faceRectFromPose(
  landmarks: PoseLandmarkPoint[],
  crop: CropRegion,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  frameWidth: number,
  frameHeight: number,
): FaceRect | null {
  const nose = landmarks[MODEL_POSE_MEDIAPIPE_CONFIG.NOSE_INDEX];
  if (!nose) return null;

  const noseFullPxX = crop.x + nose.x * crop.w;
  const noseFullPxY = crop.y + nose.y * crop.h;
  const bodyExtentPx = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
  const sizeFullPx = bodyExtentPx * FACE_COVER_SIZE_FACTOR;

  return {
    xPct: (noseFullPxX / frameWidth) * 100,
    yPct: (noseFullPxY / frameHeight) * 100,
    widthPct: (sizeFullPx / frameWidth) * 100,
    heightPct: (sizeFullPx / frameHeight) * 100,
  };
}

interface Props {
  /** Which prayer is being performed — selects the right table in {@link MOVEMENT_TIMELINE}. */
  prayerId: PrayerId | null;
  /** Which movement the guide is currently demonstrating. See constants/movement-timeline-guide.md. */
  movement: MovementName | null;
  /**
   * 1-based rak'ah number the movement belongs to — together with `prayerId` and
   * `movement`, keys the lookup in {@link MOVEMENT_TIMELINE}.
   */
  rakaIndex: number | null;
  /**
   * Whether the learner has actually performed `movement` yet. While false, the
   * movement's timed segment loops on repeat (if its `loop` flag is set) or plays
   * once; once true, it plays through once more and holds — see `driveAnimation`.
   */
  poseConfirmed: boolean;
  /**
   * Whether the 5-second countdown has finished and pose detection is live. The demo
   * animation only starts once this flips true, so the model doesn't move ahead of the
   * actual session start.
   */
  active: boolean;
}

/**
 * 3D teacher-demo panel: embeds the "Muslim Prayer / Islam Salah" model from Sketchfab via
 * their official Viewer API (https://sketchfab.com/developers/viewer). All UI chrome is
 * disabled via the documented `ui_*` init flags, the canvas is transparent, and pointer
 * events are disabled on the iframe (see PrayerModel3D.module.css) so the learner can't
 * orbit/click/scrub it themselves.
 *
 * The model's own baked animation is driven to the timestamp matching the learner's current
 * movement (POSE_TIMESTAMPS) by playing forward/backward from wherever it already is and
 * pausing on arrival (see `playUntil`), instead of auto-playing on its own timeline or
 * jump-cutting with a bare `seekTo()`.
 *
 * Note: hiding the Sketchfab watermark/link (`ui_watermark`, `ui_watermark_link`) is
 * restricted to paid Sketchfab plans per their docs — setting them to 0 here has no effect
 * on the free tier this UID is served under, so it's masked with an opaque overlay instead
 * (`.watermarkMask` in PrayerModel3D.module.css).
 */
export function PrayerModel3D({ prayerId, movement, rakaIndex, poseConfirmed, active }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<SketchfabApi | null>(null);
  const prayerIdRef = useRef(prayerId);
  prayerIdRef.current = prayerId;
  const movementRef = useRef(movement);
  movementRef.current = movement;
  const rakaIndexRef = useRef(rakaIndex);
  rakaIndexRef.current = rakaIndex;
  const poseConfirmedRef = useRef(poseConfirmed);
  poseConfirmedRef.current = poseConfirmed;
  const activeRef = useRef(active);
  activeRef.current = active;
  const animTokenRef = useRef(0);

  // The rug's color follows the app's active theme rather than a fixed baked-in shade —
  // see applyModelColors. Uses --accent-dark (not --accent) since --accent itself is a
  // fairly pale/pastel swatch in most themes and reads as washed-out on the rug; the
  // "-dark" step of the theme's own color ramp gives a richer, more saturated fill.
  const { theme } = useTheme();
  const accentHex = THEME_CONFIGS[theme].vars['--accent-dark'];
  const accentHexRef = useRef(accentHex);
  accentHexRef.current = accentHex;

  const poseLandmarkerRef = useRef<Awaited<ReturnType<typeof createModelPoseLandmarker>> | null>(null);
  const [faceCoverRect, setFaceCoverRect] = useState<FaceRect | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadSketchfabScript().then(() => {
      if (cancelled || !iframeRef.current || !window.Sketchfab) return;
      const client = new window.Sketchfab(iframeRef.current);
      client.init(MODEL_UID, {
        autostart: 1,
        transparent: 1,
        ui_infos: 0,
        ui_controls: 0,
        ui_stop: 0,
        ui_animations: 0,
        ui_annotations: 0,
        ui_help: 0,
        ui_settings: 0,
        ui_vr: 0,
        ui_ar: 0,
        ui_fullscreen: 0,
        ui_hint: 0,
        ui_watermark: 0,
        ui_watermark_link: 0,
        success: (api) => {
          api.start();
          api.addEventListener('viewerready', () => {
            if (cancelled) return;
            apiRef.current = api;
            api.pause();
            applyZoomOut(api);
            disableShadow(api);
            hideFacialFeatures(api);
            applyModelColors(api, { carpet: accentHexRef.current });
            // Rest on a clean, deterministic frame while waiting out the countdown —
            // `autostart` may have already played it a little forward by the time this fires.
            api.seekTo(0, () => {
              if (cancelled || !activeRef.current) return;
              driveAnimation(
                api, prayerIdRef.current, movementRef.current, rakaIndexRef.current, poseConfirmedRef.current, animTokenRef,
              );
            });
          });
        },
        error: () => {
          console.error('Sketchfab viewer failed to load model', MODEL_UID);
        },
      });
    });

    return () => {
      cancelled = true;
      animTokenRef.current += 1;
    };
  }, []);

  // Drive the animation to the timestamp matching the learner's current movement, rather
  // than jump-cutting there: loop the segment leading up to it while still unconfirmed
  // (the guide is demonstrating it but the learner hasn't performed it yet), or play
  // through once and hold once the learner actually has.
  useEffect(() => {
    if (!apiRef.current || !active) return;
    driveAnimation(apiRef.current, prayerId, movement, rakaIndex, poseConfirmed, animTokenRef);
  }, [prayerId, movement, rakaIndex, poseConfirmed, active]);

  // Re-tint the rug and shirt immediately if the user switches themes mid-session.
  useEffect(() => {
    if (!apiRef.current) return;
    applyModelColors(apiRef.current, { carpet: accentHex });
  }, [accentHex]);

  // Loads the model's own pose landmarker once, then polls screenshots of the live
  // Sketchfab frame to keep the face cover tracking the character's actual on-screen
  // face for as long as the session is active — see captureScreenshot/
  // findOpaqueBoundingBox/cropAndFlattenToWhite/faceRectFromPose above for how a
  // screenshot becomes a tracked rect. A detection that fails on a given tick (e.g. a
  // screenshot caught mid-transition) just leaves the cover wherever it last was, rather
  // than hiding it — the next tick, 250ms later, corrects it.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    createModelPoseLandmarker()
      .then((landmarker) => {
        if (!cancelled) poseLandmarkerRef.current = landmarker;
      })
      .catch((err) => console.error('Model pose landmarker failed to load', err));

    const tick = async () => {
      if (cancelled) return;
      const api = apiRef.current;
      const landmarker = poseLandmarkerRef.current;
      const iframe = iframeRef.current;

      if (activeRef.current && api && landmarker && iframe) {
        const bounds = iframe.getBoundingClientRect();
        const frameWidth = Math.max(160, Math.round(bounds.width));
        const frameHeight = Math.max(120, Math.round(bounds.height));
        const img = await captureScreenshot(api, frameWidth, frameHeight);

        if (!cancelled && img) {
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = frameWidth;
          fullCanvas.height = frameHeight;
          const fullCtx = fullCanvas.getContext('2d') as CanvasRenderingContext2D;
          fullCtx.drawImage(img, 0, 0, frameWidth, frameHeight);
          const bbox = findOpaqueBoundingBox(fullCtx, frameWidth, frameHeight);

          if (bbox) {
            const crop = cropAndFlattenToWhite(img, bbox, 384);
            const result = landmarker.detect(crop.canvas);
            const landmarks = result?.landmarks?.[0] as PoseLandmarkPoint[] | undefined;
            const rect = landmarks
              ? faceRectFromPose(landmarks, crop, bbox, frameWidth, frameHeight)
              : null;
            if (rect) setFaceCoverRect(rect);
          }
        }
      }

      if (!cancelled) timeoutId = window.setTimeout(tick, FACE_TRACK_INTERVAL_MS);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className={css.canvasWrap}>
      <iframe
        ref={iframeRef}
        className={css.viewerFrame}
        title="Muslim Prayer 3D Model"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
      />
      {/* Covers the character's face — position/size come from a live pose-landmarker
          tracking the model's own screenshots (see the face-tracking effect above),
          centered on the detected nose and sized off the character's own silhouette.
          Eases to a new spot via the CSS transition on .faceCover rather than jumping. */}
      {faceCoverRect && (
        <div
          className={css.faceCover}
          style={{
            left: `${faceCoverRect.xPct}%`,
            top: `${faceCoverRect.yPct}%`,
            width: `${faceCoverRect.widthPct}%`,
            height: `${faceCoverRect.heightPct}%`,
          }}
          aria-hidden="true"
        />
      )}
      {/* Sketchfab's own watermark badge can't be disabled via ui_watermark on the free
          tier (see class docstring above), so it's masked with a matching-background
          patch instead of being left visible. */}
      <div className={css.watermarkMask} aria-hidden="true" />
    </div>
  );
}
