import { LANDMARKS, CONFIG } from '../constants/prayerConfig';
import type { PoseType } from '../types/prayer.types';

interface Lm {
  x: number;
  y: number;
  z: number;
  v: number;
}

interface Extracted {
  nose: Lm;
  lShoulder: Lm;
  rShoulder: Lm;
  lElbow: Lm;
  rElbow: Lm;
  lWrist: Lm;
  rWrist: Lm;
  lHip: Lm;
  rHip: Lm;
  lKnee: Lm;
  rKnee: Lm;
  lAnkle: Lm;
  rAnkle: Lm;
  lEar: Lm;
  rEar: Lm;
}

export function classifyPose(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
): PoseType {
  if (!landmarks || landmarks.length < 29) return 'unknown';
  const lm = extract(landmarks);
  return detect(lm);
}

function extract(
  raw: Array<{ x: number; y: number; z?: number; visibility?: number }>,
): Extracted {
  const get = (i: number): Lm => ({
    x: raw[i].x,
    y: raw[i].y,
    z: raw[i].z ?? 0,
    v: raw[i].visibility ?? 0,
  });
  return {
    nose: get(LANDMARKS.NOSE),
    lShoulder: get(LANDMARKS.L_SHOULDER),
    rShoulder: get(LANDMARKS.R_SHOULDER),
    lElbow: get(LANDMARKS.L_ELBOW),
    rElbow: get(LANDMARKS.R_ELBOW),
    lWrist: get(LANDMARKS.L_WRIST),
    rWrist: get(LANDMARKS.R_WRIST),
    lHip: get(LANDMARKS.L_HIP),
    rHip: get(LANDMARKS.R_HIP),
    lKnee: get(LANDMARKS.L_KNEE),
    rKnee: get(LANDMARKS.R_KNEE),
    lAnkle: get(LANDMARKS.L_ANKLE),
    rAnkle: get(LANDMARKS.R_ANKLE),
    lEar: get(LANDMARKS.L_EAR),
    rEar: get(LANDMARKS.R_EAR),
  };
}

function detect(lm: Extracted): PoseType {
  const vis = (pts: Lm[]) => pts.every((p) => p.v > CONFIG.MIN_VISIBILITY);
  const g = geometry(lm, vis);

  if (g.isSujood) return 'sujood';
  // Tasleem: a clear head turn while seated. Checked before juloos (also seated)
  // but only fires past the yaw threshold, so a forward-facing tashahhud/juloos
  // still reads as 'juloos'.
  if (g.salamRight) return 'salam_right';
  if (g.salamLeft) return 'salam_left';
  if (g.sittingOnGround) return 'juloos';
  if ((g.isBowed || g.wristOnKnee) && !g.isUpright) return 'ruku';
  if (g.isUpright && g.wristsNearEars) return 'takbeer';
  if (g.isUpright) return 'qiyam';
  return 'unknown';
}

function geometry(lm: Extracted, vis: (pts: Lm[]) => boolean) {
  const shoulderMidY = (lm.lShoulder.y + lm.rShoulder.y) / 2;
  const hipMidY = (lm.lHip.y + lm.rHip.y) / 2;
  const kneeMidY = (lm.lKnee.y + lm.rKnee.y) / 2;
  const wristMidY = (lm.lWrist.y + lm.rWrist.y) / 2;
  const earMidY = (lm.lEar.y + lm.rEar.y) / 2;

  const shoulderWidth = Math.abs(lm.lShoulder.x - lm.rShoulder.x);
  const scale = shoulderWidth > 0.01 ? shoulderWidth : 0.15;

  const torsoH = hipMidY - shoulderMidY;
  const isUpright = torsoH > 0.18;
  const isBowed = torsoH < 0.05 && torsoH > -0.25;

  const armsRaised =
    vis([lm.lWrist, lm.rWrist, lm.lShoulder, lm.rShoulder]) &&
    wristMidY < shoulderMidY - scale * 0.5;

  const wristsNearEars =
    armsRaised &&
    Math.abs(wristMidY - earMidY) < scale * 1.0 &&
    Math.abs(lm.lWrist.x - lm.lEar.x) < scale * 1.2 &&
    Math.abs(lm.rWrist.x - lm.rEar.x) < scale * 1.2;

  const wristOnKnee =
    vis([lm.lWrist, lm.rWrist, lm.lKnee, lm.rKnee]) &&
    Math.abs(lm.lWrist.y - lm.lKnee.y) / scale < 0.6 &&
    Math.abs(lm.rWrist.y - lm.rKnee.y) / scale < 0.6;

  const sittingOnGround =
    vis([lm.lHip, lm.rHip, lm.lKnee, lm.rKnee]) &&
    Math.abs(hipMidY - kneeMidY) / scale < 1.0 &&
    hipMidY > 0.5;

  const isSujood =
    vis([lm.nose, lm.lHip, lm.rHip]) &&
    lm.nose.y > hipMidY - scale * 0.3 &&
    lm.nose.y > 0.55;

  // Head yaw for the tasleem, measured with anatomical landmarks so it's
  // independent of how the video is mirrored on screen: where the nose sits
  // between the two shoulders. 0.5 = facing forward; < 0.5 = turned toward the
  // learner's own right; > 0.5 = toward their left.
  // NOTE: if right/left come out reversed on a real camera, flip TURN_SIGN.
  const TURN_SIGN = 1;
  const TURN_THRESHOLD = 0.15;
  const shoulderSpanX = lm.lShoulder.x - lm.rShoulder.x;
  const headYaw =
    vis([lm.nose, lm.lShoulder, lm.rShoulder]) && Math.abs(shoulderSpanX) > 0.02
      ? (lm.nose.x - lm.rShoulder.x) / shoulderSpanX
      : 0.5;
  const yawOffset = TURN_SIGN * (headYaw - 0.5);
  const salamRight = sittingOnGround && yawOffset < -TURN_THRESHOLD;
  const salamLeft = sittingOnGround && yawOffset > TURN_THRESHOLD;

  return {
    isUpright, isBowed, armsRaised, wristsNearEars, wristOnKnee,
    sittingOnGround, isSujood, salamRight, salamLeft,
  };
}
