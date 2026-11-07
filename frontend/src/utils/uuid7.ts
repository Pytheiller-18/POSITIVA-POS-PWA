/**
 * Generación de identificadores únicos UUIDv7 (RFC 9562 Sección 5.7).
 * Produce IDs ordenables cronológicamente (48 bits de timestamp Unix en ms +
 * versión 7 + variante RFC 4122) compatibles con backend/app/utils/uuid7.py.
 */

let lastTimestampMs = 0;
let monotonicCounter = 0;

function fillRandomBytes(buffer: Uint8Array): void {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buffer);
    return;
  }
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
}

export function generateUUIDv7(): string {
  let nowMs = Date.now();
  if (nowMs === lastTimestampMs) {
    monotonicCounter = (monotonicCounter + 1) & 0x0fff;
    if (monotonicCounter === 0) {
      nowMs += 1;
      lastTimestampMs = nowMs;
    }
  } else if (nowMs > lastTimestampMs) {
    lastTimestampMs = nowMs;
    const seed = new Uint8Array(2);
    fillRandomBytes(seed);
    monotonicCounter = ((seed[0] << 8) | seed[1]) & 0x07ff;
  } else {
    // Protección ante retroceso leve del reloj local
    nowMs = lastTimestampMs;
    monotonicCounter = (monotonicCounter + 1) & 0x0fff;
  }

  const bytes = new Uint8Array(16);
  fillRandomBytes(bytes);

  // 48-bit big-endian Unix epoch timestamp en milisegundos (bytes 0..5)
  const high16 = Math.floor(nowMs / 0x100000000);
  const low32 = nowMs >>> 0;
  bytes[0] = (high16 >>> 8) & 0xff;
  bytes[1] = high16 & 0xff;
  bytes[2] = (low32 >>> 24) & 0xff;
  bytes[3] = (low32 >>> 16) & 0xff;
  bytes[4] = (low32 >>> 8) & 0xff;
  bytes[5] = low32 & 0xff;

  // Versión 7 (0111) + contador monotónico de 12 bits en rand_a (bytes 6..7)
  bytes[6] = 0x70 | ((monotonicCounter >>> 8) & 0x0f);
  bytes[7] = monotonicCounter & 0xff;

  // Variante RFC 4122 (10xx) en los 2 bits superiores del byte 8
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const UUIDV7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUIDv7(value: string): boolean {
  return UUIDV7_REGEX.test(value);
}
