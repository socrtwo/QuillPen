/**
 * XML, archive and text-markup importers: Word 2003 XML, flat OPC, OOXML Strict, StarOffice,
 * AbiWord, KWord, Pages, HWPX, FictionBook, DocBook, RTFD, MHTML, LaTeX, reStructuredText,
 * Textile, AsciiDoc, Org-mode, troff, plus fidelity fixes in DOCX/RTF/HTML import, encoding
 * detection and content sniffing. Fixtures from LibreOffice and pandoc are in
 * tests/fixtures/formats (see the README there); the rest are built by helpers/samples-b.ts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import type { Node as PMNode } from 'prosemirror-model';
import { importFile, sniffFormat, formatForName } from '../../src/io';
import { SNIFF_RULES_B, sniffB } from '../../src/io/sniff-b';
import { detectText } from '../../src/io/encoding';
import { toArrayBuffer } from '../../src/io/serialize';
import { snappyDecompress } from '../../src/io/iwa';
import { tiffToBmp } from '../../src/io/tiff';
import { RtfReader, dttmToMs } from '../../src/io/rtf';
import { familyFromPostScript } from '../../src/io/pages';
import * as B from './helpers/samples-b';

const FIX = resolve(__dirname, '../fixtures/formats');
const fixture = (name: string) => { const b = readFileSync(resolve(FIX, name)); return new Uint8Array(b.buffer, b.byteOffset, b.byteLength); };
const ab = (u8: Uint8Array | string) => toArrayBuffer(typeof u8 === 'string' ? new TextEncoder().encode(u8) : u8);

interface Summary {
  styles: string[]; text: string; marks: Set<string>; links: string[]; footnotes: string[]; images: number; lists: string[]; tables: { rows: number; cells: string[]; spans: string[]; bg: string[]; borders: number }[];
  types: Set<string>; comments: string[]; insertions: string[]; deletions: string[]; math: string[]; boxes: number;
}

function summarize(doc: PMNode): Summary {
  const s: Summary = { styles: [], text: doc.textContent, marks: new Set(), links: [], footnotes: [], images: 0, lists: [], tables: [], types: new Set(), comments: [], insertions: [], deletions: [], math: [], boxes: 0 };
  doc.descendants((n) => {
    s.types.add(n.type.name);
    if (n.type.name === 'paragraph' && n.attrs.style !== 'Normal') s.styles.push(`${n.attrs.style}:${n.textContent}`);
    if (n.isText) for (const m of n.marks) {
      s.marks.add(m.type.name);
      if (m.type.name === 'link' && !s.links.includes(m.attrs.href)) s.links.push(m.attrs.href);
      if (m.type.name === 'insertion') s.insertions.push(n.text!);
      if (m.type.name === 'deletion') s.deletions.push(n.text!);
      if (m.type.name === 'comment') s.comments.push(n.text!);
    }
    if (n.type.name === 'footnote') s.footnotes.push(n.attrs.text);
    if (n.type.name === 'image') s.images++;
    if (n.type.name === 'text_box') s.boxes++;
    if (n.type.name === 'math_inline' || n.type.name === 'math_block') s.math.push(n.attrs.latex);
    if (n.type.name === 'bullet_list' || n.type.name === 'ordered_list') s.lists.push(n.type.name === 'bullet_list' ? `bullet:${n.attrs.bullet}` : `ordered:${n.attrs.format}`);
    if (n.type.name === 'table') {
      const t = { rows: n.childCount, cells: [] as string[], spans: [] as string[], bg: [] as string[], borders: 0 };
      n.descendants((c) => {
        if (c.type.name === 'table_cell' || c.type.name === 'table_header') {
          t.cells.push(c.textContent.trim());
          if (c.attrs.colspan > 1 || c.attrs.rowspan > 1) t.spans.push(`${c.textContent.trim()}:${c.attrs.colspan}x${c.attrs.rowspan}`);
          if (c.attrs.background) t.bg.push(c.attrs.background);
          if (c.attrs.borders) t.borders++;
          return false;
        }
        return true;
      });
      s.tables.push(t);
    }
    return true;
  });
  return s;
}

async function open(data: Uint8Array | string, name: string) {
  const r = await importFile(ab(data), name);
  r.doc.check();
  return { ...r, s: summarize(r.doc), settings: r.doc.attrs.settings };
}

/** The pandoc fixtures all come from tests/fixtures/formats/source.md. */
function expectPandocSample(s: Summary, opts: { lists?: boolean; table?: boolean; math?: boolean; footnote?: boolean; sub?: boolean } = {}) {
  expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:Introduction', 'Heading 2:Lists', 'Heading 2:Table']));
  expect(s.text).toContain('Final paragraph.');
  expect(s.marks).toEqual(expect.objectContaining({}));
  for (const m of ['italic', 'bold', 'code']) expect(s.marks.has(m)).toBe(true);
  if (opts.sub !== false) { expect(s.marks.has('sub')).toBe(true); expect(s.marks.has('sup')).toBe(true); }
  expect(s.links).toContain('https://example.com/docs');
  if (opts.footnote !== false) expect(s.footnotes).toEqual(['The footnote text with emphasis.']);
  if (opts.lists !== false) expect(s.lists).toEqual(expect.arrayContaining(['bullet:disc', 'ordered:decimal']));
  if (opts.table !== false) {
    expect(s.tables[0].cells).toEqual(['Name', 'Qty', 'Note', 'Pens', '12', 'blue', 'Paper', '500', 'A4 sheets']);
  }
  if (opts.math !== false) expect(s.math).toEqual(expect.arrayContaining(['E = mc^2']));
  expect(s.types.has('code_block')).toBe(true);
}

