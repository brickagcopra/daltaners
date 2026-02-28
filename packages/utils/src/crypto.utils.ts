import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

export function generateUuid(): string {
  return uuidv4();
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${uuidv4()}`;
}
