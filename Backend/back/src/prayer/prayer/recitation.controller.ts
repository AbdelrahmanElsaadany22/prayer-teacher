import { BadGatewayException, BadRequestException, Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import type { ReadableStream as NodeReadableStream } from 'stream/web';

// Default reciter when the user hasn't picked one: Abdul Rashid Sufi (Hafs 'an
// 'Asim). This moshaf has published ayah timing (read 258), so the "ayah being
// recited" panel works out of the box. Keep in sync with the frontend's
// DEFAULT_RECITER_SERVER so the on-screen ayah matches this audio.
const RECITER_BASE = 'https://server16.mp3quran.net/soufi/Rewayat-Hafs-A-n-Assem';

/** mp3quran.net hostnames look like server6.mp3quran.net, server12.mp3quran.net, etc. */
const MP3QURAN_HOST = /^server\d+\.mp3quran\.net$/;

interface UpstreamMoshaf {
  server: string;
  surah_total: number;
  surah_list: string;
}

interface UpstreamReciter {
  id: number;
  name: string;
  moshaf: UpstreamMoshaf[];
}

export interface ReciterOption {
  id: number;
  name: string;
  server: string;
}

/**
 * Public proxy for the Qur'an recitation MP3s played during the prayer guide.
 *
 * The browser cannot send a Bearer token on an <audio> element, so this route
 * is intentionally unauthenticated. It exists so playback never depends on the
 * upstream reciter server sending CORS headers — the audio is relayed (and
 * cached) through our own origin instead.
 */
@Controller('recitation')
export class RecitationController {
  /** Al-Fatiha (recited every rak'ah) plus the short surahs 86–114 used as cues. */
  private isAllowed(n: number): boolean {
    return n === 1 || (n >= 86 && n <= 114);
  }

  /** Every surah this app can ever request — a moshaf must cover all of these to be selectable. */
  private readonly REQUIRED_SURAHS = [1, ...Array.from({ length: 114 - 86 + 1 }, (_, i) => 86 + i)];

  /** Validates a user-supplied reciter server against the mp3quran.net host pattern (anti-SSRF). */
  private parseReciterServer(raw: string): string | null {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || !MP3QURAN_HOST.test(url.hostname)) return null;
      return url.toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  @Get('reciters')
  async listReciters(@Query('language') language?: string): Promise<ReciterOption[]> {
    const lang = language === 'en' ? 'eng' : 'ar';
    const res = await fetch(`https://www.mp3quran.net/api/v3/reciters?language=${lang}`);
    if (!res.ok) throw new BadGatewayException('Reciter list unavailable');

    const data = (await res.json()) as { reciters: UpstreamReciter[] };
    const required = this.REQUIRED_SURAHS;

    const options: ReciterOption[] = [];
    for (const reciter of data.reciters) {
      const qualifying = reciter.moshaf
        .filter((m) => {
          const surahs = new Set(m.surah_list.split(',').map(Number));
          return required.every((s) => surahs.has(s));
        })
        .sort((a, b) => b.surah_total - a.surah_total)[0];

      if (qualifying) {
        options.push({ id: reciter.id, name: reciter.name, server: qualifying.server.replace(/\/$/, '') });
      }
    }

    return options.sort((a, b) => a.name.localeCompare(b.name, lang === 'eng' ? 'en' : 'ar'));
  }

  @Get(':surah')
  async stream(
    @Param('surah') surahParam: string,
    @Query('server') serverParam: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const surah = Number(surahParam);
    if (!Number.isInteger(surah) || !this.isAllowed(surah)) {
      throw new BadRequestException('Unsupported surah');
    }

    const base = (serverParam && this.parseReciterServer(serverParam)) || RECITER_BASE;
    const url = `${base}/${String(surah).padStart(3, '0')}.mp3`;
    const range = req.headers.range;

    const upstream = await fetch(url, range ? { headers: { Range: range } } : {});

    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status === 404 ? 404 : 502).end();
      return;
    }

    // Relay the bits the <audio> element needs for streaming + seeking.
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg');
    res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') ?? 'bytes');
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body as unknown as NodeReadableStream<Uint8Array>).pipe(res);
  }
}
