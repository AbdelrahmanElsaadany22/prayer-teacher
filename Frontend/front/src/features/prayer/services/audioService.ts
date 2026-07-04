import type { Lang } from '../../../shared/i18n/translations';
import takbeerAudioUrl from '../../../assets/alluah-akbar.mp3';
import samiAllahAudioUrl from '../../../assets/sm3-alluh.mp3';
import rukuDhikrUrl from '../../../assets/sobhan-elazim.mp3';
import sujoodDhikrUrl from '../../../assets/sobhan-el23la.mp3';
import juloosDhikrUrl from '../../../assets/rb-eغfrly.mp3';
import tashahhudAwsatUrl from '../../../assets/eltshahd-2l2wst.mp3';
import tashahhudAkheerUrl from '../../../assets/eltshadhd-el2kher.mp3';
import tasleemUrl from '../../../assets/taslem.mp3';
import nextMovePrefixArUrl from '../../../assets/2lhrka-2lkadima.mp3';

/** Dhikr clips recited while holding a posture. */
export type DhikrKey =
  | 'ruku'
  | 'sujood'
  | 'juloos'
  | 'tashahhud_awsat'
  | 'tashahhud_akheer'
  | 'tasleem';

/** The sound made while moving INTO a posture: the takbir, or "Sami' Allah". */
export type Transition = 'takbir' | 'sami';

/**
 * The audio for one posture that was just reached, in play order:
 *   the transition made to get here → its dhikr (or the qiyam recitation) →
 *   the spoken "next movement is …" guidance.
 *
 * The guidance names the next posture only; that posture's *own* transition
 * sound plays when the learner actually reaches it, never ahead of time.
 */
export interface CueFlow {
  lang: Lang;
  /** The takbir / "Sami' Allah" said while moving into the pose just reached. */
  transition?: Transition | null;
  /** Dhikr of the posture just reached. */
  dhikr?: DhikrKey[];
  /** Qur'an recitation played as this qiyam's content. */
  recite?: { rakaIndex: number; reciterServer: string | null } | null;
  /** Name of the next movement to announce (guidance only — no transition sound). */
  announceNext?: string | null;
  /** Called once the whole sequence finishes on its own (not when superseded). */
  onDone?: () => void;
}

/** A queued cue is a clip to play (recitation flagged) or a silent gap. */
type CueSegment = { url: string; recitation?: boolean } | { pauseMs: number };

class AudioManager {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();

  /**
   * Surah played during the previous rak'ah's qiyam, so the second rak'ah never
   * repeats the same short surah. Reset per prayer via {@link resetRecitation}.
   */
  private lastSurah: number | null = null;

  /**
   * Bumped every time a new sequence starts (or the cues are stopped). The
   * running sequence checks it between steps and bails the moment it's
   * superseded, so a new flow always cancels whatever was still playing/queued.
   */
  private queueRunId = 0;

  /** True only while a qiyam recitation clip is actually sounding. */
  private reciting = false;

