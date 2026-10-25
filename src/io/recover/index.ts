/**
 * Damaged-document recovery, following the socrtwo/wordrecovery-SF pipeline:
 *
 *   0. S2 File Identifier: magic-number identification, separation of embedded/concatenated
 *      foreign files, and choice of the bytes to repair.
 *   1. Standard parse (JSZip).
 *   2. Byte-level ZIP recovery (local-header scan + ImmortalInflate shift sweep).
 *   3. DOCX XML tag fixes (InvalidTags -> ValidTags), then XML healing.
 *   4. RTF extraction.
 *   5. Word 97-2003 binary text (piece table) - added for .doc/.wbk/.asd files.
 *   6. Strings scan (last resort).
 *
 * When the package can be rebuilt, the repaired parts are re-zipped and imported with the
 * normal converter, so formatting, tables, images and notes survive wherever their parts did.
 * Otherwise the best recovered text becomes a plain document.
 */
import JSZip from 'jszip';
import type { Node as PMNode } from 'prosemirror-model';
import { schema } from '../../editor/schema';
import { analyze, type Identification, type Segment } from './fileid';
import { crc32 } from './inflate';
import { extractDoc97, isOle2, readCfb } from './doc97';
import {
  scanZipBytes, repairXmlPart, applyDocumentXmlTagFixes, extractTextFromWordXml, extractTextFromOdtXml,
  extractTextFromRtf, stringsScan, isWellFormed, textQuality, findDamageCut, balanceXml,
} from './salvage';

export type MethodStatus = 'success' | 'partial' | 'failed' | 'skipped';

export interface MethodResult {
  key: 'standard' | 'bytes' | 'tags' | 'rtf' | 'doc97' | 'legacy' | 'strings';
  name: string;
  desc: string;
  status: MethodStatus;
  detail: string;
  text: string;
}

export interface RepairedPackage {
  kind: 'docx' | 'odt';
  data: ArrayBuffer;
  parts: number;
  repairedParts: string[];
  salvagedParts: string[];
  lostParts: string[];
}

export interface RecoveryReport {
  fileName: string;
  identified: Identification;
  foreign: Segment[];
  methods: MethodResult[];
  bestKey: MethodResult['key'] | null;
  bestName: string;
  bestText: string;
  repaired: RepairedPackage | null;
  mode: 'formatted' | 'text' | 'none';
  doc: PMNode | null;
  notes: string[];
}

export interface RecoverOptions {
  /** Apply the tag fixes and rebuild even when the file opens normally (Open and Repair). */
  force?: boolean;
  /** Skip the formatted rebuild and return text only (Recover Text from Any File). */
  textOnly?: boolean;
  /** Format id from content sniffing; selects a format-aware text extractor for legacy files. */
  format?: string;
}

const DOCX_CT: Record<string, string> = {
  'word/document.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
  'word/styles.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml',
  'word/settings.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml',
  'word/numbering.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml',
  'word/footnotes.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml',
  'word/endnotes.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml',
  'word/comments.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml',
  'word/fontTable.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml',
  'word/webSettings.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml',
  'word/theme/theme1.xml': 'application/vnd.openxmlformats-officedocument.theme+xml',
  'docProps/core.xml': 'application/vnd.openxmlformats-package.core-properties+xml',
  'docProps/app.xml': 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
};
const DOC_REL_TYPES: Record<string, string> = {
  'styles.xml': 'styles', 'settings.xml': 'settings', 'numbering.xml': 'numbering', 'footnotes.xml': 'footnotes',
  'endnotes.xml': 'endnotes', 'comments.xml': 'comments', 'fontTable.xml': 'fontTable', 'webSettings.xml': 'webSettings', 'theme/theme1.xml': 'theme',
};
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const IMAGE_CT: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf', svg: 'image/svg+xml', webp: 'image/webp' };

const dec = (u8: Uint8Array) => {
  if (u8[0] === 0xff && u8[1] === 0xfe) return new TextDecoder('utf-16le').decode(u8.subarray(2));
  if (u8[0] === 0xfe && u8[1] === 0xff) return new TextDecoder('utf-16be').decode(u8.subarray(2));
  return new TextDecoder('utf-8', { fatal: false }).decode(u8);
};
const enc = (s: string) => new TextEncoder().encode(s);
function hasLocalHeader(u8: Uint8Array): boolean {
  for (let i = 0; i < u8.length - 30; i++) if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 3 && u8[i + 3] === 4 && u8[i + 26] > 0) return true;
  return false;
}
const isXmlName = (n: string) => /\.(xml|rels|vml)$/i.test(n);
const plural = (n: number, w: string) => `${n.toLocaleString()} ${n === 1 ? w : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's'}`;

