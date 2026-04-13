/**
 * main.js - DOM, file handling, rendering for Hex Viewer
 */

import { formatRow, toOffset, toHex, bytesToAscii, parseHexString, searchHex, searchAscii } from './hex.js';
import { detectFileType } from './magic.js';
import { getT } from './i18n.js';

// ────────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────────

const state = {
  /** @type {Uint8Array|null} */
  bytes: null,
  /** @type {Uint8Array} - mutable copy for editing */
  editBytes: null,
  fileName: '',
  fileSize: 0,
  fileType: null,
  lang: 'en',
  rowWidth: 16,
  searchQuery: '',
  searchMode: 'hex',   // 'hex' | 'ascii'
  matches: [],
  matchIndex: -1,
  /** @type {Set<number>} */
  selectedBytes: new Set(),
  selectionStart: -1,
  selectionEnd: -1,
  isSelecting: false,
  editOffset: -1,
  visibleStart: 0,    // Virtual scroll
  ROW_HEIGHT: 22,     // px per row
  VISIBLE_ROWS: 40,   // number of rows to render
};

// ────────────────────────────────────────────────────────────────
// DOM refs (assigned after DOMContentLoaded)
// ────────────────────────────────────────────────────────────────

let $dropzone, $fileInput, $fileInfo, $infoName, $infoSize, $infoType, $infoMagic;
let $searchInput, $searchHexBtn, $searchAsciiBtn, $searchPrev, $searchNext, $searchCount;
let $selInfo, $copyHex, $copyAscii;
let $exportBtn, $downloadBtn;
let $langBtn;
let $hexTable, $scrollSpacer, $hexViewport;
let $gotoInput, $gotoBtn;
let $widthSelect;
let $editModal, $editInput, $editApply, $editCancel, $editOffsetLabel;
let $toast;

// ────────────────────────────────────────────────────────────────
// Translation helper
// ────────────────────────────────────────────────────────────────

function t(key, ...args) {
  const dict = getT(state.lang);
  const val = dict[key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  if ($langBtn) $langBtn.textContent = state.lang === 'en' ? 'JA' : 'EN';
}

// ────────────────────────────────────────────────────────────────
// File loading
// ────────────────────────────────────────────────────────────────

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const buffer = e.target.result;
    state.bytes = new Uint8Array(buffer);
    state.editBytes = new Uint8Array(buffer);
    state.fileName = file.name;
    state.fileSize = file.size;
    state.fileType = file.type || null;
    state.fileType = detectFileType(state.bytes);
    state.matches = [];
    state.matchIndex = -1;
    state.selectedBytes = new Set();
    state.selectionStart = -1;
    state.selectionEnd = -1;
    state.searchQuery = '';
    state.visibleStart = 0;
    if ($searchInput) $searchInput.value = '';
    renderFileInfo();
    renderHexTable();
    updateSelectionUI();
    $dropzone.classList.add('hidden');
    document.getElementById('viewer-panel').classList.remove('hidden');
  };
  reader.readAsArrayBuffer(file);
}

// ────────────────────────────────────────────────────────────────
// File info
// ────────────────────────────────────────────────────────────────

function renderFileInfo() {
  $infoName.textContent = state.fileName;
  $infoSize.textContent = t('bytes', state.fileSize);
  if (state.fileType) {
    $infoType.textContent = state.fileType.mime;
    $infoMagic.textContent = state.fileType.name;
  } else {
    $infoType.textContent = t('unknown');
    $infoMagic.textContent = '—';
  }
}

// ────────────────────────────────────────────────────────────────
// Virtual-scroll hex table
// ────────────────────────────────────────────────────────────────

function totalRows() {
  if (!state.bytes) return 0;
  return Math.ceil(state.bytes.length / state.rowWidth);
}

function renderHexTable() {
  if (!state.bytes) return;
  const rows = totalRows();
  const totalHeight = rows * state.ROW_HEIGHT;
  $scrollSpacer.style.height = totalHeight + 'px';

  const start = state.visibleStart;
  const end = Math.min(start + state.VISIBLE_ROWS, rows);

  const fragment = document.createDocumentFragment();

  for (let r = start; r < end; r++) {
    const byteOffset = r * state.rowWidth;
    const rowBytes = state.editBytes.slice(byteOffset, byteOffset + state.rowWidth);
    const tr = buildRow(r, byteOffset, rowBytes);
    fragment.appendChild(tr);
  }

  $hexTable.innerHTML = '';
  $hexTable.appendChild(fragment);
  $hexTable.style.transform = `translateY(${start * state.ROW_HEIGHT}px)`;
}