// =============================================================================================

describe('content sniffing (SNIFF_RULES_B)', () => {
  it('exports one detector per format, each returning a confidence', () => {
    const ids = SNIFF_RULES_B.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['wordml', 'flatopc', 'sxw', 'abw', 'kwd', 'pages', 'hwpx', 'fb2', 'docbook', 'rtfd', 'mhtml', 'latex', 'rst', 'textile', 'asciidoc', 'org', 'man']));
    for (const r of SNIFF_RULES_B) expect(r.detect(new Uint8Array([1, 2, 3]), 'x.bin')).toBeGreaterThanOrEqual(0);
  });

  it('recognises formats by content whatever the file is called', async () => {
    const cases: [Uint8Array, string][] = [
      [fixture('rich-word2003.xml'), 'wordml'], [new TextEncoder().encode(B.wordml2003Xml()), 'wordml'], [await B.buildSxw(), 'sxw'], [B.buildAbw(), 'abw'],
      [await B.buildKwd(), 'kwd'], [await B.buildHwpx(), 'hwpx'], [await B.buildPages09(), 'pages'], [await B.buildPagesIwa(), 'pages'],
      [fixture('sample.fb2'), 'fb2'], [fixture('sample.dbk'), 'docbook'], [fixture('sample-docbook5.xml'), 'docbook'], [B.buildMht(), 'mhtml'],
      [fixture('sample.tex'), 'latex'], [fixture('sample.man'), 'man'], [fixture('rich.fodt'), 'fodt'],
    ];
    for (const [bytes, id] of cases) {
      expect(sniffB(bytes, 'download.bin'), id).toBe(id);
      expect(sniffFormat(ab(bytes), 'download.bin')?.id, id).toBe(id);
    }
  });

  it('uses the extension for markups without strong signatures, and leaves other files alone', () => {
    expect(sniffB(fixture('sample.rst'), 'readme.rst')).toBe('rst');
    expect(sniffB(fixture('sample.textile'), 'notes.textile')).toBe('textile');
    expect(sniffB(fixture('sample.adoc'), 'guide.adoc')).toBe('asciidoc');
    expect(sniffB(fixture('sample.org'), 'todo.org')).toBe('org');
    expect(sniffB(new TextEncoder().encode('Just some notes.\nNothing special.\n'), 'notes.txt')).toBeNull();
    expect(sniffB(new TextEncoder().encode('# Title\n\nSome *markdown*.\n'), 'readme.md')).toBeNull();
    expect(sniffB(fixture('rich.docx'), 'rich.docx')).toBeNull();
    expect(formatForName('paper.tex')?.id).toBe('latex');
    expect(formatForName('ls.1')?.id).toBe('man');
  });
});

// =============================================================================================

