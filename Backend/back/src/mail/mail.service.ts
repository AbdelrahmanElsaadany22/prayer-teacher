import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve4 } from 'node:dns/promises';
import * as nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

/** The sender, split the way Brevo's API wants it. */
interface Sender {
  email: string;
  name?: string;
}

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private brevoKey: string | null = null;
  private smtp: SmtpConfig | null = null;
  private fromAddress = '';
  private sender: Sender = { email: 'no-reply@prayer.app' };

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.fromAddress =
      this.config.get<string>('SMTP_FROM') ?? user ?? 'no-reply@prayer.app';
    this.sender = parseSender(this.fromAddress);

    // Brevo goes out over HTTPS, so it works on hosts that block SMTP ports
    // outright (Render's free tier blocks 25/465/587). Preferred when present.
    this.brevoKey = this.config.get<string>('BREVO_API_KEY') ?? null;
    if (this.brevoKey) {
      this.logger.log(`Email via Brevo HTTP API (from=${this.sender.email})`);
      return;
    }

    if (!host || !user || !pass) {
      this.logger.warn(
        'No email transport configured (set BREVO_API_KEY, or ' +
          'SMTP_HOST/SMTP_USER/SMTP_PASS). Verification emails will be logged ' +
          'to the console instead of sent.',
      );
      return;
    }

    this.smtp = { host, port, user, pass };

    // Surface configuration/connectivity problems early in the logs.
    void this.createTransporter().then((transporter) =>
      transporter.verify((error) => {
        if (error) {
          this.logger.error('SMTP connection failed', error);
        } else {
          this.logger.log(`SMTP ready (host=${host}, port=${port})`);
        }
      }),
    );
  }

  /**
   * Builds a transporter bound to an IPv4 address of the SMTP host.
   *
   * Nodemailer resolves the hostname itself and then picks one record at
   * random out of the combined A/AAAA list. Hosts without outbound IPv6
   * (Render, among others) therefore fail with ENETUNREACH whenever an AAAA
   * record wins the draw, which is why sending was failing intermittently
   * rather than consistently. Resolving to IPv4 ourselves removes the draw;
   * the hostname is kept as the TLS servername so certificate validation
   * still runs against the real host and not the literal address.
   *
   * Resolution happens per transporter rather than once at startup so a
   * long-lived process never keeps sending to an address that has since been
   * withdrawn from the pool.
   */
  private async createTransporter(): Promise<nodemailer.Transporter> {
    const { host, port, user, pass } = this.smtp!;

    let connectHost = host;
    let tls: { servername: string } | undefined;

    try {
      const [ipv4] = await resolve4(host);
      if (ipv4) {
        connectHost = ipv4;
        tls = { servername: host };
      }
    } catch {
      // No A record, or DNS is unavailable. Fall back to letting nodemailer
      // resolve the hostname; on a dual-stack host that still works.
    }

    return nodemailer.createTransport({
      host: connectHost,
      port,
      secure: port === 465,
      auth: { user, pass },
      ...(tls ? { tls } : {}),
      // Fail fast instead of hanging the request if SMTP is unreachable.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const subject = 'Verify your account';
    const text = `Your verification code is ${code}. It expires in 10 minutes.`;
    const html = this.buildVerificationHtml(code);

    try {
      if (this.brevoKey) {
        await this.sendViaBrevo(to, subject, text, html);
      } else if (this.smtp) {
        await this.sendViaSmtp(to, subject, text, html);
      } else {
        // Dev fallback: nothing configured, so surface the code in the logs.
        this.logger.log(`[DEV] Verification code for ${to}: ${code}`);
      }
    } catch (error) {
      // Swallow here (callers fire-and-forget): log so the cause is visible.
      this.logger.error(`Failed to send verification email to ${to}`, error);
    }
  }

  /** Sends over Brevo's REST API — a plain HTTPS call, no SMTP ports involved. */
  private async sendViaBrevo(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': this.brevoKey!,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: this.sender,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      // Don't let a hanging request tie up the signup that triggered it.
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      // Brevo puts the useful part (unverified sender, bad key, quota) in the body.
      const detail = await response.text().catch(() => '');
      throw new Error(`Brevo returned ${response.status}: ${detail}`);
    }

    const body = (await response.json().catch(() => ({}))) as {
      messageId?: string;
    };
    this.logger.log(
      `Verification email sent to ${to} (id=${body.messageId ?? 'unknown'})`,
    );
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const transporter = await this.createTransporter();
    const info = await transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      text,
      html,
    });
    this.logger.log(`Verification email sent to ${to} (id=${info.messageId})`);
  }

  private buildVerificationHtml(code: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your account</h2>
        <p>Use the following code to verify your account:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p style="color: #666;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `;
  }
}

/**
 * Splits a `From` value into the {name, email} pair Brevo expects. Accepts both
 * a bare address and the `Display Name <address>` form that SMTP_FROM usually
 * carries; anything unrecognisable is passed through as the address itself.
 */
function parseSender(from: string): Sender {
  const match = /^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(from);
  if (!match) return { email: from.trim() };

  const name = match[1].replace(/^["']|["']$/g, '').trim();
  const email = match[2].trim();
  return name ? { name, email } : { email };
}
