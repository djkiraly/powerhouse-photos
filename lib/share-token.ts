import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure share token (64-char hex)
 */
export function generateShareToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate that a string is a valid share token format
 */
export function isValidShareToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}
