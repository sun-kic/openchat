import { randomBytes } from 'crypto'

/**
 * Generate a cryptographically secure random token with a prefix
 * @param prefix - Token prefix for identification (e.g., 'act_inv_', 'stu_sess_')
 * @returns URL-safe random token string
 */
export function generateSecureToken(prefix: string): string {
  // Generate 32 bytes (256 bits) of random data
  const randomPart = randomBytes(32).toString('base64url')
  return `${prefix}${randomPart}`
}

/**
 * Generate an activity invitation token
 * @param activityId - Activity UUID (for debugging purposes in logs)
 * @returns Secure invitation token
 */
export function generateInvitationToken(activityId: string): string {
  const timestamp = Date.now().toString(36) // Base36 timestamp (compact)
  const random = randomBytes(24).toString('base64url') // 24 bytes of randomness
  return `act_inv_${timestamp}_${random}`
}

/**
 * Generate a secure random password for teacher accounts
 * @param length - Password length (default: 16)
 * @returns Random password with mixed characters
 */
export function generateSecurePassword(length: number = 16): string {
  // Character set excluding ambiguous characters (0, O, I, l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*'
  const bytes = randomBytes(length)
  let password = ''

  for (let i = 0; i < length; i++) {
    // Use modulo to map random byte to character index
    password += chars.charAt(bytes[i] % chars.length)
  }

  return password
}

/**
 * Hash a token using SHA-256 (optional, for paranoid security)
 * Store hashed tokens in database instead of plaintext
 * @param token - Token to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashToken(token: string): string {
  const { createHash } = require('crypto')
  return createHash('sha256').update(token).digest('hex')
}
