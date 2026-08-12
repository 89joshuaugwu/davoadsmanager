import "server-only";
import CryptoJS from "crypto-js";

/**
 * Reversible AES-256 for stored Gmail passwords. The key stays server-only
 * (see ENCRYPTION_KEY in .env.local.example) and never reaches the browser —
 * encrypt/decrypt only happen inside app/api/vault/route.ts.
 */

function getSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not set. See .env.local.example.");
  }
  return secret;
}

export function encryptValue(plainText: string): string {
  return CryptoJS.AES.encrypt(plainText, getSecret()).toString();
}

export function decryptValue(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, getSecret());
  const result = bytes.toString(CryptoJS.enc.Utf8);
  if (!result) {
    throw new Error("Decryption failed — wrong ENCRYPTION_KEY or corrupted value.");
  }
  return result;
}