/** Run every recovery method and assemble the best document. */
export async function recoverDocument(data: ArrayBuffer, fileName: string, opts: RecoverOptions = {}): Promise<RecoveryReport> {
  const raw = new Uint8Array(data);
  const id = analyze(raw, fileName);
  const u8 = id.proceedBytes;
  const report: RecoveryReport = {
    fileName, identified: id.primary, foreign: id.foreign, methods: [], bestKey: null, bestName: '', bestText: '',
    repaired: null, mode: 'none', doc: null, notes: [],
  };
  if (!raw.length) { report.notes.push('The file is empty (0 bytes). Nothing can be recovered from it.'); return report; }
  if (id.multiple) report.notes.push(`The file contains ${plural(id.segments.length, 'separate piece')}. ${id.foreign.length ? `${plural(id.foreign.length, 'piece')} of another kind were set aside.` : ''}`.trim());
  if ((id.matching[0]?.offset ?? 0) > 0) report.notes.push(`Repair ran on the ${id.matching[0].description} found at byte ${id.matching[0].offset.toLocaleString()}.`);

  const kindGuess = id.matching[0]?.ext || id.primary.ext;
  const isZipLike = (u8[0] === 0x50 && u8[1] === 0x4b) || ['docx', 'ooxml', 'odt', 'zip'].includes(kindGuess) || /\.(docx|docm|dotx|dotm|odt|ott)$/i.test(fileName) || hasLocalHeader(u8);

  // ---- Method 1: standard parse
  const parts = new Map<string, Uint8Array>();
  const damagedInZip: string[] = [];
  /** Parts whose bytes are known to be partly wrong (CRC mismatch or a decode error). */
  const corruptParts = new Set<string>();
  const m1: MethodResult = { key: 'standard', name: 'Standard parse', desc: 'Open the file as a normal Office package and read the text of the main part.', status: 'failed', detail: '', text: '' };
  if (isZipLike && !isOle2(u8)) {
    try {
      const zip = await JSZip.loadAsync(u8);
      for (const f of Object.values(zip.files)) {
        if (f.dir) continue;
        try {
          const bytes = await f.async('uint8array');
          // JSZip does not verify CRCs by default, and damaged deflate data often inflates without error.
          // JSZip reads the CRC as a signed 32-bit integer; compare unsigned.
          const want = (f as any)._data?.crc32;
          if (typeof want === 'number' && want !== 0 && crc32(bytes) !== want >>> 0) { damagedInZip.push(f.name); corruptParts.add(f.name); }
          parts.set(f.name, bytes);
        } catch { damagedInZip.push(f.name); }
      }
      const main = parts.get('word/document.xml') || parts.get('content.xml');
      m1.text = main ? (parts.has('content.xml') && !parts.has('word/document.xml') ? extractTextFromOdtXml(dec(main)) : extractTextFromWordXml(dec(main))) : '';
      m1.status = m1.text && !damagedInZip.length ? 'success' : m1.text || parts.size ? 'partial' : 'failed';
      m1.detail = `${plural(parts.size, 'part')} read${damagedInZip.length ? `, ${plural(damagedInZip.length, 'damaged part')}: ${damagedInZip.slice(0, 4).join(', ')}` : ''}; ${plural(m1.text.length, 'character')} of text.`;
    } catch (e: any) {
      m1.detail = e?.message || String(e);
    }
  } else { m1.status = 'skipped'; m1.detail = 'Not a ZIP-based package.'; }
  report.methods.push(m1);

  // ---- Method 2: byte-level ZIP recovery
  const m2: MethodResult = { key: 'bytes', name: 'Byte-level ZIP recovery', desc: 'Walk PK\\x03\\x04 local headers, ignoring the central directory, and inflate each entry with a bit-shift sweep (0-47) using a decoder that keeps everything it can decode.', status: 'skipped', detail: 'Not needed: every part was readable.', text: '' };
  const salvaged: string[] = [];
  if (isZipLike && !isOle2(u8) && (opts.force || m1.status !== 'success')) {
    const scanned = scanZipBytes(u8);
    let partial = 0;
    for (const [name, e] of scanned) {
      if (e.isCorrupt) partial++;
      if (!e.isCorrupt && damagedInZip.includes(name)) corruptParts.delete(name);
      if (e.isCorrupt && (!parts.has(name) || damagedInZip.includes(name))) corruptParts.add(name);
      // Prefer the CRC-checked copy JSZip read; take the salvaged copy for missing or unreadable parts.
      if (!parts.has(name) || damagedInZip.includes(name)) { parts.set(name, e.data); salvaged.push(name); }
    }
    const main = scanned.get('word/document.xml') || scanned.get('content.xml');
    if (main) m2.text = scanned.has('content.xml') && !scanned.has('word/document.xml') ? extractTextFromOdtXml(dec(main.data)) : extractTextFromWordXml(dec(main.data));
    m2.status = !scanned.size ? 'failed' : main && m2.text ? 'success' : 'partial';
    m2.detail = scanned.size
      ? `Recovered ${plural(scanned.size, 'entry')}${partial ? ` (${partial} truncated)` : ''}${main ? `, including the main part${main.isCorrupt ? ' (partial)' : ''}` : ', but not the main part'}.`
      : 'No local file headers found.';
  } else if (!isZipLike || isOle2(u8)) { m2.detail = 'Not a ZIP-based package.'; }
  report.methods.push(m2);

  // ---- Method 3: tag fixes + XML healing on every XML part
  const m3: MethodResult = { key: 'tags', name: 'XML tag fixes and healing', desc: 'Apply the original Word Recovery InvalidTags -> ValidTags substitutions to document.xml, then heal or rebuild any XML part that does not parse.', status: 'skipped', detail: 'No XML parts to check.', text: '' };
  const repairedParts: string[] = [], lostParts: string[] = [];
  let tagChanges = 0;
  // A damaged main part: keep the consistent prefix and set aside the text decoded after the damage.
  let unverified = '';
  let mainDamaged = false;
  for (const main of ['word/document.xml', 'content.xml']) {
    const bytes = parts.get(main);
    if (!bytes || !corruptParts.has(main)) continue;
    mainDamaged = true;
    const xml = dec(bytes);
    const cut = findDamageCut(xml, main === 'content.xml' ? '</text:p>' : '</w:p>');
    if (cut > 0) {
      const tail = xml.slice(cut);
      unverified = main === 'content.xml' ? extractTextFromOdtXml(tail) : extractTextFromWordXml(tail);
      parts.set(main, enc(xml.slice(0, cut)));
      repairedParts.push(`${main} (cut at the damaged area, byte ${cut.toLocaleString()})`);
      if (unverified) report.notes.push(`Text decoded after the damaged area (${plural(unverified.length, 'character')}) is unreliable and was placed at the end, marked as unverified.`);
    }
  }
  for (const [name, bytes] of [...parts]) {
    if (!isXmlName(name)) continue;
    const text = dec(bytes);
    if (/(^|\/)document\.xml$/.test(name)) tagChanges += applyDocumentXmlTagFixes(text).changes;
    if (!opts.force && isWellFormed(text)) continue;
    const ok = repairXmlPart(name, text, opts.force);
    if (!ok) { lostParts.push(name); parts.delete(name); continue; }
    if (ok.xml !== text) { parts.set(name, enc(ok.xml)); repairedParts.push(`${name} (${ok.steps.join(', ') || 'normalized'})`); }
  }
  const mainXml = parts.get('word/document.xml') || parts.get('content.xml');
  if (mainXml) {
    m3.text = parts.has('word/document.xml') ? extractTextFromWordXml(dec(mainXml)) : extractTextFromOdtXml(dec(mainXml));
    m3.status = repairedParts.length || tagChanges ? 'success' : 'partial';
    m3.detail = `${tagChanges ? `${plural(tagChanges, 'tag substitution')}; ` : 'No invalid tag patterns; '}${repairedParts.length ? `repaired ${repairedParts.length} XML part(s)` : 'all XML parts parse'}${lostParts.length ? `; unrepairable: ${lostParts.join(', ')}` : ''}.`;
  } else if (parts.size) { m3.status = 'failed'; m3.detail = 'The main document part was not recovered.'; }
  report.methods.push(m3);

  // ---- Method 4: RTF
  const m4: MethodResult = { key: 'rtf', name: 'RTF extraction', desc: 'Strip RTF control words and decode hex and Unicode escapes.', status: 'skipped', detail: 'The file does not start with {\\rtf.', text: '' };
  if (u8[0] === 0x7b && u8[1] === 0x5c && u8[2] === 0x72) {
    m4.text = extractTextFromRtf(u8);
    m4.status = m4.text ? 'success' : 'failed';
    m4.detail = `${plural(m4.text.length, 'character')} extracted.`;
  }
  report.methods.push(m4);

  // ---- Method 5: Word 97-2003 binary
  const m5: MethodResult = { key: 'doc97', name: 'Word 97-2003 binary text', desc: 'Read the compound file, the FIB and the piece table, and decode the text pieces (CP1252 or UTF-16).', status: 'skipped', detail: 'Not a Word 97-2003 compound file.', text: '' };
  if (isOle2(u8)) {
    try {
      const d = extractDoc97(u8);
      if (!d && readCfb(u8)?.streams.has('EncryptedPackage')) {
        m5.status = 'failed';
        m5.detail = 'This is a password-protected Office Open XML file (an encrypted package inside a compound file).';
        report.notes.push('The file is password-protected. Open it with the password in the program that created it, remove the password, and save it again.');
      } else if (!d) { m5.status = 'failed'; m5.detail = 'No WordDocument stream was found in the compound file.'; }
      else if (d.encrypted) { m5.status = 'failed'; m5.detail = 'The document is encrypted (password-protected). Its text cannot be read without the password.'; report.notes.push('This .doc is password-protected; only unencrypted metadata is readable.'); }
      else {
        const extra = [['Footnotes', d.footnotes], ['Comments', d.comments], ['Endnotes', d.endnotes], ['Text boxes', d.textboxes]].filter(([, t]) => t);
        m5.text = [d.main, ...extra.map(([h, t]) => `\n${h}\n${t}`)].join('\n').trim();
        m5.status = m5.text ? (d.damaged.length || d.method !== 'piece table' ? 'partial' : 'success') : 'failed';
        m5.detail = `${plural(m5.text.length, 'character')} via ${d.method}${d.damaged.length ? `; damaged streams: ${d.damaged.join(', ')}` : ''}.`;
      }
    } catch (e: any) { m5.status = 'failed'; m5.detail = e?.message || String(e); }
  }
  report.methods.push(m5);

  // ---- Method 5b: format-aware text from a legacy word processor file
  const m5b: MethodResult = { key: 'legacy', name: 'Legacy word processor text', desc: 'Decode the text runs of the identified legacy format (WordPerfect, Works, Write, WordStar, Hangul…) without its formatting.', status: 'skipped', detail: 'Not a legacy word processor file.', text: '' };
  try {
    const { legacyExtractor } = await import('../legacy/extract');
    const fmt = opts.format || (await import('../sniff')).sniff(u8, fileName).format;
    const ex = legacyExtractor(fmt);
    if (ex) {
      m5b.text = (await ex(u8)).trim();
      m5b.status = m5b.text ? 'partial' : 'failed';
      m5b.detail = m5b.text ? `${plural(m5b.text.length, 'character')} decoded as ${fmt}.` : 'No text could be decoded.';
    }
  } catch (e: any) { m5b.status = 'failed'; m5b.detail = e?.message || String(e); }
  report.methods.push(m5b);

  // ---- Method 6: strings scan
  const m6: MethodResult = { key: 'strings', name: 'Strings scan (last resort)', desc: 'Collect runs of printable ASCII and UTF-16LE text from the raw bytes. Works on any file, including fragments and renamed temp files.', status: 'failed', detail: '', text: '' };
  // Compressed packages hold no plain text; scan the decompressed main part instead of the archive bytes.
  const scanSource = mainXml && !isOle2(u8) ? null : u8;
  m6.text = scanSource ? stringsScan(scanSource) : '';
  if (!scanSource) { m6.status = 'skipped'; m6.detail = 'The XML methods recovered the main part.'; }
  else { m6.status = m6.text ? 'partial' : 'failed'; m6.detail = m6.text ? `${plural(m6.text.split('\n').length, 'text run')} (${plural(m6.text.length, 'character')}).` : 'No printable text runs found.'; }
  report.methods.push(m6);

  // ---- Pick the best text (original weighting, plus a prose-likeness factor for binary sources)
  const weight: Record<MethodResult['key'], number> = { standard: 2, tags: 1.5, bytes: 1.4, doc97: 1.8, legacy: 1.7, rtf: 1, strings: 0.5 };
  // The strings scan is the last resort: it competes only when no structured method found text.
  const structured = report.methods.filter((m) => m.text && m.key !== 'strings');
  const pool = structured.length ? structured : report.methods.filter((m) => m.text);
  const scored = pool.map((m) => ({ m, score: m.text.length * weight[m.key] * (m.key === 'strings' || m.key === 'doc97' || m.key === 'legacy' ? 0.3 + textQuality(m.text) : 1) }));
  scored.sort((a, b) => b.score - a.score);
  if (scored[0]) { report.bestKey = scored[0].m.key; report.bestName = scored[0].m.name; report.bestText = scored[0].m.text; }

  // ---- Rebuild the package and import it with the normal converter
  const isOdt = parts.has('content.xml') && !parts.has('word/document.xml');
  if (!opts.textOnly && mainXml) {
    try {
      if (mainDamaged) appendUnverified(parts, isOdt, unverified);
      const pkg = isOdt ? await buildOdt(parts) : await buildDocx(parts, fileName);
      report.repaired = { kind: isOdt ? 'odt' : 'docx', data: pkg, parts: parts.size, repairedParts, salvagedParts: salvaged, lostParts: [...new Set([...lostParts, ...damagedInZip.filter((n) => !parts.has(n))])] };
      const doc = isOdt ? await (await import('../odt')).importOdt(pkg, fileName) : await (await import('../docx-import')).importDocx(pkg, fileName);
      const got = doc.textContent.replace(/\s+/g, '').length;
      const xmlBest = Math.max(m1.text.length, m2.text.length, m3.text.length);
      const want = xmlBest ? xmlBest : report.bestText.length;
      if (got > 0 || !report.bestText) {
        report.doc = doc;
        report.mode = 'formatted';
        if (want && got < want * 0.4) report.notes.push('The formatted rebuild holds less text than the raw recovery. Use "Open recovered text" in the report if text is missing.');
      }
    } catch (e: any) {
      report.notes.push(`The package could not be rebuilt (${e?.message || e}); opening recovered text instead.`);
    }
  }
  if (!report.doc && report.bestText) {
    report.doc = textToDoc(report.bestText, fileName);
    report.mode = 'text';
  }
  if (report.mode === 'text' && report.bestKey === 'strings') report.notes.push('Only loose text fragments could be recovered. Expect stray characters and lost paragraph order.');
  return report;
}