function buildRow(rowIndex, byteOffset, rowBytes) {
  const tr = document.createElement('tr');
  tr.dataset.row = rowIndex;

  // Offset cell
  const tdOff = document.createElement('td');
  tdOff.className = 'col-offset';
  tdOff.textContent = toOffset(byteOffset);
  tr.appendChild(tdOff);

  // Hex cells
  const tdHex = document.createElement('td');
  tdHex.className = 'col-hex';
  for (let i = 0; i < state.rowWidth; i++) {
    if (i === 8) {
      const gap = document.createElement('span');
      gap.className = 'hex-gap';
      tdHex.appendChild(gap);
    }
    const span = document.createElement('span');
    span.className = 'hex-byte';
    const absIdx = byteOffset + i;
    if (i < rowBytes.length) {
      span.textContent = toHex(rowBytes[i]);
      span.dataset.idx = absIdx;
      applyByteClass(span, absIdx);
      span.addEventListener('mousedown', onByteMousedown);
      span.addEventListener('mouseenter', onByteMouseenter);
      span.addEventListener('dblclick', onByteDblclick);
    } else {
      span.textContent = '  ';
      span.classList.add('hex-empty');
    }
    tdHex.appendChild(span);
  }
  tr.appendChild(tdHex);

  // ASCII cell
  const tdAscii = document.createElement('td');
  tdAscii.className = 'col-ascii';
  tdAscii.appendChild(document.createTextNode('|'));
  for (let i = 0; i < rowBytes.length; i++) {
    const absIdx = byteOffset + i;
    const ch = document.createElement('span');
    ch.className = 'ascii-byte';
    ch.textContent = rowBytes[i] >= 0x20 && rowBytes[i] <= 0x7e
      ? String.fromCharCode(rowBytes[i])
      : '.';
    ch.dataset.idx = absIdx;
    applyByteClass(ch, absIdx);
    ch.addEventListener('mousedown', onByteMousedown);
    ch.addEventListener('mouseenter', onByteMouseenter);
    tdAscii.appendChild(ch);
  }
  tdAscii.appendChild(document.createTextNode('|'));
  tr.appendChild(tdAscii);

  return tr;
}

function applyByteClass(el, idx) {
  el.classList.remove('selected', 'match', 'match-active');
  if (state.selectedBytes.has(idx)) el.classList.add('selected');
  const mi = state.matches.indexOf(idx);
  if (mi !== -1) {
    el.classList.add('match');
    if (mi === state.matchIndex) el.classList.add('match-active');
  }
  // Also check if idx is within a multi-byte match
  for (let m = 0; m < state.matches.length; m++) {
    const matchStart = state.matches[m];
    const matchEnd = matchStart + getMatchLength() - 1;
    if (idx >= matchStart && idx <= matchEnd) {
      el.classList.add('match');
      if (m === state.matchIndex) el.classList.add('match-active');
      break;
    }
  }
}

function getMatchLength() {
  if (!state.searchQuery) return 1;
  if (state.searchMode === 'hex') {
    try {
      return parseHexString(state.searchQuery).length;
    } catch {
      return 1;
    }
  }
  return state.searchQuery.length;
}

// ────────────────────────────────────────────────────────────────
// Selection
// ────────────────────────────────────────────────────────────────

function onByteMousedown(e) {
  e.preventDefault();
  const idx = parseInt(e.currentTarget.dataset.idx);
  if (isNaN(idx)) return;
  state.isSelecting = true;
  state.selectionStart = idx;
  state.selectionEnd = idx;
  updateSelection();
}

function onByteMouseenter(e) {
  if (!state.isSelecting) return;
  const idx = parseInt(e.currentTarget.dataset.idx);
  if (isNaN(idx)) return;
  state.selectionEnd = idx;
  updateSelection();
}

function onByteDblclick(e) {
  const idx = parseInt(e.currentTarget.dataset.idx);
  if (isNaN(idx)) return;
  openEditModal(idx);
}

function updateSelection() {
  const start = Math.min(state.selectionStart, state.selectionEnd);
  const end = Math.max(state.selectionStart, state.selectionEnd);
  state.selectedBytes = new Set();
  for (let i = start; i <= end; i++) state.selectedBytes.add(i);
  renderHexTable();
  updateSelectionUI();
}

function updateSelectionUI() {
  if (state.selectedBytes.size === 0) {
    $selInfo.textContent = '';
    $copyHex.disabled = true;
    $copyAscii.disabled = true;
    return;
  }
  const sorted = [...state.selectedBytes].sort((a, b) => a - b);
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const len = sorted.length;
  $selInfo.textContent = t('selectionInfo', toOffset(start), toOffset(end), len);
  $copyHex.disabled = false;
  $copyAscii.disabled = false;
}

// ────────────────────────────────────────────────────────────────
// Search
// ────────────────────────────────────────────────────────────────

