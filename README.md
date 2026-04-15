# Hex Viewer

A binary file hex viewer that runs entirely in the browser — no build step, no dependencies.

Drop any file to inspect it in classic `hexdump -C` format: offset column, 16 hex bytes per row with a mid-row gap, and printable ASCII on the right.

**[Live Demo](https://sen.ltd/portfolio/hex-viewer/)**

## Features

- **Drag-and-drop** or click-to-select any file
- **Classic hex format** — offset | hex bytes (16/row) | ASCII
- **Magic number detection** — PNG, JPEG, GIF, ZIP, PDF, GZIP, BMP, WebP, WAV, MP3, ELF, WASM, SQLite, and more
- **Search** by hex pattern (`FF D8 FF`) or ASCII string, with prev/next navigation
- **Byte selection** — click and drag to select a range; copy as hex or ASCII
- **Byte editing** — double-click any byte to modify it
- **Download modified file** after editing
- **Export** full hex dump as `.txt`
- **Go to offset** — jump to any hex offset instantly
- **Column width** — switch between 8, 16, 32 columns
- **Virtual scroll** — handles large files smoothly
- **Japanese / English UI** toggle
- **Dark terminal theme** — monospace throughout

## Usage

```bash
# Serve locally
npm run serve
# Open http://localhost:8080
```

No installation required. Drop `index.html` in any static file server.

## Run tests

```bash
npm test
```

## File structure

```
hex-viewer/
├── index.html        # Single-page app entry point
├── style.css         # Dark terminal theme
├── src/
│   ├── main.js       # DOM, file handling, rendering, virtual scroll
│   ├── hex.js        # Pure hex formatting & search functions
│   ├── magic.js      # Magic number signatures & detection
│   └── i18n.js       # ja/en translations
├── tests/
│   ├── hex.test.js   # Tests for hex.js
│   └── magic.test.js # Tests for magic.js
└── assets/           # Screenshots etc.
```

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Focus search |
| `Enter` in search | Next match |
| `Enter` in edit modal | Apply byte edit |
| `Escape` in edit modal | Cancel |

## Supported magic numbers

PNG, JPEG, GIF87a, GIF89a, WebP, BMP, ZIP, PDF, GZIP, WAV, MP3 (ID3v2 & sync), OGG, FLAC, MP4, AVI, ELF, Mach-O (32/64-bit), SQLite, WASM, TIFF (LE/BE), ZSTD, 7-Zip, RAR

## License

MIT © 2026 SEN LLC (SEN 合同会社)

<!-- sen-publish:links -->
## Links

- 🌐 Demo: https://sen.ltd/portfolio/hex-viewer/
- 📝 dev.to: https://dev.to/sendotltd/a-browser-hex-viewer-with-magic-number-detection-and-virtual-scrolling-5fec
<!-- /sen-publish:links -->
