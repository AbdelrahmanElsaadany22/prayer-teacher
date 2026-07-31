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

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private smtp: SmtpConfig | null = null;
  private fromAddress = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.fromAddress =
      this.config.get<string>('SMTP_FROM') ?? user ?? 'no-reply@prayer.app';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP is not fully configured (SMTP_HOST/SMTP_USER/SMTP_PASS). ' +
          'Verification emails will be logged to the console instead of sent.',
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

    if (!this.smtp) {
      // Dev fallback: no SMTP configured, so surface the code in the logs.
      this.logger.log(`[DEV] Verification code for ${to}: ${code}`);
      return;
    }

    try {
      const transporter = await this.createTransporter();
      const info = await transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Verification email sent to ${to} (id=${info.messageId})`);
    } catch (error) {
      // Swallow here (callers fire-and-forget): log so the cause is visible.
      this.logger.error(`Failed to send verification email to ${to}`, error);
    }
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
