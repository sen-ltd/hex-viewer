/**
 * hex.js - Pure hex formatting and search functions
 */

/**
 * Convert a byte (0-255) to a 2-character uppercase hex string.
 * @param {number} byte
 * @returns {string}
 */
export function toHex(byte) {
  return (byte & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Convert an offset number to an 8-character uppercase hex string.
 * @param {number} n
 * @returns {string}
 */
export function toOffset(n) {
  return n.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Return true if byte is a printable ASCII character (0x20-0x7E).
 * @param {number} byte
 * @returns {boolean}
 */
export function isPrintable(byte) {
  return byte >= 0x20 && byte <= 0x7e;
}

/**
 * Convert a byte array to ASCII string, replacing non-printable with '.'.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToAscii(bytes) {
  let result = '';
  for (const b of bytes) {
    result += isPrintable(b) ? String.fromCharCode(b) : '.';
  }
  return result;
}

/**
 * Format a single row like hexdump -C.
 * @param {Uint8Array} bytes - The bytes for this row (up to width bytes)
 * @param {number} offset - The offset of the first byte in this row
 * @param {number} [width=16] - Bytes per row
 * @returns {string}
 */
export function formatRow(bytes, offset, width = 16) {
  const hexParts = [];
  for (let i = 0; i < width; i++) {
    if (i < bytes.length) {
      hexParts.push(toHex(bytes[i]));
    } else {
      hexParts.push('  ');
    }
    if (i === 7) hexParts.push('');  // mid-row gap
  }
  const hexStr = hexParts.join(' ');
  const asciiStr = bytesToAscii(bytes).padEnd(width, ' ');
  return `${toOffset(offset)}  ${hexStr}  |${asciiStr}|`;
}

/**
 * Format a full hex dump like hexdump -C.
 * @param {Uint8Array} bytes
 * @param {number} [offset=0] - Starting offset
 * @param {number} [width=16] - Bytes per row
 * @returns {string}
 */
export function formatHex(bytes, offset = 0, width = 16) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += width) {
    const rowBytes = bytes.slice(i, i + width);
    lines.push(formatRow(rowBytes, offset + i, width));
  }
  // Final offset line (like hexdump -C)
  lines.push(toOffset(offset + bytes.length));
  return lines.join('\n');
}

/**
 * Parse a hex string (with or without spaces) into a Uint8Array.
 * E.g. "48 65 6c 6c 6f" or "48656c6c6f"
 * @param {string} str
 * @returns {Uint8Array}
 */
export function parseHexString(str) {
  // Remove all whitespace
  const clean = str.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd number of characters');
  }
  const result = new Uint8Array(clean.length / 2);
  for (let i = 0; i < result.length; i++) {
    const hex = clean.slice(i * 2, i * 2 + 2);
    const val = parseInt(hex, 16);
    if (isNaN(val)) {
      throw new Error(`Invalid hex characters: "${hex}"`);
    }
    result[i] = val;
  }
  return result;
}

/**
 * Search for a byte pattern in a byte array.
 * Returns array of starting indices where pattern is found.
 * @param {Uint8Array} bytes
 * @param {Uint8Array} pattern
 * @returns {number[]}
 */
export function searchHex(bytes, pattern) {
  const matches = [];
  if (pattern.length === 0 || pattern.length > bytes.length) return matches;
  outer: for (let i = 0; i <= bytes.length - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (bytes[i + j] !== pattern[j]) continue outer;
    }
    matches.push(i);
  }
  return matches;
}

/**
 * Search for an ASCII string in a byte array.
 * Returns array of starting indices where string is found.
 * @param {Uint8Array} bytes
 * @param {string} str
 * @returns {number[]}
 */
export function searchAscii(bytes, str) {
  if (str.length === 0) return [];
  const pattern = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    pattern[i] = str.charCodeAt(i);
  }
  return searchHex(bytes, pattern);
}
