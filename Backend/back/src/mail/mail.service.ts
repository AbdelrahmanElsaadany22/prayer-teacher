import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
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

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Fail fast instead of hanging the request if SMTP is unreachable.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    // Surface configuration/connectivity problems early in the logs.
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed', error);
      } else {
        this.logger.log(`SMTP ready (host=${host}, port=${port})`);
      }
    });
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const subject = 'Verify your account';
    const text = `Your verification code is ${code}. It expires in 10 minutes.`;
    const html = this.buildVerificationHtml(code);

    if (!this.transporter) {
      // Dev fallback: no SMTP configured, so surface the code in the logs.
      this.logger.log(`[DEV] Verification code for ${to}: ${code}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
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
