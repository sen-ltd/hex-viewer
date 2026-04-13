/**
 * magic.js - Magic number detection for common file types
 */

/**
 * @typedef {Object} MagicEntry
 * @property {string} name - Human-readable file type name
 * @property {string} mime - MIME type
 * @property {Uint8Array} signature - Byte signature at file start
 * @property {number} [offset] - Offset to check signature (default 0)
 */

/** @type {MagicEntry[]} */
export const MAGIC_NUMBERS = [
  {
    name: 'PNG',
    mime: 'image/png',
    signature: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    offset: 0,
  },
  {
    name: 'JPEG',
    mime: 'image/jpeg',
    signature: new Uint8Array([0xff, 0xd8, 0xff]),
    offset: 0,
  },
  {
    name: 'GIF87a',
    mime: 'image/gif',
    signature: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]),
    offset: 0,
  },
  {
    name: 'GIF89a',
    mime: 'image/gif',
    signature: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    offset: 0,
  },
  {
    name: 'WebP',
    mime: 'image/webp',
    // RIFF at 0, WEBP at 8 - check both
    signature: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
    offset: 0,
    extraCheck: (bytes) =>
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50,
  },
  {
    name: 'BMP',
    mime: 'image/bmp',
    signature: new Uint8Array([0x42, 0x4d]),
    offset: 0,
  },
  {
    name: 'ZIP',
    mime: 'application/zip',
    signature: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    offset: 0,
  },
  {
    name: 'PDF',
    mime: 'application/pdf',
    signature: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    offset: 0,
  },
  {
    name: 'GZIP',
    mime: 'application/gzip',
    signature: new Uint8Array([0x1f, 0x8b]),
    offset: 0,
  },
  {
    name: 'WAV',
    mime: 'audio/wav',
    // RIFF at 0, WAVE at 8
    signature: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
    offset: 0,
    extraCheck: (bytes) =>
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45,
  },
  {
    name: 'MP3 (ID3v2)',
    mime: 'audio/mpeg',
    signature: new Uint8Array([0x49, 0x44, 0x33]),
    offset: 0,
  },
  {
    name: 'MP3 (sync)',
    mime: 'audio/mpeg',
    signature: new Uint8Array([0xff, 0xfb]),
    offset: 0,
  },
  {
    name: 'OGG',
    mime: 'audio/ogg',
    signature: new Uint8Array([0x4f, 0x67, 0x67, 0x53]),
    offset: 0,
  },
  {
    name: 'FLAC',
    mime: 'audio/flac',
    signature: new Uint8Array([0x66, 0x4c, 0x61, 0x43]),
    offset: 0,
  },
  {
    name: 'MP4',
    mime: 'video/mp4',
    // ftyp box at offset 4
    signature: new Uint8Array([0x66, 0x74, 0x79, 0x70]),
    offset: 4,
  },
  {
    name: 'AVI',
    mime: 'video/avi',
    signature: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
    offset: 0,
    extraCheck: (bytes) =>
      bytes.length >= 12 &&
      bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20,
  },
  {
    name: 'ELF',
    mime: 'application/x-elf',
    signature: new Uint8Array([0x7f, 0x45, 0x4c, 0x46]),
    offset: 0,
  },
  {
    name: 'Mach-O (32-bit)',
    mime: 'application/x-mach-binary',
    signature: new Uint8Array([0xce, 0xfa, 0xed, 0xfe]),
    offset: 0,
  },
  {
    name: 'Mach-O (64-bit)',
    mime: 'application/x-mach-binary',
    signature: new Uint8Array([0xcf, 0xfa, 0xed, 0xfe]),
    offset: 0,
  },
  {
    name: 'SQLite',
    mime: 'application/x-sqlite3',
    signature: new Uint8Array([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00]),
    offset: 0,
  },
  {
    name: 'WASM',
    mime: 'application/wasm',
    signature: new Uint8Array([0x00, 0x61, 0x73, 0x6d]),
    offset: 0,
  },
  {
    name: 'TIFF (LE)',
    mime: 'image/tiff',
    signature: new Uint8Array([0x49, 0x49, 0x2a, 0x00]),
    offset: 0,
  },
  {
    name: 'TIFF (BE)',
    mime: 'image/tiff',
    signature: new Uint8Array([0x4d, 0x4d, 0x00, 0x2a]),
    offset: 0,
  },
  {
    name: 'ZSTD',
    mime: 'application/zstd',
    signature: new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]),
    offset: 0,
  },
  {
    name: '7-Zip',
    mime: 'application/x-7z-compressed',
    signature: new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
    offset: 0,
  },
  {
    name: 'RAR',
    mime: 'application/x-rar-compressed',
    signature: new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]),
    offset: 0,
  },
];

/**
 * Detect file type from the first bytes of a file.
 * Returns the best match (longest matching signature) or null.
 * @param {Uint8Array} bytes
 * @returns {{ name: string, mime: string } | null}
 */
export function detectFileType(bytes) {
  let best = null;
  let bestLen = -1;

  for (const entry of MAGIC_NUMBERS) {
    const off = entry.offset ?? 0;
    const sig = entry.signature;
    if (bytes.length < off + sig.length) continue;

    let match = true;
    for (let i = 0; i < sig.length; i++) {
      if (bytes[off + i] !== sig[i]) {
        match = false;
        break;
      }
    }
    if (!match) continue;

    // Extra check (e.g. WAV vs WebP vs AVI — all start with RIFF)
    if (entry.extraCheck && !entry.extraCheck(bytes)) continue;

    const len = sig.length;
    if (len > bestLen) {
      bestLen = len;
      best = { name: entry.name, mime: entry.mime };
    }
  }

  return best;
}