function runSearch() {
  const q = $searchInput.value.trim();
  state.searchQuery = q;
  state.matches = [];
  state.matchIndex = -1;
  $searchCount.textContent = '';

  if (!state.bytes || !q) {
    renderHexTable();
    return;
  }

  try {
    if (state.searchMode === 'hex') {
      const pattern = parseHexString(q);
      state.matches = searchHex(state.editBytes, pattern);
    } else {
      state.matches = searchAscii(state.editBytes, q);
    }
  } catch {
    $searchCount.textContent = t('noMatches');
    renderHexTable();
    return;
  }

  if (state.matches.length > 0) {
    state.matchIndex = 0;
    $searchCount.textContent = t('matchCount', state.matches.length);
    scrollToMatch(state.matches[0]);
  } else {
    $searchCount.textContent = t('noMatches');
  }
  renderHexTable();
}

function scrollToMatch(byteIndex) {
  const row = Math.floor(byteIndex / state.rowWidth);
  scrollToRow(row);
}

function scrollToRow(row) {
  const targetScroll = row * state.ROW_HEIGHT;
  $hexViewport.scrollTop = Math.max(0, targetScroll - ($hexViewport.clientHeight / 2));
}

function prevMatch() {
  if (state.matches.length === 0) return;
  state.matchIndex = (state.matchIndex - 1 + state.matches.length) % state.matches.length;
  scrollToMatch(state.matches[state.matchIndex]);
  renderHexTable();
}

function nextMatch() {
  if (state.matches.length === 0) return;
  state.matchIndex = (state.matchIndex + 1) % state.matches.length;
  scrollToMatch(state.matches[state.matchIndex]);
  renderHexTable();
}

// ────────────────────────────────────────────────────────────────
// Copy / Export
// ────────────────────────────────────────────────────────────────

function getSelectedBytes() {
  if (state.selectedBytes.size === 0) return new Uint8Array(0);
  const sorted = [...state.selectedBytes].sort((a, b) => a - b);
  return state.editBytes.slice(sorted[0], sorted[sorted.length - 1] + 1);
}

function copyHex() {
  const bytes = getSelectedBytes();
  const hex = Array.from(bytes).map(toHex).join(' ');
  navigator.clipboard.writeText(hex).then(() => showToast(t('copied')));
}

function copyAscii() {
  const bytes = getSelectedBytes();
  const ascii = bytesToAscii(bytes);
  navigator.clipboard.writeText(ascii).then(() => showToast(t('copied')));
}

function exportDump() {
  if (!state.bytes) return;
  const { formatHex } = /** @type {any} */ ({ formatHex: _formatHex });
  const text = _formatHex(state.editBytes);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.fileName || 'dump') + '.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast(t('exportDone'));
}

// ────────────────────────────────────────────────────────────────
// formatHex local (to avoid circular import in main context)
// ────────────────────────────────────────────────────────────────

function _formatHex(bytes, offset = 0, width = state.rowWidth) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += width) {
    const rowBytes = bytes.slice(i, i + width);
    lines.push(formatRow(rowBytes, offset + i, width));
  }
  lines.push(toOffset(offset + bytes.length));
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────
// Byte editing
// ────────────────────────────────────────────────────────────────

function openEditModal(idx) {
  state.editOffset = idx;
  $editOffsetLabel.textContent = toOffset(idx);
  $editInput.value = toHex(state.editBytes[idx]);
  $editModal.classList.remove('hidden');
  $editInput.focus();
  $editInput.select();
}

function applyEdit() {
  const val = $editInput.value.trim();
  if (!/^[0-9a-fA-F]{1,2}$/.test(val)) return;
  const byte = parseInt(val, 16);
  state.editBytes[state.editOffset] = byte;
  $editModal.classList.add('hidden');
  renderHexTable();
  $downloadBtn.classList.remove('hidden');
}

