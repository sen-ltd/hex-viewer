/**
 * tests/hex.test.js — Tests for hex.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  toHex,
  toOffset,
  isPrintable,
  bytesToAscii,
  formatRow,
  formatHex,
  parseHexString,
  searchHex,
  searchAscii,
} from '../src/hex.js';

// ── toHex ──────────────────────────────────────────────────────

describe('toHex', () => {
  it('converts 0 to "00"', () => {
    assert.equal(toHex(0), '00');
  });

  it('converts 255 to "FF"', () => {
    assert.equal(toHex(255), 'FF');
  });

  it('converts 16 to "10"', () => {
    assert.equal(toHex(16), '10');
  });

  it('converts 0x7f to "7F"', () => {
    assert.equal(toHex(0x7f), '7F');
  });

  it('always returns uppercase', () => {
    assert.equal(toHex(0xab), 'AB');
  });

  it('handles values > 255 via masking', () => {
    // 0x1ff & 0xff = 0xff
    assert.equal(toHex(0x1ff), 'FF');
  });
});

// ── toOffset ──────────────────────────────────────────────────

describe('toOffset', () => {
  it('pads to 8 characters', () => {
    assert.equal(toOffset(0), '00000000');
    assert.equal(toOffset(1), '00000001');
  });

  it('formats 0x1a00 correctly', () => {
    assert.equal(toOffset(0x1a00), '00001A00');
  });

  it('formats max 32-bit value', () => {
    assert.equal(toOffset(0xffffffff), 'FFFFFFFF');
  });
});

// ── isPrintable ────────────────────────────────────────────────

describe('isPrintable', () => {
  it('returns true for space (0x20)', () => {
    assert.equal(isPrintable(0x20), true);
  });

  it('returns true for tilde (0x7e)', () => {
    assert.equal(isPrintable(0x7e), true);
  });

  it('returns false for DEL (0x7f)', () => {
    assert.equal(isPrintable(0x7f), false);
  });

  it('returns false for 0x1f', () => {
    assert.equal(isPrintable(0x1f), false);
  });

  it('returns false for NUL (0x00)', () => {
    assert.equal(isPrintable(0x00), false);
  });

  it('returns true for "A" (0x41)', () => {
    assert.equal(isPrintable(0x41), true);
  });

  it('returns true for "z" (0x7a)', () => {
    assert.equal(isPrintable(0x7a), true);
  });

  it('returns false for 0x80', () => {
    assert.equal(isPrintable(0x80), false);
  });
});

// ── bytesToAscii ───────────────────────────────────────────────

describe('bytesToAscii', () => {
  it('renders printable ASCII correctly', () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // Hello
    assert.equal(bytesToAscii(bytes), 'Hello');
  });

  it('replaces non-printable with dot', () => {
    const bytes = new Uint8Array([0x00, 0x41, 0x7f]);
    assert.equal(bytesToAscii(bytes), '.A.');
  });

  it('handles empty array', () => {
    assert.equal(bytesToAscii(new Uint8Array(0)), '');
  });
});

// ── formatRow ──────────────────────────────────────────────────

describe('formatRow', () => {
  it('starts with 8-char hex offset', () => {
    const bytes = new Uint8Array(16).fill(0x41);
    const row = formatRow(bytes, 0, 16);
    assert.match(row, /^[0-9A-F]{8}/);
  });

  it('ends with |<ascii>| section', () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x43]); // ABC
    const row = formatRow(bytes, 0, 16);
    assert.match(row, /\|ABC/);
  });

  it('uses dot for non-printable in ASCII column', () => {
    const bytes = new Uint8Array([0x00, 0x41]);
    const row = formatRow(bytes, 0, 16);
    assert.match(row, /\|\.A/);
  });

  it('pads short rows to full width', () => {
    const bytes = new Uint8Array([0x41]);
    const row = formatRow(bytes, 0, 16);
    // Should have blank hex cells for missing bytes
    assert.ok(row.length > 20);
  });

  it('uses provided offset', () => {
    const bytes = new Uint8Array([0x41]);
    const row = formatRow(bytes, 0x100, 16);
    assert.match(row, /^00000100/);
  });
});

// ── formatHex ─────────────────────────────────────────────────

describe('formatHex', () => {
  it('generates a final offset line', () => {
    const bytes = new Uint8Array([0x41, 0x42]);
    const dump = formatHex(bytes);
    const lines = dump.split('\n');
    assert.ok(lines.length >= 2);
    // Last line is just the final offset
    assert.match(lines[lines.length - 1], /^[0-9A-F]{8}$/);
  });

  it('has correct number of data rows for 32 bytes at width 16', () => {
    const bytes = new Uint8Array(32);
    const dump = formatHex(bytes, 0, 16);
    const lines = dump.split('\n');
    // 2 data rows + 1 final offset line = 3
    assert.equal(lines.length, 3);
  });

  it('respects starting offset', () => {
    const bytes = new Uint8Array([0x41]);
    const dump = formatHex(bytes, 0x200);
    assert.match(dump, /^00000200/);
  });
});

// ── parseHexString ────────────────────────────────────────────

describe('parseHexString', () => {
  it('parses hex with spaces', () => {
    const result = parseHexString('48 65 6c 6c 6f');
    assert.deepEqual(result, new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
  });

  it('parses hex without spaces', () => {
    const result = parseHexString('48656c6c6f');
    assert.deepEqual(result, new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
  });

  it('handles uppercase hex', () => {
    const result = parseHexString('FF D8 FF');
    assert.deepEqual(result, new Uint8Array([0xff, 0xd8, 0xff]));
  });

  it('throws on odd-length hex', () => {
    assert.throws(() => parseHexString('ABC'), /odd/);
  });

  it('throws on invalid hex chars', () => {
    assert.throws(() => parseHexString('GH'), /Invalid/);
  });

  it('returns empty array for empty string', () => {
    const result = parseHexString('');
    assert.equal(result.length, 0);
  });
});

// ── searchHex ─────────────────────────────────────────────────

describe('searchHex', () => {
  it('finds a single match', () => {
    const bytes = new Uint8Array([0x00, 0xff, 0xd8, 0xff, 0x00]);
    const pattern = new Uint8Array([0xff, 0xd8, 0xff]);
    assert.deepEqual(searchHex(bytes, pattern), [1]);
  });

  it('finds multiple matches', () => {
    const bytes = new Uint8Array([0xaa, 0xbb, 0xaa, 0xbb, 0xaa]);
    const pattern = new Uint8Array([0xaa, 0xbb]);
    assert.deepEqual(searchHex(bytes, pattern), [0, 2]);
  });

  it('returns empty array when no match', () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03]);
    const pattern = new Uint8Array([0xff]);
    assert.deepEqual(searchHex(bytes, pattern), []);
  });

  it('returns empty array for empty pattern', () => {
    const bytes = new Uint8Array([0x01, 0x02]);
    assert.deepEqual(searchHex(bytes, new Uint8Array(0)), []);
  });

  it('returns empty array when pattern longer than bytes', () => {
    const bytes = new Uint8Array([0x01]);
    const pattern = new Uint8Array([0x01, 0x02]);
    assert.deepEqual(searchHex(bytes, pattern), []);
  });

  it('finds match at start', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const pattern = new Uint8Array([0x89, 0x50]);
    assert.deepEqual(searchHex(bytes, pattern), [0]);
  });

  it('finds match at end', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0xab, 0xcd]);
    const pattern = new Uint8Array([0xab, 0xcd]);
    assert.deepEqual(searchHex(bytes, pattern), [2]);
  });
});

// ── searchAscii ───────────────────────────────────────────────

describe('searchAscii', () => {
  it('finds ASCII string', () => {
    const bytes = new Uint8Array([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00]);
    assert.deepEqual(searchAscii(bytes, 'Hello'), [1]);
  });

  it('returns empty array when not found', () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03]);
    assert.deepEqual(searchAscii(bytes, 'xyz'), []);
  });

  it('finds multiple occurrences', () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x41, 0x42]); // ABAB
    assert.deepEqual(searchAscii(bytes, 'AB'), [0, 2]);
  });

  it('returns empty array for empty string', () => {
    const bytes = new Uint8Array([0x41]);
    assert.deepEqual(searchAscii(bytes, ''), []);
  });

  it('finds PDF magic string', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    assert.deepEqual(searchAscii(bytes, '%PDF'), [0]);
  });
});
