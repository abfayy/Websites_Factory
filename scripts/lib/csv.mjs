// Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, CRLF/LF, embedded newlines, BOM).
// Google Sheets "Download as CSV" output is what we feed it.
// Author/watermark: abdullah fayyaz
export function parseCsv(text) {
  const s = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

/** 2-D array (header row first, as returned by the Sheets API / connector) -> array of objects keyed by header. */
export function rowsToObjects(rows) {
  const [head, ...rest] = rows;
  if (!head) return [];
  const keys = head.map((h) => String(h ?? '').trim());
  return rest
    .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, String(r[i] ?? '').trim()])));
}

/** CSV text -> array of objects keyed by header. */
export function csvToObjects(text) {
  return rowsToObjects(parseCsv(text));
}
