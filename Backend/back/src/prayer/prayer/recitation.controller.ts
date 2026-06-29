import { BadRequestException, Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import type { ReadableStream as NodeReadableStream } from 'stream/web';

const RECITER_BASE = 'https://server12.mp3quran.net/maher';

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

  @Get(':surah')
  async stream(
    @Param('surah') surahParam: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const surah = Number(surahParam);
    if (!Number.isInteger(surah) || !this.isAllowed(surah)) {
      throw new BadRequestException('Unsupported surah');
    }

    const url = `${RECITER_BASE}/${String(surah).padStart(3, '0')}.mp3`;
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