const xmlEsc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Mark where the damage begins with a red notice at the end of the recovered body, followed by
 * any text decoded after the damage (unverified).
 */
function appendUnverified(parts: Map<string, Uint8Array>, isOdt: boolean, text: string): void {
  const name = isOdt ? 'content.xml' : 'word/document.xml';
  const xml = dec(parts.get(name)!);
  const notice = text
    ? '[Anne\'s Pen: the file is damaged here. The text below was decoded after the damage and is unverified; check it against another copy. The text just above may contain garbled words.]'
    : '[Anne\'s Pen: the file is damaged from this point, and the rest of the document could not be recovered. The text just above may contain garbled words.]';
  const lines = [notice, ...text.split('\n').filter((l) => l.trim())];
  const paras = isOdt
    ? lines.map((l) => `<text:p>${xmlEsc(l)}</text:p>`).join('')
    : lines.map((l, i) => `<w:p><w:r><w:rPr>${i ? '' : '<w:b/>'}<w:color w:val="C00000"/></w:rPr><w:t xml:space="preserve">${xmlEsc(l)}</w:t></w:r></w:p>`).join('');
  // Insert before the body's final section properties (DOCX) or before the body end.
  const close = isOdt ? '</office:text>' : '</w:body>';
  let at = xml.lastIndexOf(close);
  if (!isOdt && at > 0) { const sp = xml.lastIndexOf('<w:sectPr', at); if (sp > xml.lastIndexOf('</w:p>', at)) at = sp; }
  parts.set(name, enc(at > 0 ? xml.slice(0, at) + paras + xml.slice(at) : balanceXml(xml + paras)));
}