describe('Word 2003 XML, flat OPC and OOXML Strict', () => {
  it('imports Word 2003 XML as Word writes it', async () => {
    const { s, settings, format } = await open(B.wordml2003Xml(), 'old.xml');
    expect(format.id).toBe('wordml');
    expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:Word 2003 Heading', 'Callout Text:Custom style paragraph']));
    expect(s.marks).toEqual(new Set(['bold', 'italic', 'underline', 'color', 'highlight', 'size', 'link', 'comment', 'insertion', 'deletion']));
    expect(s.links).toEqual(['http://www.example.com/']);
    expect(s.footnotes).toEqual(['Word 2003 footnote.']);
    expect(s.comments).toEqual(['Commented']);
    expect(Object.values(settings.comments).map((c: any) => `${c.author}:${c.text}`)).toEqual(['Reviewer:Check this']);
    expect(s.insertions).toEqual(['added']);
    expect(s.deletions).toEqual(['removed']);
    expect(s.lists).toEqual(['bullet:disc', 'ordered:lower-roman']);
    expect(s.tables[0].spans).toEqual(['Merged:2x1', 'Tall:1x2']);
    expect(s.tables[0].bg).toEqual(['#ccffcc']);
    expect(s.images).toBe(1);
    expect(settings.page.sizeName).toBe('A4');
    expect(settings.header.right).toBe('Word 2003 header');
    expect(settings.footer.center).toBe('{PAGE}');
    expect(settings.properties).toMatchObject({ title: 'Word 2003 Sample', author: 'Office User', company: 'Contoso' });
  });

  it('imports LibreOffice-written Word 2003 XML', async () => {
    const { s, settings } = await open(fixture('rich-word2003.xml'), 'rich.xml');
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Fidelity Sample']));
    expect(s.footnotes).toEqual(['This is the footnote text.', 'This is the endnote text.']);
    expect(s.lists).toEqual(expect.arrayContaining(['bullet:disc', 'ordered:decimal', 'ordered:lower-alpha']));
    expect(s.tables[0].cells).toEqual(expect.arrayContaining(['Name', 'Merged header', 'C2 shaded']));
    expect(s.images).toBe(1);
    expect(settings.header.left + settings.header.right).toContain('Running Header Text');
  });

  it('imports a flat OPC (pkg:package) document like the .docx it came from', async () => {
    const zip = await JSZip.loadAsync(fixture('rich.docx'));
    const parts: string[] = [];
    for (const f of Object.values(zip.files)) {
      if (f.dir) continue;
      const name = '/' + f.name;
      if (/\.(xml|rels)$/.test(f.name)) {
        const x = (await f.async('string')).replace(/^<\?xml[^>]*\?>/, '');
        parts.push(`<pkg:part pkg:name="${name}" pkg:contentType="application/xml"><pkg:xmlData>${x}</pkg:xmlData></pkg:part>`);
      } else parts.push(`<pkg:part pkg:name="${name}" pkg:contentType="image/png"><pkg:binaryData>${B.PNG_B64}</pkg:binaryData></pkg:part>`);
    }
    const flat = `<?xml version="1.0" standalone="yes"?>\n<?mso-application progid="Word.Document"?>\n<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">${parts.join('')}</pkg:package>`;
    const a = await open(flat, 'flat.xml');
    const b = await open(fixture('rich.docx'), 'rich.docx');
    expect(a.format.id).toBe('flatopc');
    expect(a.s.text).toBe(b.s.text);
    expect(a.s.styles).toEqual(b.s.styles);
    expect(a.s.footnotes).toEqual(b.s.footnotes);
  });

  it('imports OOXML Strict namespaces', async () => {
    const zip = await JSZip.loadAsync(fixture('rich.docx'));
    for (const f of Object.values(zip.files)) {
      if (f.dir || !/\.(xml|rels)$/.test(f.name)) continue;
      const x = (await f.async('string'))
        .replace(/http:\/\/schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main/g, 'http://purl.oclc.org/ooxml/wordprocessingml/main')
        .replace(/http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships/g, 'http://purl.oclc.org/ooxml/officeDocument/relationships');
      zip.file(f.name, x);
    }
    const strict = await zip.generateAsync({ type: 'uint8array' });
    const { s } = await open(strict, 'strict.docx');
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Fidelity Sample', 'Heading 1:First Heading']));
    expect(s.footnotes.length).toBe(2);
    expect(s.tables[0].spans).toEqual(expect.arrayContaining(['Merged header:2x1', 'Tall cell:1x2']));
  });

  it('does not wrap number-less outline headings in lists (LibreOffice DOCX)', async () => {
    const { doc, s } = await open(fixture('rich.docx'), 'rich.docx');
    expect(doc.child(1).type.name).toBe('paragraph');
    expect(doc.child(1).attrs.style).toBe('Heading 1');
    expect(s.insertions).toEqual(['inserted words ']);
    expect(s.deletions).toEqual(['removed words ']);
    expect(s.comments).toEqual(['phrase here']);
  });
});

