import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import JSZip from 'jszip';
import { recoverDocument, importDoc97 } from '../../src/io/recover';
import { immortalInflate, crc32 } from '../../src/io/recover/inflate';
import { balanceXml, healXMLStrict, applyDocumentXmlTagFixes, isWellFormed, extractTextFromRtf, stringsScan, scanZipBytes } from '../../src/io/recover/salvage';
import { extractDoc97, cleanWordText } from '../../src/io/recover/doc97';
import { analyze } from '../../src/io/recover/fileid';
import { importFile } from '../../src/io';

const F = resolve(__dirname, '../fixtures/recovery');
const docx = new Uint8Array(readFileSync(resolve(F, 'sample.docx')));
const doc = new Uint8Array(readFileSync(resolve(F, 'sample.doc')));
const buf = (u8: Uint8Array) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
const SAMPLE = 'The quick brown fox jumps over the lazy dog.';

function entryData(u8: Uint8Array, want: string): { at: number; size: number } {
  for (let i = 0; i < u8.length - 30; i++) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 3 && u8[i + 3] === 4) {
      const nl = u8[i + 26] | (u8[i + 27] << 8), el = u8[i + 28] | (u8[i + 29] << 8);
      if (new TextDecoder().decode(u8.slice(i + 30, i + 30 + nl)) === want) {
        return { at: i + 30 + nl + el, size: (u8[i + 18] | (u8[i + 19] << 8) | (u8[i + 20] << 16) | (u8[i + 21] << 24)) >>> 0 };
      }
    }
  }
  throw new Error('entry not found');
}

