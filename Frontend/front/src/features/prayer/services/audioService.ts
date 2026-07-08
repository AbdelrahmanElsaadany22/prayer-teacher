import type { Lang } from '../../../shared/i18n/translations';
import takbeerAudioUrl from '../../../assets/alluah-akbar.mp3';
import samiAllahAudioUrl from '../../../assets/sm3-alluh.mp3';
import rukuDhikrUrl from '../../../assets/sobhan-elazim.mp3';
import sujoodDhikrUrl from '../../../assets/sobhan-el23la.mp3';
import juloosDhikrUrl from '../../../assets/rb-eغfrly.mp3';
import tashahhudAwsatUrl from '../../../assets/eltshahd-2l2wst.mp3';
import tashahhudAkheerUrl from '../../../assets/eltshadhd-el2kher.mp3';
import tasleemUrl from '../../../assets/taslem.mp3';
// Arabic "الحركة القادمة حركة …" announcements — one recorded clip per movement.
import announceQiyamUrl from '../../../assets/hrkt-2lkyam-ar.mp3';
import announceRukuUrl from '../../../assets/hrktelrkou3-ar.mp3';
import announceIqamaUrl from '../../../assets/hrkt-2l23tdal.mp3';
import announceSujoodUrl from '../../../assets/hrkt-2lsjoud.mp3';
import announceJuloosUrl from '../../../assets/hrkt-glous-sagditen.mp3';
import announceTashahhudAwsatUrl from '../../../assets/hrkt-2ltsh-2lawast.mp3';
import announceTashahhudAkheerUrl from '../../../assets/hrkt-2ltsh-2lakheer.mp3';
import announceTasleemUrl from '../../../assets/2ltasleem.mp3';
// English "the next movement is …" announcements — one recorded clip per movement.
import enQiyamUrl from '../../../assets/en-moves-voice/en-qiam.mp3';
import enRukuUrl from '../../../assets/en-moves-voice/en-rokou3.mp3';
import enIqamaUrl from '../../../assets/en-moves-voice/en-e3tidal.mp3';
import enSujoodUrl from '../../../assets/en-moves-voice/en-sojoud.mp3';
import enJuloosUrl from '../../../assets/en-moves-voice/en-glous-between-soujouds.mp3';
import enTashahhudAwsatUrl from '../../../assets/en-moves-voice/en-2ltashhoud-awst.mp3';
import enTashahhudAkheerUrl from '../../../assets/en-moves-voice/en-2ltashhoud-2l2kheer.mp3';
import enTasleemUrl from '../../../assets/en-moves-voice/en-tasleem.mp3';

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
  /**
   * Fired the instant the "next movement is …" clip starts sounding — used to
   * flip the on-screen guide GIF to the announced movement exactly on the word,
   * never before. Only fires when {@link announceNext} actually produced a clip.
   */
  onAnnounce?: () => void;
}

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

  /** True while the current posture's content (its dhikr or recitation) is sounding. */
  private holding = false;

  /** Which surah each recitation clip URL belongs to, so playback can be timed. */
  private reciteSurahByUrl = new Map<string, number>();

  /**
   * The recitation clip playing right now: its surah and the AudioContext time it
   * started at. Lets the UI look up, frame by frame, which ayah is being recited
   * (start_time ≤ elapsed < end_time in that surah's ayah timing). Null whenever
   * no recitation is sounding.
   */
  private reciteClock: { surah: number; startedAt: number } | null = null;

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

  /**
   * Arabic movement announcements: one recorded clip per movement that already
   * says the full "الحركة القادمة حركة <name>". Keyed by the {@link CueFlow.announceNext}
   * value (tashahhud is split into the middle/last variants, tasleem included).
   */
  private readonly AR_ANNOUNCE: Record<string, string> = {
    qiyam: announceQiyamUrl,
    ruku: announceRukuUrl,
    iqama: announceIqamaUrl,
    sujood: announceSujoodUrl,
    juloos: announceJuloosUrl,
    tashahhud_awsat: announceTashahhudAwsatUrl,
    tashahhud_akheer: announceTashahhudAkheerUrl,
    tasleem: announceTasleemUrl,
  };

  /** English equivalent: one recorded "the next movement is <name>" clip each. */
  private readonly EN_ANNOUNCE: Record<string, string> = {
    qiyam: enQiyamUrl,
    ruku: enRukuUrl,
    iqama: enIqamaUrl,
    sujood: enSujoodUrl,
    juloos: enJuloosUrl,
    tashahhud_awsat: enTashahhudAwsatUrl,
    tashahhud_akheer: enTashahhudAkheerUrl,
    tasleem: enTasleemUrl,
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
    const { groups, announceIndex } = this.buildFlow(flow);
    void this.runQueue(groups, flow.onDone, announceIndex, flow.onAnnounce);
  }

  /**
   * Whether the current posture's content (its dhikr or the qiyam recitation) is
   * still playing — used to reject moving on to the next posture too early.
   */
  isHolding(): boolean {
    return this.holding;
  }

  /**
   * The ayah currently being recited, expressed as {surah, elapsedMs} against
   * that surah's audio, or null when no recitation is sounding. Callers match
   * elapsedMs to the surah's ayah timing to find the exact ayah on screen.
   */
  getReciteClock(): { surah: number; elapsedMs: number } | null {
    if (!this.reciteClock) return null;
    return {
      surah: this.reciteClock.surah,
      elapsedMs: (this.getCtx().currentTime - this.reciteClock.startedAt) * 1000,
    };
  }

  /** Stops any cue or recitation currently playing or still queued. */
  stopCues(): void {
    this.queueRunId++;
    this.holding = false;
    this.reciteClock = null;
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
  private buildFlow(flow: CueFlow): { groups: string[][]; announceIndex: number } {
    const groups: string[][] = [];
    let hasAnnounce = false;

    // Each flow rebuilds the surah map so a clip is only ever timed to its own flow.
    this.reciteSurahByUrl.clear();

    // 1) the movement made to reach this posture
    if (flow.transition) {
      groups.push([flow.transition === 'sami' ? this.SAMI_ALLAH_URL : this.TAKBEER_URL]);
    }
    // 2) what's said/recited while holding it
    for (const key of flow.dhikr ?? []) groups.push([this.DHIKR[key]]);
    if (flow.recite) {
      const clips = this.recitationClips(flow.recite.rakaIndex, flow.recite.reciterServer);
      for (const c of clips) this.reciteSurahByUrl.set(c.url, c.surah);
      groups.push(clips.map((c) => c.url));
    }
    // 3) spoken guidance for the next movement — one recorded clip per movement
    // that already says the whole "next movement is <name>", per language.
    if (flow.announceNext) {
      const map = flow.lang === 'ar' ? this.AR_ANNOUNCE : this.EN_ANNOUNCE;
      const url = map[flow.announceNext];
      if (url) {
        groups.push([url]);
        hasAnnounce = true;
      }
    }

    // The announcement, when present, is always the last group; capture its index
    // after dropping any empties so onAnnounce can be fired exactly as it starts.
    const filtered = groups.filter((g) => g.length > 0);
    return { groups: filtered, announceIndex: hasAnnounce ? filtered.length - 1 : -1 };
  }

  /**
   * Al-Fatiha (every rak'ah) plus, for the first two rak'ahs, a random short
   * surah (86–114) that never repeats the one the previous rak'ah used.
   */
  private recitationClips(
    rakaIndex: number,
    reciterServer: string | null,
  ): { url: string; surah: number }[] {
    const clips = [{ url: this.surahUrl(this.FATIHA, reciterServer), surah: this.FATIHA }];
    if (rakaIndex < 2) {
      const span = this.SURAH_MAX - this.SURAH_MIN + 1;
      let surah: number;
      do {
        surah = this.SURAH_MIN + Math.floor(Math.random() * span);
      } while (surah === this.lastSurah);
      this.lastSurah = surah;
      clips.push({ url: this.surahUrl(surah, reciterServer), surah });
    }
    return clips;
  }

  // ─── Playback engine ────────────────────────────────────────────────────────

  /**
   * Plays a flow's clip groups strictly one-after-another (a {@link GAP_MS} pause
   * between groups, clips within a group back-to-back); bails if a newer flow
   * starts. The posture counts as "held" for the *entire* flow — its whole audio,
   * announcement included — so nothing is ever cut short and moving on before it
   * finishes is caught as leaving early, the same in every posture.
   */
  private async runQueue(
    groups: string[][],
    onDone?: () => void,
    announceIndex = -1,
    onAnnounce?: () => void,
  ): Promise<void> {
    this.stopCurrent();
    const runId = ++this.queueRunId;
    this.holding = groups.length > 0;
    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      for (let g = 0; g < groups.length; g++) {
        if (g > 0) {
          await this.delay(this.GAP_MS);
          if (runId !== this.queueRunId) return;
        }
        // Flip the guide GIF the moment the "next movement" clip begins.
        if (g === announceIndex) onAnnounce?.();
        for (const url of groups[g]) {
          if (runId !== this.queueRunId) return; // superseded by a newer flow
          // A missing clip (e.g. recitation server down) is skipped, not fatal.
          const buffer = await this.loadBuffer(url).catch(() => null);
          if (runId !== this.queueRunId) return;
          // Recitation clips carry a surah so the on-screen ayah can track them;
          // any other clip means nothing is being recited right now.
          const surah = this.reciteSurahByUrl.get(url);
          if (surah === undefined) this.reciteClock = null;
          if (buffer) await this.playBuffer(buffer, surah);
        }
      }
    } catch {
      /* ignore playback failures */
    }
    // Reached the end on our own (not superseded): release and signal done.
    if (runId === this.queueRunId) {
      this.holding = false;
      this.reciteClock = null;
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
  private playBuffer(buffer: AudioBuffer, surah?: number): Promise<void> {
    const ctx = this.getCtx();
    return new Promise((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = this.CUE_RATE;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      this.currentSource = src;
      // Anchor the ayah clock to the exact moment this recitation clip begins.
      if (surah !== undefined) this.reciteClock = { surah, startedAt: ctx.currentTime };
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
