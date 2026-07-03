import type { Lang } from '../../../shared/i18n/translations';
import takbeerAudioUrl from '../../../assets/alluah-akbar.mp3';
import samiAllahAudioUrl from '../../../assets/sm3-alluh.mp3';
import rukuDhikrUrl from '../../../assets/sobhan-elazim.mp3';
import sujoodDhikrUrl from '../../../assets/sobhan-el23la.mp3';
import juloosDhikrUrl from '../../../assets/rb-eغfrly.mp3';
import tashahhudAwsatUrl from '../../../assets/eltshahd-2l2wst.mp3';
import tashahhudAkheerUrl from '../../../assets/eltshadhd-el2kher.mp3';
import tasleemUrl from '../../../assets/taslem.mp3';

/** Dhikr clips recited while holding a posture. */
export type DhikrKey =
  | 'ruku'
  | 'sujood'
  | 'juloos'
  | 'tashahhud_awsat'
  | 'tashahhud_akheer'
  | 'tasleem';

/** What to voice for the movement that follows the one just completed. */
export type NextMove =
  | { kind: 'announce'; pose: string }
  | { kind: 'recite'; rakaIndex: number; thenPose: string | null; reciterServer: string | null };

/** One completed movement's audio: what was just done, then what comes next. */
export interface CueFlow {
  lang: Lang;
  /** True for takbeerat al-ihram — plays the opening takbir. */
  opening?: boolean;
  /** Dhikr of the posture that was just reached. */
  dhikr?: DhikrKey[];
  /** Guidance for the movement now due. */
  next?: NextMove;
}

/** A queued cue is either a clip to play or a silent gap. */
type CueSegment = { url: string } | { pauseMs: number };

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
   * Voices one completed movement then the guidance for the next, as a single
   * gap-separated sequence on one channel — so the dhikr, the "next movement is"
   * lead-in, the movement name and the takbir never overlap. Starting a new
   * flow cancels whatever was still playing.
   *
   * Order: [opening takbir | dhikr just performed] → "next movement is" → name
   * → the takbir (or "Sami' Allah" when rising from ruku'). When the next move
   * is qiyam the recitation is played instead of a name, and the movement after
   * it (ruku') is announced once the recitation ends.
   */
  playFlow(flow: CueFlow): void {
    void this.runQueue(this.buildFlow(flow));
  }

  /** Stops any cue or recitation currently playing or still queued. */
  stopCues(): void {
    this.queueRunId++;
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
    const groups: string[][] = [];

    if (flow.opening) groups.push([this.TAKBEER_URL]);
    for (const key of flow.dhikr ?? []) groups.push([this.DHIKR[key]]);

    if (flow.next?.kind === 'announce') {
      groups.push(...this.announceGroups(flow.next.pose, flow.lang));
    } else if (flow.next?.kind === 'recite') {
      groups.push(this.recitationUrls(flow.next.rakaIndex, flow.next.reciterServer));
      if (flow.next.thenPose) {
        groups.push(...this.announceGroups(flow.next.thenPose, flow.lang));
      }
    }

    const segments: CueSegment[] = [];
    for (const group of groups) {
      if (group.length === 0) continue;
      if (segments.length > 0) segments.push({ pauseMs: this.GAP_MS });
      for (const url of group) segments.push({ url });
    }
    return segments;
  }

  /** The "next movement is" lead-in, the movement name, then its takbir/sami. */
  private announceGroups(pose: string, lang: Lang): string[][] {
    const prefixUrl = lang === 'ar' ? '/audio/prefix_ar.mp3' : '/audio/prefix.mp3';
    const transitionUrl = pose === 'iqama' ? this.SAMI_ALLAH_URL : this.TAKBEER_URL;
    return [[prefixUrl], [`/audio/${pose}.mp3`], [transitionUrl]];
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
  private async runQueue(segments: CueSegment[]): Promise<void> {
    this.stopCurrent();
    const runId = ++this.queueRunId;
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
        if (buffer) await this.playBuffer(buffer);
      }
    } catch {
      /* ignore playback failures */
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
