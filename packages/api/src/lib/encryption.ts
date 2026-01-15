import crypto from "crypto";

/**
 * Message encryption utility using AES-256-GCM
 *
 * Messages are encrypted with a derived key from the conversation ID,
 * ensuring only participants can decrypt messages.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Get master encryption key from environment
// In production, this should be stored in a secure key management system
const MASTER_KEY = process.env.MESSAGE_ENCRYPTION_KEY || "dev-key-change-in-production-32c";

/**
 * Derive a conversation-specific encryption key
 * Uses PBKDF2 with the conversation ID as salt
 */
function deriveKey(conversationId: string): Buffer {
  // Use the conversation ID as additional entropy
  const salt = crypto
    .createHash("sha256")
    .update(conversationId)
    .digest();

  return crypto.pbkdf2Sync(
    MASTER_KEY,
    salt,
    100000, // iterations
    KEY_LENGTH,
    "sha256"
  );
}

/**
 * Encrypt a message
 *
 * @param plaintext - The message to encrypt
 * @param conversationId - The conversation ID (used for key derivation)
 * @returns Encrypted message as base64 string (format: iv:authTag:ciphertext)
 */
export function encryptMessage(
  plaintext: string,
  conversationId: string
): string {
  // Derive conversation-specific key
  const key = deriveKey(conversationId);

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine iv:authTag:ciphertext and encode as base64
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypt a message
 *
 * @param ciphertext - The encrypted message (base64 encoded)
 * @param conversationId - The conversation ID (used for key derivation)
 * @returns Decrypted plaintext message
 * @throws Error if decryption fails (wrong key, tampered message)
 */
export function decryptMessage(
  ciphertext: string,
  conversationId: string
): string {
  try {
    // Decode from base64
    const combined = Buffer.from(ciphertext, "base64");

    // Extract iv, authTag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive conversation-specific key
    const key = deriveKey(conversationId);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error("Failed to decrypt message - invalid ciphertext or key");
  }
}

/**
 * Generate a secure random key for MESSAGE_ENCRYPTION_KEY
 * Run this once and store the result in your .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("base64");
}

/**
 * Encrypt attachments (file URLs or metadata)
 */
export function encryptAttachments(
  attachments: string[],
  conversationId: string
): string[] {
  return attachments.map((url) => encryptMessage(url, conversationId));
}

/**
 * Decrypt attachments
 */
export function decryptAttachments(
  encryptedAttachments: string[],
  conversationId: string
): string[] {
  return encryptedAttachments.map((encrypted) =>
    decryptMessage(encrypted, conversationId)
  );
}
