/**
 * tests/magic.test.js — Tests for magic.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MAGIC_NUMBERS, detectFileType } from '../src/magic.js';

// ── MAGIC_NUMBERS structure ────────────────────────────────────

describe('MAGIC_NUMBERS', () => {
  it('is a non-empty array', () => {
    assert.ok(Array.isArray(MAGIC_NUMBERS));
    assert.ok(MAGIC_NUMBERS.length > 0);
  });

  it('every entry has name, mime, signature', () => {
    for (const entry of MAGIC_NUMBERS) {
      assert.ok(typeof entry.name === 'string', `${entry.name}: name must be string`);
      assert.ok(typeof entry.mime === 'string', `${entry.name}: mime must be string`);
      assert.ok(entry.signature instanceof Uint8Array, `${entry.name}: signature must be Uint8Array`);
      assert.ok(entry.signature.length > 0, `${entry.name}: signature must not be empty`);
    }
  });
});

// ── detectFileType ────────────────────────────────────────────

describe('detectFileType', () => {
  it('detects PNG', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'PNG');
    assert.equal(result.mime, 'image/png');
  });

  it('detects JPEG', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'JPEG');
    assert.equal(result.mime, 'image/jpeg');
  });

  it('detects GIF87a', () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'GIF87a');
  });

  it('detects GIF89a', () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'GIF89a');
  });

  it('detects ZIP', () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'ZIP');
    assert.equal(result.mime, 'application/zip');
  });

  it('detects PDF', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'PDF');
    assert.equal(result.mime, 'application/pdf');
  });

  it('detects GZIP', () => {
    const bytes = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'GZIP');
  });

  it('detects BMP', () => {
    const bytes = new Uint8Array([0x42, 0x4d, 0x00, 0x00, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'BMP');
    assert.equal(result.mime, 'image/bmp');
  });

  it('detects WAV (RIFF...WAVE)', () => {
    // RIFF at 0, WAVE at 8
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // file size
      0x57, 0x41, 0x56, 0x45, // WAVE
    ]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'WAV');
    assert.equal(result.mime, 'audio/wav');
  });

  it('detects WebP (RIFF...WEBP)', () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // file size
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'WebP');
    assert.equal(result.mime, 'image/webp');
  });

  it('detects MP3 (ID3v2)', () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'MP3 (ID3v2)');
  });

  it('detects ELF', () => {
    const bytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'ELF');
  });

  it('detects WASM', () => {
    const bytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, 'WASM');
  });

  it('detects 7-Zip', () => {
    const bytes = new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00]);
    const result = detectFileType(bytes);
    assert.ok(result !== null);
    assert.equal(result.name, '7-Zip');
  });

  it('returns null for unknown bytes', () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const result = detectFileType(bytes);
    assert.equal(result, null);
  });

  it('returns null for empty bytes', () => {
    const result = detectFileType(new Uint8Array(0));
    assert.equal(result, null);
  });

  it('returns null for random bytes', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const result = detectFileType(bytes);
    assert.equal(result, null);
  });

  it('RIFF without valid sub-type returns null or RIFF-based type', () => {
    // RIFF followed by garbage — should not match WAV, WebP, or AVI
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0xff, 0xff, 0xff, 0xff,
    ]);
    const result = detectFileType(bytes);
    // Should be null (no RIFF-based type matched)
    assert.equal(result, null);
  });
});