describe('ODF fidelity (LibreOffice flat ODT)', () => {
  it('keeps text frames as text boxes and cell borders', async () => {
    const { s } = await open(fixture('rich.fodt'), 'rich.fodt');
    expect(s.boxes).toBeGreaterThan(0);
    expect(s.tables[0].borders).toBeGreaterThan(0);
  });
});

// =============================================================================================

describe('RTF fidelity (LibreOffice, Word and TextEdit RTF, RTFD)', () => {
  it('keeps comments, tracked changes, shapes, borders, merged cells and custom styles', async () => {
    const { doc, s, settings } = await open(fixture('rich.rtf'), 'rich.rtf');
    expect(doc.child(1).attrs.style).toBe('Heading 1');
    expect(doc.child(1).type.name).toBe('paragraph');
    expect(s.comments).toEqual(['phrase here']);
    expect(Object.values(settings.comments).map((c: any) => `${c.author}:${c.text}`)).toEqual(['Commenter:Please check this phrase.']);
    expect(s.insertions).toEqual(['inserted words ']);
    expect(s.deletions).toEqual(['removed words ']);
    expect(s.images).toBe(1);
    expect(s.boxes).toBe(1);
    expect(s.tables[0].spans).toEqual(['Merged header:2x1', 'Tall cell:1x2']);
    expect(s.tables[0].borders).toBe(7);
    expect(s.styles).toEqual(expect.arrayContaining(['Note Para:A custom styled paragraph with indentation and shading.']));
    expect(s.lists).toEqual(['bullet:disc', 'bullet:circle', 'ordered:decimal', 'ordered:lower-alpha']);
    expect(settings.properties.author).toBe('Fixture Author');
  });

  it('decodes revision dates', () => {
    // 2024-03-01 10:00 packed as minute | hour<<6 | day<<11 | month<<16 | (year-1900)<<20.
    const v = 0 | (10 << 6) | (1 << 11) | (3 << 16) | (124 << 20);
    expect(new Date(dttmToMs(v)).toISOString()).toBe('2024-03-01T10:00:00.000Z');
  });

  it('opens TextEdit RTF and RTFD bundles with attachments (TIFF converted)', async () => {
    const rtf = fixture('textedit.rtf');
    const zip = new JSZip();
    zip.file('Sample.rtfd/TXT.rtf', rtf);
    zip.file('Sample.rtfd/pic.tiff', B.tiffRgb(4, 2));
    const { s, format } = await open(await zip.generateAsync({ type: 'uint8array' }), 'Sample.rtfd.zip');
    expect(format.id).toBe('rtfd');
    expect(s.text).toContain('TextEdit Title');
    expect(s.text).not.toContain('¬');
    expect(s.images).toBe(1);
    expect(s.lists).toEqual(['bullet:disc']);
    expect(s.marks.has('color')).toBe(true);
  });

  it('converts baseline TIFF (uncompressed and PackBits) to BMP', () => {
    const bmp = tiffToBmp(B.tiffRgb(3, 2))!;
    expect(String.fromCharCode(bmp[0], bmp[1])).toBe('BM');
    expect(new DataView(bmp.buffer).getInt32(18, true)).toBe(3);
    expect(tiffToBmp(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('reads RTF list tables written without \\*', () => {
    const r = new RtfReader(String.raw`{\rtf1{\stylesheet{\s1\outlinelevel0 Heading 1;}}{\listtable{\list{\listlevel\levelnfc255{\leveltext \'00;}}\listid1}}{\listoverridetable{\listoverride\listid1\ls1}}\pard\s1\ls1 Head\par}`);
    const doc = r.parse();
    expect(doc.child(0).type.name).toBe('paragraph');
    expect(doc.child(0).attrs.style).toBe('Heading 1');
  });
});

// =============================================================================================

describe('HTML and web archives', () => {
  it('applies LibreOffice style sheets, footnotes, header/footer and page setup', async () => {
    const { s, settings } = await open(fixture('rich.html'), 'rich.html');
    expect(s.footnotes).toEqual(['This is the footnote text.', 'This is the endnote text.']);
    expect(settings.header.right).toBe('Running Header Text');
    expect(settings.footer.center).toBe('Page {PAGE}');
    expect(settings.page.margin.left).toBeCloseTo(70.56, 1);
    expect(s.text).not.toContain('Running Header Text');
    expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:First Heading']));
    expect(s.marks.has('highlight')).toBe(true);
  });

  it('opens MHTML archives with embedded pictures and quoted-printable text', async () => {
    const { s, format, doc } = await open(B.buildMht(), 'page.mht');
    expect(format.id).toBe('mhtml');
    expect(s.text).toContain('Archived Page');
    expect(s.text).toContain('Café café bold');
    expect(s.images).toBe(1);
    let src = '';
    doc.descendants((n) => { if (n.type.name === 'image') src = n.attrs.src; });
    expect(src.startsWith('data:image/png;base64,')).toBe(true);
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Archived Page']));
  });
});

// =============================================================================================

describe('OpenOffice.org 1.x, AbiWord, KWord, Hangul HWPX', () => {
  it('imports StarOffice/OpenOffice.org 1.x Writer (.sxw)', async () => {
    const { s, settings, format } = await open(await B.buildSxw(), 'old.sxw');
    expect(format.id).toBe('sxw');
    expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:Old Writer Heading']));
    expect(s.marks).toEqual(expect.objectContaining({}));
    for (const m of ['bold', 'italic', 'underline', 'strike', 'sup', 'color', 'link', 'insertion', 'comment', 'font', 'size']) expect(s.marks.has(m), m).toBe(true);
    expect(s.footnotes).toEqual(['Old footnote.']);
    expect(s.lists).toEqual(['bullet:disc', 'bullet:circle', 'ordered:upper-roman']);
    expect(s.tables[0].spans).toEqual(['Wide header:2x1']);
    expect(s.tables[0].bg).toEqual(['#ccffcc']);
    expect(s.images).toBe(1);
    expect(s.types.has('page_break')).toBe(true);
    expect(settings.page.sizeName).toBe('A4');
    expect(settings.header.left).toBe('Old header {PAGE}');
    expect(settings.properties).toMatchObject({ title: 'Old Document', author: 'Sam Writer' });
    expect(Object.values(settings.comments).map((c: any) => c.text)).toEqual(['An old note']);
  });

  it('imports AbiWord documents, plain and gzip-compressed', async () => {
    for (const [bytes, name] of [[B.buildAbw(), 'doc.abw'], [B.gzipStored(B.buildAbw()), 'doc.zabw']] as const) {
      const { s, settings, format } = await open(bytes, name);
      expect(format.id).toBe('abw');
      expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:Abi Heading']));
      for (const m of ['bold', 'italic', 'underline', 'strike', 'sup', 'color', 'highlight', 'font', 'size', 'link', 'insertion', 'deletion']) expect(s.marks.has(m), m).toBe(true);
      expect(s.footnotes).toEqual(['Abi footnote text.']);
      expect(s.lists).toEqual(['bullet:disc', 'bullet:disc', 'ordered:upper-roman']);
      expect(s.text).not.toContain('\tBullet');
      expect(s.tables[0].spans).toEqual(['Spanning:2x1']);
      expect(s.images).toBe(1);
      expect(s.types.has('page_break')).toBe(true);
      expect(settings.header.right).toBe('Abi header');
      expect(settings.footer.center).toBe('Page {PAGE}');
      expect(settings.page.sizeName).toBe('A4');
      expect(settings.page.margin.left).toBe(90);
      expect(settings.properties).toMatchObject({ title: 'Abi Title', author: 'Abi Author' });
    }
  });

  it('imports KWord 1.x documents', async () => {
    const { s, settings, format } = await open(await B.buildKwd(), 'old.kwd');
    expect(format.id).toBe('kwd');
    expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:KWord Heading']));
    for (const m of ['bold', 'italic', 'color']) expect(s.marks.has(m), m).toBe(true);
    expect(s.marks.has('font')).toBe(false); // repeated defaults are folded into the styles
    expect(s.footnotes).toEqual(['KWord footnote.']);
    expect(s.lists).toEqual(['bullet:disc', 'ordered:decimal']);
    expect(s.tables[0].spans).toEqual(['Wide cell:2x1']);
    expect(s.images).toBe(1);
    expect(settings.header.left).toBe('KWord header {PAGE}');
    expect(settings.properties).toMatchObject({ title: 'KWord Title', author: 'K Author' });
    expect(settings.styles['Heading 1']).toMatchObject({ font: 'Arial', size: 16, bold: true });
  });

  it('imports Hangul HWPX (OWPML) documents', async () => {
    const { s, settings, format } = await open(await B.buildHwpx(), 'doc.hwpx');
    expect(format.id).toBe('hwpx');
    expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:제목 Heading', 'Body Text:보통 텍스트 plain, 굵게 bold, blue italic\ttabbed. 한컴']));
    for (const m of ['bold', 'italic', 'underline', 'strike', 'color', 'size', 'link']) expect(s.marks.has(m), m).toBe(true);
    expect(s.links).toEqual(['https://www.hancom.com']);
    expect(s.footnotes).toEqual(['각주 footnote text']);
    expect(s.lists).toEqual(['ordered:decimal', 'bullet:disc']);
    expect(s.tables[0].spans).toEqual(['병합 merged:2x1']);
    expect(s.tables[0].bg).toEqual(['#ffe0e0']);
    expect(s.images).toBe(1);
    expect(settings.page.sizeName).toBe('A4');
    expect(settings.page.margin.top).toBeCloseTo(99.2, 1);
    expect(settings.header.center).toBe('한글 머리말');
    expect(settings.properties).toMatchObject({ title: 'HWPX 문서', author: '홍길동' });
  });
});

// =============================================================================================

describe('Apple Pages', () => {
  it("imports Pages '09 XML packages", async () => {
    const { s, settings, format } = await open(await B.buildPages09(), 'doc.pages');
    expect(format.id).toBe('pages');
    expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:Pages Heading']));
    for (const m of ['bold', 'italic', 'color', 'link', 'comment']) expect(s.marks.has(m), m).toBe(true);
    expect(s.text).not.toContain('Placeholder text');
    expect(s.footnotes).toEqual(['Pages footnote.']);
    expect(s.lists).toEqual(['bullet:disc']);
    expect(s.tables[0].cells).toEqual(['Key', 'Value', 'Pi', '3.14']);
    expect(s.images).toBe(1);
    expect(s.types.has('page_break')).toBe(true);
    expect(settings.header.left).toBe('Pages header');
    expect(settings.header.right).toBe('{PAGE}');
    expect(settings.page.margin.left).toBe(60);
    expect(settings.properties).toMatchObject({ title: 'Pages Sample', author: 'Page Author' });
    expect(Object.values(settings.comments).map((c: any) => c.text)).toEqual(['A Pages comment']);
  });

  it('imports Pages 5+ IWA packages: text, styles, character runs and tables', async () => {
    const { s, format } = await open(await B.buildPagesIwa(), 'new.pages');
    expect(format.id).toBe('pages');
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Iwa Title']));
    expect(s.text).toContain('Body with bold words.');
    expect(s.text).toContain('Second paragraph');
    expect(s.marks.has('bold')).toBe(true);
    expect(s.tables[0].cells).toEqual(['Name', 'Size', 'Alpha', 'Ten']);
  });

  it('shows the preview of password-protected packages and says why', async () => {
    const { s } = await open(await B.buildPagesProtected(), 'secret.pages');
    expect(s.text).toMatch(/password-protected/);
    expect(s.images).toBe(1);
  });

  it('decodes Snappy and maps PostScript font names', () => {
    // "abc" literal, then a 1-byte-offset copy of 6 bytes from 3 back.
    expect(new TextDecoder().decode(snappyDecompress(Uint8Array.from([9, 8, 97, 98, 99, 9, 3])))).toBe('abcabcabc');
    expect(familyFromPostScript('TimesNewRomanPSMT')).toBe('Times New Roman');
    expect(familyFromPostScript('Helvetica-Bold')).toBe('Helvetica');
    expect(familyFromPostScript('LucidaGrande')).toBe('Lucida Grande');
  });
});

// =============================================================================================

describe('FictionBook, DocBook, EPUB 2', () => {
  it('imports FictionBook 2 (and zipped .fbz)', async () => {
    for (const [bytes, name] of [[fixture('sample.fb2'), 'book.fb2'], [await B.zipOf('book.fb2', fixture('sample.fb2')), 'book.fbz']] as const) {
      const { s, settings, format } = await open(bytes, name);
      expect(format.id).toBe('fb2');
      expect(s.styles).toEqual(expect.arrayContaining(['Title:Pandoc Sample', 'Heading 1:Introduction', 'Heading 2:Lists', 'Quote:A block quote with bold inside.']));
      expect(s.footnotes).toEqual(['The footnote text with emphasis.']);
      expect(s.tables[0].cells).toEqual(['Name', 'Qty', 'Note', 'Pens', '12', 'blue', 'Paper', '500', 'A4 sheets']);
      expect(s.images).toBe(1);
      expect(settings.properties).toMatchObject({ title: 'Pandoc Sample', author: 'Pat Writer' });
    }
  });

  it('imports DocBook 4 (with DTD) and DocBook 5', async () => {
    for (const name of ['sample.dbk', 'sample-docbook5.xml']) {
      const { s, settings, format } = await open(fixture(name), name);
      expect(format.id).toBe('docbook');
      expectPandocSample(s, { math: false });
      expect(s.styles).toEqual(expect.arrayContaining(['Title:Pandoc Sample']));
      expect(settings.properties).toMatchObject({ title: 'Pandoc Sample', author: 'Pat Writer' });
    }
  });

  it('imports DocBook admonitions, variable lists and CALS spans', async () => {
    const xml = `<article xmlns="http://docbook.org/ns/docbook" version="5.0"><info><title>T</title></info>
<note><para>Careful &amp; calm.</para></note>
<variablelist><varlistentry><term>Term</term><listitem><para>Definition</para></listitem></varlistentry></variablelist>
<informaltable><tgroup cols="2"><colspec colname="c1"/><colspec colname="c2"/><tbody><row><entry namest="c1" nameend="c2">Wide</entry></row><row><entry morerows="1">Tall</entry><entry>x</entry></row><row><entry>y</entry></row></tbody></tgroup></informaltable>
<para>See <xref linkend="t"/> and <emphasis role="bold">bold</emphasis> <inlineequation><alt role="tex">x^2</alt></inlineequation>.</para></article>`;
    const { s } = await open(xml, 'a.dbk');
    expect(s.boxes).toBe(1);
    expect(s.text).toContain('Careful & calm.');
    expect(s.text).toContain('TermDefinition');
    expect(s.tables[0].spans).toEqual(['Wide:2x1', 'Tall:1x2']);
    expect(s.math).toEqual(['x^2']);
  });

  it('imports EPUB 2 books', async () => {
    const { s, format } = await open(fixture('sample-epub2.epub'), 'book.epub');
    expect(format.id).toBe('epub');
    expect(s.footnotes).toEqual(['The footnote text with emphasis.']);
    expect(s.images).toBe(1);
  });
});

// =============================================================================================

describe('LaTeX and lightweight markups', () => {
  it('imports LaTeX structure, formatting, lists, tables and math', async () => {
    const { s, settings, format } = await open(fixture('sample.tex'), 'paper.tex');
    expect(format.id).toBe('latex');
    expectPandocSample(s);
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Pandoc Sample']));
    expect(s.lists).toEqual(['bullet:disc', 'bullet:disc', 'ordered:decimal', 'ordered:lower-alpha']);
    expect(s.math).toEqual(['E = mc^2', '\\int_0^1 x^2\\,dx = \\frac{1}{3}']);
    expect(settings.properties).toMatchObject({ title: 'Pandoc Sample', author: 'Pat Writer' });
  });

  it('handles LaTeX tables with spans, accents, quotes and page setup', async () => {
    const tex = fixture('features.tex');
    const { s, settings } = await open(tex, 'x.tex');
    expect(s.styles).toContain('Heading 1:Café and naïve');
    expect(s.text).toContain('“Quoted” — Anne’s Pen red bold both');
    expect(s.marks.has('color')).toBe(true);
    expect(s.tables[0].spans).toEqual(['Wide:2x1', 'Tall:1x2']);
    expect(s.lists).toEqual(['ordered:lower-roman']);
    expect(s.math).toEqual(['a^2+b^2=c^2']);
    expect(settings.page.sizeName).toBe('A4');
    expect(settings.page.margin.left).toBeCloseTo(56.69, 1);
  });

  it('imports reStructuredText', async () => {
    const { s, settings, format } = await open(fixture('sample.rst'), 'doc.rst');
    expect(format.id).toBe('rst');
    expectPandocSample(s);
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Pandoc Sample', 'Quote:A block quote with bold inside.']));
    expect(s.images).toBe(1);
    expect(settings.properties.author).toBe('Pat Writer');
  });

  it('imports Textile', async () => {
    const { s, format } = await open(fixture('sample.textile'), 'doc.textile');
    expect(format.id).toBe('textile');
    expectPandocSample(s);
    expect(s.lists).toEqual(['bullet:disc', 'bullet:disc', 'ordered:decimal', 'ordered:lower-alpha']);
    expect(s.math).toEqual(['E = mc^2', '\\int_0^1 x^2\\,dx = \\frac{1}{3}']);
  });

  it('imports AsciiDoc', async () => {
    const { s, settings, format } = await open(fixture('sample.adoc'), 'doc.adoc');
    expect(format.id).toBe('asciidoc');
    expectPandocSample(s);
    expect(s.lists).toEqual(['bullet:disc', 'bullet:disc', 'ordered:decimal', 'ordered:lower-alpha']);
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Pandoc Sample', 'Quote:A block quote with bold inside.']));
    expect(settings.properties).toMatchObject({ title: 'Pandoc Sample', author: 'Pat Writer' });
  });

  it('imports AsciiDoc admonitions, description lists and table spans', async () => {
    const adoc = `= Doc\n\nNOTE: Remember this.\n\nCPU:: The brain\nRAM:: The memory\n\n[cols="1,1"]\n|===\n2+|Both\n|a |b\n|===\n`;
    const { s } = await open(adoc, 'x.adoc');
    expect(s.boxes).toBe(1);
    expect(s.text).toContain('CPUThe brain');
    expect(s.tables[0].spans).toEqual(['Both:2x1']);
  });

  it('imports Org-mode', async () => {
    const { s, settings, format } = await open(fixture('sample.org'), 'notes.org');
    expect(format.id).toBe('org');
    expectPandocSample(s);
    expect(s.styles).toEqual(expect.arrayContaining(['Title:Pandoc Sample', 'Quote:A block quote with bold inside.']));
    expect(settings.properties).toMatchObject({ title: 'Pandoc Sample', author: 'Pat Writer' });
  });

  it('imports manual pages (man and mdoc)', async () => {
    const { s, settings, format } = await open(fixture('sample.man'), 'tool.1');
    expect(format.id).toBe('man');
    expect(s.styles).toEqual(expect.arrayContaining(['Heading 1:Introduction', 'Heading 2:Lists']));
    expect(s.lists).toEqual(['bullet:disc', 'bullet:disc', 'ordered:decimal', 'ordered:lower-alpha']);
    expect(s.tables[0].cells).toEqual(['Name', 'Qty', 'Note', 'Pens', '12', 'blue', 'Paper', '500', 'A4 sheets']);
    expect(s.types.has('code_block')).toBe(true);
    expect(settings.properties.title).toBe('Pandoc Sample');
    const mdoc = '.Dd January 1, 2020\n.Dt FOO 1\n.Os\n.Sh NAME\n.Nm foo\n.Nd do things\n.Sh OPTIONS\n.Bl -tag -width Ds\n.It Fl v\nVerbose output.\n.El\n';
    const m = await open(mdoc, 'foo.1');
    expect(m.s.styles).toEqual(expect.arrayContaining(['Title:FOO(1)', 'Heading 1:NAME', 'Heading 1:OPTIONS']));
    expect(m.s.text).toContain('-v');
  });

  it('imports GitHub-flavoured Markdown from pandoc', async () => {
    const { s } = await open(fixture('sample.gfm.md'), 'readme.md');
    expectPandocSample(s, { sub: false, math: false });
  });
});

// =============================================================================================

describe('plain-text encoding detection', () => {
  it('detects Unicode, Windows, ISO, Mac, DOS and East Asian encodings', () => {
    const samples: [string, string, string][] = B.ENCODING_SAMPLES;
    for (const [enc, text, b64] of samples) {
      const u8 = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const d = detectText(u8);
      expect(d.text, enc).toBe(text);
    }
  });

  it('opens a DOS (code page 437) text file with box drawing through the text importer', async () => {
    const u8 = Uint8Array.from(atob(B.ENCODING_SAMPLES.find((x) => x[0] === 'cp437')![2]), (c) => c.charCodeAt(0));
    const { s } = await open(u8, 'MENU.TXT');
    expect(s.text).toContain('Überschrift für die Größe und Straße');
    expect(s.text).toContain('┌──────────┐');
  });
});