  /**
   * Recitation is streamed through our own backend proxy (`/recitation/:surah`)
   * so playback never depends on the upstream reciter server's CORS policy.
   * Al-Fatiha is recited in every rak'ah's qiyam.
   */
  private readonly RECITER_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/recitation`;
  private readonly FATIHA = 1;
  private readonly SURAH_MIN = 86; // first short surah eligible for rak'ahs 1–2
  private readonly SURAH_MAX = 114; // last surah (An-Nas)

  /** Playback speed for voice cues (1 = natural; the clips are already male). */
  private readonly CUE_RATE = 1.0;

  /** Silence inserted between the spoken parts so they never run into each other. */
  private readonly GAP_MS = 2000;

  /**
   * The takbir ("Allahu akbar") that accompanies every change of posture, and
   * the "Sami' Allahu liman hamidah" said when rising from ruku' (iqama/i'tidal).
   */
  private readonly TAKBEER_URL = takbeerAudioUrl;
  private readonly SAMI_ALLAH_URL = samiAllahAudioUrl;

  /** Dhikr recited while holding each posture (keyed by {@link DhikrKey}). */
  private readonly DHIKR: Record<DhikrKey, string> = {
    ruku: rukuDhikrUrl,
    sujood: sujoodDhikrUrl,
    juloos: juloosDhikrUrl,
    tashahhud_awsat: tashahhudAwsatUrl,
    tashahhud_akheer: tashahhudAkheerUrl,
    tasleem: tasleemUrl,
  };

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playBeep(
    frequency = 440,
    type: OscillatorType = 'sine',
    duration = 0.25,
    volume = 0.4,
  ): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playMistakeBeep(): void {
    this.playBeep(220, 'sawtooth', 0.4, 0.5);
  }

  playSuccessBeep(): void {
    this.playBeep(660, 'sine', 0.15, 0.3);
    setTimeout(() => this.playBeep(880, 'sine', 0.15, 0.2), 150);
  }

  /**
   * Voices one posture that was just reached, as a single gap-separated sequence
   * on one channel so nothing overlaps: the transition made to reach it → its
   * dhikr or recitation → the spoken name of the next movement. The next
   * movement's own transition sound is deliberately left out here — it plays
   * only when that posture is actually reached. Starting a new flow cancels
   * whatever was still playing.
   */
  playFlow(flow: CueFlow): void {
    void this.runQueue(this.buildFlow(flow), flow.onDone);
  }

  /** Whether the qiyam recitation is currently sounding (used to reject an early ruku'). */
  isReciting(): boolean {
    return this.reciting;
  }

  /** Stops any cue or recitation currently playing or still queued. */
  stopCues(): void {
    this.queueRunId++;
    this.reciting = false;
    this.stopCurrent();
  }

  /** Clears surah history and silences audio between prayers. */
  resetRecitation(): void {
    this.lastSurah = null;
    this.stopCues();
  }

  // ─── Sequence building ──────────────────────────────────────────────────────

  /**
   * Turns a flow into a flat list of clips separated by {@link GAP_MS} pauses.
   * Clips inside a group (e.g. Fatiha + surah) play back-to-back; the gap only
   * sits between groups so the recitation itself isn't chopped up.
   */
  private buildFlow(flow: CueFlow): CueSegment[] {
    const groups: { urls: string[]; recitation?: boolean }[] = [];

    // 1) the movement made to reach this posture
    if (flow.transition) {
      const url = flow.transition === 'sami' ? this.SAMI_ALLAH_URL : this.TAKBEER_URL;
      groups.push({ urls: [url] });
    }
    // 2) what's said/recited while holding it
    for (const key of flow.dhikr ?? []) groups.push({ urls: [this.DHIKR[key]] });
    if (flow.recite) {
      groups.push({
        urls: this.recitationUrls(flow.recite.rakaIndex, flow.recite.reciterServer),
        recitation: true,
      });
    }
    // 3) spoken guidance for the next movement (name only, no transition sound)
    if (flow.announceNext) {
      const prefixUrl = flow.lang === 'ar' ? nextMovePrefixArUrl : '/audio/prefix.mp3';
      groups.push({ urls: [prefixUrl] });
      groups.push({ urls: [`/audio/${flow.announceNext}.mp3`] });
    }

    const segments: CueSegment[] = [];
    for (const group of groups) {
      if (group.urls.length === 0) continue;
      if (segments.length > 0) segments.push({ pauseMs: this.GAP_MS });
      for (const url of group.urls) segments.push({ url, recitation: group.recitation });
    }
    return segments;
  }

  /**
   * Al-Fatiha (every rak'ah) plus, for the first two rak'ahs, a random short
   * surah (86–114) that never repeats the one the previous rak'ah used.
   */
  private recitationUrls(rakaIndex: number, reciterServer: string | null): string[] {
    const urls = [this.surahUrl(this.FATIHA, reciterServer)];
    if (rakaIndex < 2) {
      const span = this.SURAH_MAX - this.SURAH_MIN + 1;
      let surah: number;
      do {
        surah = this.SURAH_MIN + Math.floor(Math.random() * span);
      } while (surah === this.lastSurah);
      this.lastSurah = surah;
      urls.push(this.surahUrl(surah, reciterServer));
    }
    return urls;
  }

  // ─── Playback engine ────────────────────────────────────────────────────────

  /** Plays segments strictly one-after-another; bails if a newer flow starts. */
  private async runQueue(segments: CueSegment[], onDone?: () => void): Promise<void> {
    this.stopCurrent();
    const runId = ++this.queueRunId;
    this.reciting = false;
    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      for (const seg of segments) {
        if (runId !== this.queueRunId) return; // superseded by a newer flow
        if ('pauseMs' in seg) {
          await this.delay(seg.pauseMs);
          continue;
        }
        // A missing clip (e.g. recitation server down) is skipped, not fatal.
        const buffer = await this.loadBuffer(seg.url).catch(() => null);
        if (runId !== this.queueRunId) return;
        if (buffer) {
          // Flag while the recitation actually sounds; the run-id guard stops a
          // superseded flow from clearing a newer one's flag.
          if (seg.recitation) this.reciting = true;
          await this.playBuffer(buffer);
          if (runId === this.queueRunId) this.reciting = false;
        }
      }
    } catch {
      /* ignore playback failures */
    }
    // Reached the end on our own (not superseded): clear the flag and signal done.
    if (runId === this.queueRunId) {
      this.reciting = false;
      onDone?.();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Fetches + decodes an MP3 into an AudioBuffer (cached after first load). */
  private async loadBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`audio ${url} not found`);
    const data = await res.arrayBuffer();
    const buffer = await this.getCtx().decodeAudioData(data);
    this.bufferCache.set(url, buffer);
    return buffer;
  }

  /** Plays a decoded buffer through Web Audio; resolves when it ends. */
  private playBuffer(buffer: AudioBuffer): Promise<void> {
    const ctx = this.getCtx();
    return new Promise((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = this.CUE_RATE;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      this.currentSource = src;
      src.start();
    });
  }

  private stopCurrent(): void {
    if (this.currentSource) {
      try {
        // Leave onended attached so the awaiting sequence resolves and bails on
        // its stale run id, instead of hanging on a promise that never settles.
        this.currentSource.stop();
      } catch {
        /* already stopped */
      }
      this.currentSource = null;
    }
  }

  /** The URL differs per reciter, so switching reciters never serves a cached buffer from another one. */
  private surahUrl(n: number, reciterServer: string | null): string {
    const base = `${this.RECITER_BASE}/${n}`;
    return reciterServer ? `${base}?server=${encodeURIComponent(reciterServer)}` : base;
  }
}

export const audioService = new AudioManager();
