import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(phone: string, message: string): Promise<boolean> {
    // TODO: Integrate Twilio in production
    // 1. Validate phone number format (PH +63 prefix)
    // 2. Build Twilio message payload
    // 3. Send via twilio SDK client.messages.create()
    // 4. Handle delivery status callbacks
    const twilioEnabled = this.configService.get('TWILIO_ENABLED', 'false') === 'true';

    if (twilioEnabled) {
      this.logger.log(`[SMS] Sending via Twilio to: ${phone}`);
      // Twilio integration would go here
    }

    this.logger.log(`[SMS] To: ${phone} | ${message}`);
    return true;
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const message = `Your Daltaners verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
    return this.send(phone, message);
  }

  async sendBulk(
    recipients: string[],
    message: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        await this.send(recipient, message);
        success++;
      } catch {
        failed++;
        this.logger.warn(`[SMS] Failed to send to: ${recipient}`);
      }
    }

    return { success, failed };
  }
}