/** A plain document from recovered text: one paragraph per line, \f as a page break. */
export function textToDoc(text: string, title = ''): PMNode {
  const S = schema;
  const blocks: PMNode[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (const line of lines) {
    const pieces = line.split('\f');
    pieces.forEach((p, i) => {
      if (i > 0) blocks.push(S.nodes.page_break.create());
      const clean = p.replace(/[\x00-\x08\x0b\x0e-\x1f]/g, '');
      blocks.push(S.nodes.paragraph.create(null, clean ? S.text(clean) : null));
    });
  }
  while (blocks.length > 1 && blocks[blocks.length - 1].type === S.nodes.paragraph && !blocks[blocks.length - 1].content.size) blocks.pop();
  if (!blocks.length) blocks.push(S.nodes.paragraph.create());
  const doc = S.nodes.doc.createAndFill(null, blocks)!;
  if (title) {
    try {
      const settings = { ...(doc.attrs.settings || {}) };
      settings.properties = { ...(settings.properties || {}), title: title.replace(/\.[^.]+$/, '') };
      return S.nodes.doc.create({ ...doc.attrs, settings }, doc.content);
    } catch { /* settings shape is normalized later */ }
  }
  return doc;
}

async function buildDocx(parts: Map<string, Uint8Array>, fileName: string): Promise<ArrayBuffer> {
  void fileName;
  const zip = new JSZip();
  for (const [name, data] of parts) zip.file(name, data);
  const names = [...parts.keys()];
  const has = (n: string) => parts.has(n);
  if (!has('[Content_Types].xml')) {
    const exts = new Set(names.map((n) => n.slice(n.lastIndexOf('.') + 1).toLowerCase()).filter((e) => IMAGE_CT[e]));
    const overrides = names.filter((n) => DOCX_CT[n] || /^word\/(header|footer)\d+\.xml$/.test(n)).map((n) => {
      const ct = DOCX_CT[n] || (n.includes('header') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml');
      return `<Override PartName="/${n}" ContentType="${ct}"/>`;
    });
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...exts].map((e) => `<Default Extension="${e}" ContentType="${IMAGE_CT[e]}"/>`).join('')}${overrides.join('')}</Types>`);
  }
  if (!has('_rels/.rels')) {
    const extra = [has('docProps/core.xml') ? `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` : '', has('docProps/app.xml') ? `<Relationship Id="rId3" Type="${REL_NS}/extended-properties" Target="docProps/app.xml"/>` : ''].join('');
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="word/document.xml"/>${extra}</Relationships>`);
  }
  if (!has('word/_rels/document.xml.rels')) {
    let n = 1;
    const rels = Object.entries(DOC_REL_TYPES).filter(([t]) => has('word/' + t)).map(([t, type]) => `<Relationship Id="rIdQ${n++}" Type="${REL_NS}/${type}" Target="${t}"/>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_REL_NS}">${rels.join('')}</Relationships>`);
  }
  if (!has('word/styles.xml')) zip.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>');
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 1 }, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function buildOdt(parts: Map<string, Uint8Array>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  for (const [name, data] of parts) if (name !== 'mimetype') zip.file(name, data);
  if (!parts.has('META-INF/manifest.xml')) {
    const entries = [...parts.keys()].filter((n) => n !== 'mimetype' && !n.startsWith('META-INF/')).map((n) => `<manifest:file-entry manifest:full-path="${n}" manifest:media-type="${n.endsWith('.xml') ? 'text/xml' : ''}"/>`);
    zip.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>${entries.join('')}</manifest:manifest>`);
  }
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 1 }, mimeType: 'application/vnd.oasis.opendocument.text' });
}

/** Word 97-2003 import: text and paragraph structure (formatting is not read). */
export async function importDoc97(data: ArrayBuffer, name: string): Promise<PMNode> {
  const d = extractDoc97(new Uint8Array(data));
  if (!d) throw new Error('Not a Word 97-2003 document: no WordDocument stream');
  if (d.encrypted) throw new Error('This document is password-protected (encrypted)');
  if (!d.main && !d.footnotes) throw new Error('No text could be read from the WordDocument stream');
  if (d.damaged.length) throw new Error(`Damaged compound file (${d.damaged.join(', ')})`);
  const extra = [['Footnotes', d.footnotes], ['Comments', d.comments], ['Endnotes', d.endnotes], ['Text boxes', d.textboxes]].filter(([, t]) => t);
  return textToDoc([d.main, ...extra.map(([h, t]) => `\n${h}\n${t}`)].join('\n'), name);
}
