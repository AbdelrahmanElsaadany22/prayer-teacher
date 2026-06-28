import type { Lang } from '../../../shared/i18n/translations';

class AudioManager {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();

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
   * @param pose one of: qiyam | ruku | iqama | sujood | juloos | tashahhud
   * @param lang the active UI language
   */
  speakCue(pose: string, lang: Lang = 'en'): void {
    if (typeof window === 'undefined') return;

    // Stop any cue still playing so they don't overlap.
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
      } catch {
        /* already stopped */
      }
      this.currentSource = null;
    }

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
}

export const audioService = new AudioManager();
