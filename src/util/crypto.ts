/** Password-based document encryption: PBKDF2-SHA256 (310k iterations) + AES-256-GCM. */
const MAGIC = new TextEncoder().encode('QFDE1');

async function key(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJson(obj: unknown, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await key(password, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(obj))));
  const out = new Uint8Array(MAGIC.length + salt.length + iv.length + ct.length);
  out.set(MAGIC, 0); out.set(salt, MAGIC.length); out.set(iv, MAGIC.length + 16); out.set(ct, MAGIC.length + 28);
  return out;
}

export async function decryptJson(data: ArrayBuffer, password: string): Promise<any> {
  const u8 = new Uint8Array(data);
  for (let i = 0; i < MAGIC.length; i++) if (u8[i] !== MAGIC[i]) throw new Error('Not an encrypted Anne\'s Pen file');
  const salt = u8.slice(MAGIC.length, MAGIC.length + 16);
  const iv = u8.slice(MAGIC.length + 16, MAGIC.length + 28);
  const ct = u8.slice(MAGIC.length + 28);
  const k = await key(password, salt);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}