describe('ImmortalInflate', () => {
  const text = 'Lorem ipsum dolor sit amet, '.repeat(400) + 'END';
  const raw = new Uint8Array(deflateRawSync(Buffer.from(text)));
  it('decodes a clean stream exactly', () => {
    const r = immortalInflate(raw);
    expect(r.isCorrupt).toBe(false);
    expect(new TextDecoder().decode(r.data)).toBe(text);
  });
  it('returns the decoded prefix of a truncated stream instead of throwing', () => {
    const r = immortalInflate(raw.slice(0, Math.floor(raw.length / 2)));
    expect(r.isCorrupt).toBe(true);
    expect(text.startsWith(new TextDecoder().decode(r.data).slice(0, 50))).toBe(true);
  });
  it('never throws on garbage', () => {
    const junk = new Uint8Array(5000).map((_, i) => (i * 2654435761) >>> 24);
    expect(() => immortalInflate(junk, { resync: true })).not.toThrow();
  });
  it('computes standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('XML repair', () => {
  it('balanceXml closes truncated and mis-nested markup and declares lost prefixes', () => {
    const broken = '<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>A & B</w:r></w:t><w:p><w14:x/><w:r><w:t>cut off he';
    expect(isWellFormed(broken)).toBe(false);
    const fixed = balanceXml(broken);
    expect(isWellFormed(fixed)).toBe(true);
    expect(fixed).toContain('A &amp; B');
    expect(fixed).toContain('cut off he');
  });
  it('healXMLStrict closes a cut-off attribute and tag', () => {
    expect(isWellFormed(healXMLStrict('<a><b x="1'))).toBe(true);
  });
  it('applies the InvalidTags substitutions without touching valid AlternateContent', () => {
    const bad = '<mc:AlternateContent><mc:Choice Requires="wps"><m:oMath>';
    expect(applyDocumentXmlTagFixes(bad).xml).toBe('<m:oMath><mc:AlternateContent><mc:Choice Requires="wps">');
    const good = '<mc:AlternateContent><mc:Choice Requires="wps"><w:drawing/></mc:Choice><mc:Fallback><w:pict/></mc:Fallback></mc:AlternateContent>';
    expect(applyDocumentXmlTagFixes(good).changes).toBe(0);
  });
});

describe('text extractors', () => {
  it('RTF: control words, \\uN with skip, \\binN, ignorable destinations', () => {
    const rtf = '{\\rtf1\\ansi{\\fonttbl{\\f0 Times;}}{\\*\\generator X;}\\uc1 Caf\\u233?\\par Next\\tab x\\bin3 abcdone}';
    expect(extractTextFromRtf(rtf)).toBe('Café\nNext\txdone');
  });
  it('strings scan finds ASCII and UTF-16LE runs', () => {
    const u16 = new Uint8Array([...'Hello world'].flatMap((c) => [c.charCodeAt(0), 0]));
    const blob = new Uint8Array([0, 1, 2, ...new TextEncoder().encode('ascii text here'), 0, 3, ...u16]);
    const s = stringsScan(blob);
    expect(s).toContain('ascii text here');
    expect(s).toContain('Hello world');
  });
  it('Word binary specials: fields keep results, cells become tabs, rows newlines', () => {
    expect(cleanWordText('a\x13 PAGE \x141\x15b\rc\x07d\x07\x07')).toBe('a1b\nc\td\n');
  });
});

describe('S2 file identification', () => {
  it('identifies DOCX, DOC and separates an appended PDF', () => {
    expect(analyze(docx).primary.ext).toBe('docx');
    expect(analyze(doc).primary.ext).toBe('doc');
    const pdf = new TextEncoder().encode('%PDF-1.4\n%%EOF');
    const fused = new Uint8Array(docx.length + pdf.length);
    fused.set(docx); fused.set(pdf, docx.length);
    const r = analyze(fused, 'x.docx');
    expect(r.foreign.map((s) => s.ext)).toEqual(['pdf']);
    expect(r.proceedBytes.length).toBe(docx.length);
  });
  it('skips leading junk and repairs the document segment', () => {
    const junk = new Uint8Array(500).fill(0x41);
    const c = new Uint8Array(junk.length + docx.length);
    c.set(junk); c.set(docx, junk.length);
    expect(analyze(c).proceedBytes[0]).toBe(0x50);
  });
});

describe('Word 97-2003 binary', () => {
  it('reads text through the piece table', () => {
    const d = extractDoc97(doc)!;
    expect(d.method).toBe('piece table');
    expect(d.main).toContain(SAMPLE);
    expect(d.main).toContain('Ελληνικά');
    expect(d.main).toContain('Alpha\tBeta');
  });
  it('imports .doc through importFile', async () => {
    const { doc: pm, format } = await importFile(buf(doc), 'old.doc');
    expect(format.id).toBe('doc');
    expect(pm.textContent).toContain(SAMPLE);
  });
  it('survives a destroyed FAT by assuming contiguous sectors', () => {
    const c = doc.slice();
    for (let i = 512; i < 1024; i++) c[i] = 0xff;
    expect(extractDoc97(c)!.main).toContain(SAMPLE);
  });
  it('rejects a damaged compound file in normal import so recovery can take over', async () => {
    const c = doc.slice();
    for (let i = 512; i < 1024; i++) c[i] = 0xff;
    await expect(importDoc97(buf(c), 'x.doc')).rejects.toThrow();
    const { doc: pm, recovery } = await importFile(buf(c), 'x.doc');
    expect(recovery).toBeTruthy();
    expect(pm.textContent).toContain(SAMPLE);
  });
});

describe('DOCX recovery pipeline', () => {
  const cases: [string, Uint8Array][] = [
    ['truncated to 70%', docx.slice(0, Math.floor(docx.length * 0.7))],
    ['missing end-of-central-directory', (() => { const c = docx.slice(); c.fill(0, c.length - 22); return c; })()],
    ['central directory cut off', (() => { const k = docx.findIndex((_, i) => docx[i] === 0x50 && docx[i + 1] === 0x4b && docx[i + 2] === 1 && docx[i + 3] === 2); return docx.slice(0, k); })()],
  ];
  for (const [label, bytes] of cases) {
    it(`recovers formatted content: ${label}`, async () => {
      const r = await recoverDocument(buf(bytes), 'x.docx');
      expect(r.mode).toBe('formatted');
      expect(r.doc!.textContent).toContain(SAMPLE);
      expect(r.methods.find((m) => m.key === 'standard')!.status).toBe('failed');
      expect(r.methods.find((m) => m.key === 'bytes')!.status).toBe('success');
      expect(r.repaired?.kind).toBe('docx');
    });
  }

  it('opens a damaged .docx through importFile with a report, and the rebuilt package is valid', async () => {
    const bytes = docx.slice(0, Math.floor(docx.length * 0.7));
    const res = await importFile(buf(bytes), 'damaged.docx');
    expect(res.recovery?.mode).toBe('formatted');
    const zip = await JSZip.loadAsync(res.recovery!.repaired!.data);
    expect(zip.file('word/document.xml')).toBeTruthy();
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
  });

  it('repairs malformed document.xml (mis-nesting, bare ampersand, truncation)', async () => {
    const zip = await JSZip.loadAsync(docx);
    const xml = await zip.file('word/document.xml')!.async('string');
    const broken = xml.replace(SAMPLE, 'Fish & chips </w:r>' + SAMPLE).slice(0, xml.length - 200);
    zip.file('word/document.xml', broken);
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const res = await importFile(buf(bytes), 'bad.docx');
    expect(res.recovery).toBeTruthy();
    expect(res.doc.textContent).toContain('Fish & chips');
  });

  it('detects CRC damage that inflates without error and marks the tail unverified', async () => {
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    let body = '';
    for (let i = 1; i <= 1500; i++) body += `<w:p><w:r><w:t>Paragraph ${i} of the long recovery test document.</w:t></w:r></w:p>`;
    const z = new JSZip();
    z.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`);
    const u8 = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const { at, size } = entryData(u8, 'word/document.xml');
    const c = u8.slice();
    c.fill(0, at + Math.floor(size * 0.5), at + Math.floor(size * 0.5) + 30);
    const r = await recoverDocument(buf(c), 'big.docx');
    expect(r.doc!.textContent).toContain('Paragraph 1 of the long');
    expect(r.methods.find((m) => m.key === 'standard')!.detail).toMatch(/damaged part/);
  });

  it('local-header scan finds every entry of a healthy package', () => {
    expect(scanZipBytes(docx).has('word/document.xml')).toBe(true);
  });

  it('falls back to text for RTF and arbitrary bytes, and reports an empty file', async () => {
    const rtf = await recoverDocument(buf(new TextEncoder().encode('{\\rtf1 Hello\\par World}')), 'a.rtf');
    expect(rtf.bestKey).toBe('rtf');
    expect(rtf.doc!.textContent).toBe('HelloWorld');
    const empty = await recoverDocument(new ArrayBuffer(0), 'zero.docx');
    expect(empty.doc).toBeNull();
    expect(empty.notes[0]).toMatch(/empty/);
  });

  it('Open and Repair (force) leaves a healthy file intact', async () => {
    const r = await recoverDocument(buf(docx), 'ok.docx', { force: true });
    expect(r.mode).toBe('formatted');
    expect(r.doc!.textContent).toContain(SAMPLE);
  });
});

describe('damaged deflate inside an intact archive', () => {
  // Same shape as real-world damage: the ZIP structure is fine, one part's compressed data is not.
  async function damagedPackage() {
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    let body = '';
    for (let i = 1; i <= 400; i++) body += `<w:p><w:r><w:t>Paragraph ${i} of a document whose middle is damaged.</w:t></w:r></w:p>`;
    const z = await JSZip.loadAsync(docx);
    z.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`);
    const u8 = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const { at, size } = entryData(u8, 'word/document.xml');
    const c = u8.slice();
    for (let k = 0; k < 24; k++) c[at + Math.floor(size * 0.45) + k] ^= 0xa5;
    return c;
  }

  it('flags only the damaged part (CRCs with the high bit set are not false positives)', async () => {
    const r = await recoverDocument(buf(await damagedPackage()), 'mid.docx');
    const std = r.methods.find((m) => m.key === 'standard')!;
    expect(std.detail).toMatch(/1 damaged part: word\/document\.xml/);
    expect(r.repaired?.salvagedParts).toEqual(['word/document.xml']);
  });

  it('keeps the text before the damage and marks where the loss begins', async () => {
    const res = await importFile(buf(await damagedPackage()), 'mid.docx');
    const text = res.doc.textContent;
    expect(text).toContain('Paragraph 1 of a document');
    expect(text).toMatch(/Anne\'s Pen: the file is damaged/);
    expect(res.recovery!.notes.join(' ')).toMatch(/compressed data inside the file is damaged/);
  });
});
