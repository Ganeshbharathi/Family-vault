/**
 * Client-Side Strong End-to-End Encryption Service
 * Uses Web Crypto API: PBKDF2 (100,000 rounds of SHA-256) + AES-GCM 256-bit.
 * Zero external libraries needed, runs entirely in modern browsers.
 */

const SALT = new Uint8Array([75, 117, 116, 117, 109, 98, 86, 97, 117, 108, 116, 50, 48, 50, 54, 33]); // 'KutumbVault2026!'
const ITERATIONS = 100000;

/**
 * Derives a 256-bit AES-GCM CryptoKey from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string into a base64 encoded ciphertext string (IV prepended)
 */
export async function encryptText(plainText: string, passphrase: string): Promise<string> {
  if (!plainText || !passphrase) return plainText;
  try {
    const key = await deriveKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const enc = new TextEncoder();

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    // Combine IV (12 bytes) + Ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return `enc:${btoa(binary)}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return plainText;
  }
}

/**
 * Decrypts an encrypted base64 string back to plaintext
 */
export async function decryptText(cipherText: string, passphrase: string): Promise<string> {
  if (!cipherText || !cipherText.startsWith('enc:') || !passphrase) return cipherText;
  try {
    const rawBase64 = cipherText.replace(/^enc:/, '');
    const binary = atob(rawBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await deriveKey(passphrase);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('Decryption failed (incorrect key or corrupted data):', err);
    return cipherText;
  }
}
