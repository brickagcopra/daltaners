import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const forwardedFor = req.ips as string[] | undefined;
    return forwardedFor && forwardedFor.length > 0
      ? forwardedFor[0]
      : (req.ip as string);
  }
}
