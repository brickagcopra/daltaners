export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export function getThrottleConfig(): ThrottleConfig {
  return {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  };
}