function downloadModified() {
  const blob = new Blob([state.editBytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = state.fileName || 'modified.bin';
  a.click();
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────────────────────────
// Go to offset
// ────────────────────────────────────────────────────────────────

function gotoOffset() {
  const val = $gotoInput.value.trim();
  const offset = parseInt(val, 16);
  if (isNaN(offset) || !state.bytes || offset >= state.bytes.length) return;
  const row = Math.floor(offset / state.rowWidth);
  scrollToRow(row);
}

// ────────────────────────────────────────────────────────────────
// Toast
// ────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('visible'), 1800);
}

// ────────────────────────────────────────────────────────────────
// Virtual scroll handler
// ────────────────────────────────────────────────────────────────

function onScroll() {
  const scrollTop = $hexViewport.scrollTop;
  const newStart = Math.floor(scrollTop / state.ROW_HEIGHT);
  if (newStart !== state.visibleStart) {
    state.visibleStart = newStart;
    renderHexTable();
  }
}

// ────────────────────────────────────────────────────────────────
// Init
// ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  $dropzone        = document.getElementById('dropzone');
  $fileInput       = document.getElementById('file-input');
  $fileInfo        = document.getElementById('file-info');
  $infoName        = document.getElementById('info-name');
  $infoSize        = document.getElementById('info-size');
  $infoType        = document.getElementById('info-type');
  $infoMagic       = document.getElementById('info-magic');
  $searchInput     = document.getElementById('search-input');
  $searchHexBtn    = document.getElementById('search-mode-hex');
  $searchAsciiBtn  = document.getElementById('search-mode-ascii');
  $searchPrev      = document.getElementById('search-prev');
  $searchNext      = document.getElementById('search-next');
  $searchCount     = document.getElementById('search-count');
  $selInfo         = document.getElementById('sel-info');
  $copyHex         = document.getElementById('copy-hex');
  $copyAscii       = document.getElementById('copy-ascii');
  $exportBtn       = document.getElementById('export-btn');
  $downloadBtn     = document.getElementById('download-btn');
  $langBtn         = document.getElementById('lang-btn');
  $hexTable        = document.getElementById('hex-table-body');
  $scrollSpacer    = document.getElementById('scroll-spacer');
  $hexViewport     = document.getElementById('hex-viewport');
  $gotoInput       = document.getElementById('goto-input');
  $gotoBtn         = document.getElementById('goto-btn');
  $widthSelect     = document.getElementById('width-select');
  $editModal       = document.getElementById('edit-modal');
  $editInput       = document.getElementById('edit-input');
  $editApply       = document.getElementById('edit-apply');
  $editCancel      = document.getElementById('edit-cancel');
  $editOffsetLabel = document.getElementById('edit-offset-label');
  $toast           = document.getElementById('toast');

  applyTranslations();

  // Dropzone
  $dropzone.addEventListener('click', () => $fileInput.click());
  $dropzone.addEventListener('dragover', (e) => { e.preventDefault(); $dropzone.classList.add('drag-over'); });
  $dropzone.addEventListener('dragleave', () => $dropzone.classList.remove('drag-over'));
  $dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    $dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });
  $fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });

  // Search
  $searchInput.addEventListener('input', runSearch);
  $searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nextMatch();
  });
  $searchHexBtn.addEventListener('click', () => {
    state.searchMode = 'hex';
    $searchHexBtn.classList.add('active');
    $searchAsciiBtn.classList.remove('active');
    runSearch();
  });
  $searchAsciiBtn.addEventListener('click', () => {
    state.searchMode = 'ascii';
    $searchAsciiBtn.classList.add('active');
    $searchHexBtn.classList.remove('active');
    runSearch();
  });
  $searchPrev.addEventListener('click', prevMatch);
  $searchNext.addEventListener('click', nextMatch);

  // Selection actions
  $copyHex.addEventListener('click', copyHex);
  $copyAscii.addEventListener('click', copyAscii);
  $copyHex.disabled = true;
  $copyAscii.disabled = true;

  // Export / Download
  $exportBtn.addEventListener('click', exportDump);
  $downloadBtn.addEventListener('click', downloadModified);
  $downloadBtn.classList.add('hidden');

  // Language toggle
  $langBtn.addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'ja' : 'en';
    applyTranslations();
    renderFileInfo();
    updateSelectionUI();
  });

  // Goto
  $gotoBtn.addEventListener('click', gotoOffset);
  $gotoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') gotoOffset(); });

  // Width
  $widthSelect.addEventListener('change', () => {
    state.rowWidth = parseInt($widthSelect.value) || 16;
    if (state.bytes) {
      state.visibleStart = 0;
      $hexViewport.scrollTop = 0;
      renderHexTable();
    }
  });

  // Edit modal
  $editApply.addEventListener('click', applyEdit);
  $editCancel.addEventListener('click', () => $editModal.classList.add('hidden'));
  $editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyEdit();
    if (e.key === 'Escape') $editModal.classList.add('hidden');
  });

  // Virtual scroll
  $hexViewport.addEventListener('scroll', onScroll);

  // Mouse up global (end selection)
  document.addEventListener('mouseup', () => { state.isSelecting = false; });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ($editModal && !$editModal.classList.contains('hidden')) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'f') { e.preventDefault(); $searchInput.focus(); }
    }
  });

  // Resize — recalc visible rows
  const ro = new ResizeObserver(() => {
    if ($hexViewport) {
      state.VISIBLE_ROWS = Math.ceil($hexViewport.clientHeight / state.ROW_HEIGHT) + 4;
      renderHexTable();
    }
  });
  ro.observe(document.body);
});
