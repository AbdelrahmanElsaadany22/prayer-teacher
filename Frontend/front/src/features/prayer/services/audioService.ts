import type { Lang } from '../../../shared/i18n/translations';

class AudioManager {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  /**
   * Qur'an recitation plays on its own channel so the short movement cues
   * (e.g. announcing "ruku'") never interrupt it — it continues until the next
   * rak'ah's recitation begins or the session ends.
   */
  private recitationSource: AudioBufferSourceNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();

  /**
   * Surah played during the previous rak'ah's qiyam, so the second rak'ah never
   * repeats the same short surah. Reset per prayer via {@link resetRecitation}.
   */
  private lastSurah: number | null = null;

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

  /**
   * Speaks the "next move is" lead-in followed by the movement name, using the
   * pre-generated (male) MP3 clips bundled under /audio.
   *
   * The lead-in is language-aware: English uses `prefix.mp3`, Arabic uses
   * `prefix_ar.mp3`. The movement-name clips (Arabic pronunciation) are shared
   * by both languages. If a prefix clip is missing the name still plays, so
   * there is always audio guidance.
   *
   * @param pose one of: ruku | iqama | sujood | juloos | tashahhud
   * @param lang the active UI language
   */
  speakCue(pose: string, lang: Lang = 'en'): void {
    if (typeof window === 'undefined') return;

    // Stop any cue still playing so they don't overlap. Recitation lives on its
    // own channel and is left alone here.
    this.stopCurrent();

    const prefixUrl = lang === 'ar' ? '/audio/prefix_ar.mp3' : '/audio/prefix.mp3';

    void (async () => {
      try {
        const ctx = this.getCtx();
        if (ctx.state === 'suspended') await ctx.resume();

        // The movement name is required; the prefix is optional (so a missing
        // localized prefix never silences the cue entirely).
        const namePromise = this.loadBuffer(`/audio/${pose}.mp3`);
        const prefix = await this.loadBuffer(prefixUrl).catch(() => null);
        const name = await namePromise;

        if (prefix) await this.playBuffer(prefix);
        await this.playBuffer(name);
      } catch {
        /* ignore playback failures */
      }
    })();
  }

  /**
   * Starts the qiyam recitation (Fatiha + optional surah) for the given rak'ah.
   * Unlike the movement cues, qiyam is *not* announced by name — the spoken cue
   * would clash with the reciter — so the learner just hears the recitation
   * while standing. The qiyam pose itself is still scored on detection.
   *
   * Once the recitation finishes on its own, the next movement (`nextCue`, e.g.
   * ruku') is announced so the guide never talks over the reciter. If the
   * learner bows early, stopRecitation() leaves the recitation pending and the
   * follow-up cue is never spoken (the move already happened).
   */
  reciteQiyam(
    rakaIndex: number,
    lang: Lang = 'en',
    nextCue: string | null = null,
    reciterServer: string | null = null,
  ): void {
    if (typeof window === 'undefined') return;
    void (async () => {
      try {
        const ctx = this.getCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        await this.playRecitation(rakaIndex, reciterServer);
        if (nextCue) this.speakCue(nextCue, lang);
      } catch {
        /* ignore playback failures */
      }
    })();
  }

  /** Resets surah history and stops any recitation from a previous prayer. */
  resetRecitation(): void {
    this.lastSurah = null;
    this.stopRecitation();
  }

  /** Stops the recitation channel (e.g. when the session ends). */
  stopRecitation(): void {
    if (this.recitationSource) {
      try {
        this.recitationSource.onended = null;
        this.recitationSource.stop();
      } catch {
        /* already stopped */
      }
      this.recitationSource = null;
    }
  }


  private stopCurrent(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        /* already stopped */
      }
      this.currentSource = null;
    }
  }

  /** Plays a recitation clip on the dedicated channel; resolves when it ends. */
  private playRecitationBuffer(buffer: AudioBuffer): Promise<void> {
    const ctx = this.getCtx();
    return new Promise((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      this.recitationSource = src;
      src.start();
    });
  }

  /**
   * Recites Al-Fatiha (every rak'ah) and, for the first two rak'ahs, a random
   * short surah (86–114) afterwards. The second rak'ah never repeats the surah
   * the first one used. Runs on its own channel so movement cues don't cut it.
   */
  private async playRecitation(rakaIndex: number, reciterServer: string | null): Promise<void> {
    this.stopRecitation(); // replace any recitation still playing
    const fatiha = await this.loadBuffer(this.surahUrl(this.FATIHA, reciterServer));
    await this.playRecitationBuffer(fatiha);

    if (rakaIndex < 2) {
      const span = this.SURAH_MAX - this.SURAH_MIN + 1;
      let surah: number;
      do {
        surah = this.SURAH_MIN + Math.floor(Math.random() * span);
      } while (surah === this.lastSurah);
      this.lastSurah = surah;
      const buffer = await this.loadBuffer(this.surahUrl(surah, reciterServer));
      await this.playRecitationBuffer(buffer);
    }
  }

  /** The URL differs per reciter, so switching reciters never serves a cached buffer from another one. */
  private surahUrl(n: number, reciterServer: string | null): string {
    const base = `${this.RECITER_BASE}/${n}`;
    return reciterServer ? `${base}?server=${encodeURIComponent(reciterServer)}` : base;
  }
}

export const audioService = new AudioManager();
