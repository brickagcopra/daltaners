import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail, { MailDataRequired } from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get('SENDGRID_ENABLED', 'false') === 'true';
    this.fromEmail = this.configService.get(
      'SENDGRID_FROM_EMAIL',
      'noreply@daltaners.ph',
    );
    this.fromName = this.configService.get('SENDGRID_FROM_NAME', 'Daltaners');

    if (this.enabled) {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (!apiKey) {
        this.logger.error(
          'SENDGRID_ENABLED=true but SENDGRID_API_KEY is not set',
        );
        return;
      }
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.log(
        'SendGrid disabled - emails will be logged but not sent',
      );
    }
  }

  async send(to: string, subject: string, body: string): Promise<boolean> {
    if (!this.isValidEmail(to)) {
      this.logger.warn(`[EMAIL] Invalid email address: ${this.maskEmail(to)}`);
      return false;
    }

    if (!this.enabled) {
      this.logger.log(
        `[EMAIL] (dev) To: ${this.maskEmail(to)} | Subject: ${subject}`,
      );
      return true;
    }

    const msg: MailDataRequired = {
      to,
      from: { email: this.fromEmail, name: this.fromName },
      subject,
      html: body,
      text: this.stripHtml(body),
    };

    try {
      await sgMail.send(msg);
      this.logger.log(
        `[EMAIL] Sent to: ${this.maskEmail(to)} | Subject: ${subject}`,
      );
      return true;
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[EMAIL] Failed to send to ${this.maskEmail(to)}: ${errMsg}`,
      );
      return false;
    }
  }

  async sendTemplate(
    to: string,
    templateId: string,
    dynamicData: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.isValidEmail(to)) {
      this.logger.warn(
        `[EMAIL] Invalid email address: ${this.maskEmail(to)}`,
      );
      return false;
    }

    if (!this.enabled) {
      this.logger.log(
        `[EMAIL] (dev) Template: ${templateId} To: ${this.maskEmail(to)}`,
      );
      return true;
    }

    const msg: MailDataRequired = {
      to,
      from: { email: this.fromEmail, name: this.fromName },
      templateId,
      dynamicTemplateData: dynamicData,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(
        `[EMAIL] Template ${templateId} sent to: ${this.maskEmail(to)}`,
      );
      return true;
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[EMAIL] Template send failed for ${this.maskEmail(to)}: ${errMsg}`,
      );
      return false;
    }
  }

  async sendBulk(
    recipients: string[],
    subject: string,
    body: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // SendGrid supports up to 1000 personalizations per API call
    const validRecipients = recipients.filter((r) => this.isValidEmail(r));
    const invalidCount = recipients.length - validRecipients.length;
    failed += invalidCount;

    if (!this.enabled) {
      this.logger.log(
        `[EMAIL] (dev) Bulk send to ${validRecipients.length} recipients | Subject: ${subject}`,
      );
      return { success: validRecipients.length, failed };
    }

    // Batch in chunks of 1000 (SendGrid limit)
    const chunkSize = 1000;
    for (let i = 0; i < validRecipients.length; i += chunkSize) {
      const chunk = validRecipients.slice(i, i + chunkSize);
      const personalizations = chunk.map((email) => ({ to: email }));

      const msg: MailDataRequired = {
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        html: body,
        text: this.stripHtml(body),
        personalizations,
      };

      try {
        await sgMail.send(msg);
        success += chunk.length;
      } catch (error: unknown) {
        failed += chunk.length;
        const errMsg =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `[EMAIL] Bulk send failed for chunk starting at ${i}: ${errMsg}`,
        );
      }
    }

    this.logger.log(
      `[EMAIL] Bulk send complete: ${success} succeeded, ${failed} failed`,
    );
    return { success, failed };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const masked =
      local.length > 2
        ? `${local[0]}***${local[local.length - 1]}`
        : '***';
    return `${masked}@${domain}`;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
