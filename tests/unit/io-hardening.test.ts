/**
 * Regression tests for import/export hardening: damaged or crafted input must not hang, exhaust
 * memory, inject markup or styles, or silently change content on a round trip.
 */
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { DOMSerializer, type Node as PMNode } from 'prosemirror-model';
import { schema } from '../../src/editor/schema';
import { defaultSettings } from '../../src/editor/settings';
import { importFile } from '../../src/io';
import { extractTextFromRtf } from '../../src/io/recover/salvage';
import { extractDoc97 } from '../../src/io/recover/doc97';
import { rtfToDoc, docToRtf, RtfReader, RTF_MAX_DEPTH } from '../../src/io/rtf';
import { docToHtml, importHtml } from '../../src/io/html';
import { exportEpubBytes, importEpub } from '../../src/io/epub';
import { exportDocx } from '../../src/io/docx-export';
import { importDocx } from '../../src/io/docx-import';
import { exportOdt, importFodt } from '../../src/io/odt';
import { docToText } from '../../src/io/text';
import { docToMarkdown, markdownToBlocks } from '../../src/io/markdown';
import { blobToBytes, toArrayBuffer } from '../../src/io/serialize';

const S = schema;
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const OPTS = { fileName: 'test', author: 'Tester' };
const enc = (s: string) => toArrayBuffer(new TextEncoder().encode(s));
const wellFormed = (xml: string) => !new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('parsererror').length;
const doc = (...blocks: PMNode[]) => S.node('doc', { settings: defaultSettings() }, blocks);
const p = (text: string, attrs: Record<string, unknown> | null = null) => S.nodes.paragraph.create(attrs, text ? S.text(text) : null);
const find = (d: PMNode, type: string) => { const out: PMNode[] = []; d.descendants((n) => { if (n.type.name === type) out.push(n); return true; }); return out; };
const names = (d: PMNode) => { const s = new Set<string>(); d.descendants((n) => { s.add(n.type.name); n.marks.forEach((m) => s.add('mark:' + m.type.name)); return true; }); return s; };
const zipText = async (bytes: Uint8Array | Blob, path: string) => (await JSZip.loadAsync(bytes instanceof Blob ? await blobToBytes(bytes) : bytes)).file(path)!.async('string');

async function docx(body: string, parts: Record<string, string> = {}): Promise<ArrayBuffer> {
  const z = new JSZip();
  const rels = Object.keys(parts).map((f, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${f.replace(/\.xml$/, '')}" Target="${f}"/>`).join('');
  z.file('word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`);
  for (const [f, xml] of Object.entries(parts)) z.file(`word/${f}`, xml);
  z.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`);
  return toArrayBuffer(await z.generateAsync({ type: 'uint8array' }));
}

const fodt = (body: string, autoStyles = '') => `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles><style:style style:name="T1" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>${autoStyles}</office:automatic-styles>
<office:body><office:text>
<text:h text:outline-level="1">Title</text:h>
<text:p>Some <text:span text:style-name="T1">bold</text:span> text.</text:p>
<table:table table:name="T"><table:table-column table:number-columns-repeated="2"/><table:table-row><table:table-cell><text:p>A1</text:p></table:table-cell><table:table-cell><text:p>B1</text:p></table:table-cell></table:table-row></table:table>
${body}
</office:text></office:body></office:document>`;

/** A Word 97 compound file whose piece table has `pieces` pieces, all covering the same `textLen` bytes. */
function doc97(pieces: number, textLen: number): { file: Uint8Array; wdSize: number } {
  const SEC = 512, ENDC = 0xfffffffe, FREE = 0xffffffff;
  const wdSize = Math.max(4096, Math.ceil((0x400 + textLen) / SEC) * SEC);
  const wd = new Uint8Array(wdSize);
  const dv = new DataView(wd.buffer);
  dv.setUint16(0, 0xa5ec, true); dv.setUint16(2, 0x00c1, true); dv.setUint16(0x0a, 0x0200, true); // 1Table
  dv.setUint16(32, 14, true); dv.setUint16(62, 22, true); dv.setUint16(152, 93, true);
  const lcb = 12 * pieces + 4;
  dv.setUint32(154 + 33 * 8, 0, true); dv.setUint32(154 + 33 * 8 + 4, lcb + 5, true);
  for (let i = 0; i < textLen; i++) wd[0x400 + i] = i % 80 === 79 ? 0x0d : 0x41 + (i % 26);
  const tbl = new Uint8Array(Math.max(4096, Math.ceil((5 + lcb) / SEC) * SEC));
  const tv = new DataView(tbl.buffer);
  tbl[0] = 2; tv.setUint32(1, lcb, true);
  for (let k = 0; k <= pieces; k++) tv.setUint32(5 + k * 4, k * textLen, true);
  for (let k = 0; k < pieces; k++) tv.setUint32(5 + (pieces + 1) * 4 + k * 8 + 2, ((0x400 * 2) | 0x40000000) >>> 0, true);
  const wdSecs = wdSize / SEC, tblSecs = tbl.length / SEC, fatSecs = Math.ceil((1 + wdSecs + tblSecs + 8) / 128);
  const file = new Uint8Array(SEC * (1 + fatSecs + 1 + wdSecs + tblSecs));
  const fv = new DataView(file.buffer);
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].forEach((b, i) => { file[i] = b; });
  fv.setUint16(0x18, 0x3e, true); fv.setUint16(0x1a, 3, true); fv.setUint16(0x1c, 0xfffe, true); fv.setUint16(0x1e, 9, true); fv.setUint16(0x20, 6, true);
  const dirSid = fatSecs, wdSid = fatSecs + 1, tblSid = wdSid + wdSecs;
  fv.setUint32(0x2c, fatSecs, true); fv.setUint32(0x30, dirSid, true); fv.setUint32(0x38, 4096, true); fv.setUint32(0x3c, ENDC, true); fv.setUint32(0x44, ENDC, true);
  for (let k = 0; k < 109; k++) fv.setUint32(0x4c + k * 4, k < fatSecs ? k : FREE, true);
  const fat = new Uint32Array(fatSecs * 128).fill(FREE);
  for (let k = 0; k < fatSecs; k++) fat[k] = 0xfffffffd;
  fat[dirSid] = ENDC;
  for (let k = 0; k < wdSecs; k++) fat[wdSid + k] = k === wdSecs - 1 ? ENDC : wdSid + k + 1;
  for (let k = 0; k < tblSecs; k++) fat[tblSid + k] = k === tblSecs - 1 ? ENDC : tblSid + k + 1;
  fat.forEach((v, k) => fv.setUint32(SEC + k * 4, v, true));
  const entry = (i: number, name: string, type: number, right: number, child: number, start: number, size: number) => {
    const o = SEC * (1 + dirSid) + i * 128;
    for (let c = 0; c < name.length; c++) fv.setUint16(o + c * 2, name.charCodeAt(c), true);
    fv.setUint16(o + 0x40, (name.length + 1) * 2, true); file[o + 0x42] = type;
    fv.setUint32(o + 0x44, FREE, true); fv.setUint32(o + 0x48, right, true); fv.setUint32(o + 0x4c, child, true);
    fv.setUint32(o + 0x74, start, true); fv.setUint32(o + 0x78, size, true);
  };
  entry(0, 'Root Entry', 5, FREE, 1, ENDC, 0);
  entry(1, 'WordDocument', 2, 2, FREE, wdSid, wdSize);
  entry(2, '1Table', 2, FREE, FREE, tblSid, tbl.length);
  file.set(wd, SEC * (1 + wdSid));
  file.set(tbl, SEC * (1 + tblSid));
  return { file, wdSize };
}

describe('recovery and binary input', () => {
  it('RTF text recovery never steps back on a negative \\bin length', async () => {
    // The old code moved back by the length: "-5" re-read part of the control word, "-6" looped forever.
    expect(extractTextFromRtf('{\\rtf1 a\\bin-5 b}')).toBe('ab');
    expect(extractTextFromRtf('{\\rtf1 hello \\bin-6x world}')).toBe('hello x world');
    expect(extractTextFromRtf('{\\rtf1 a\\bin3 xyzb}')).toBe('ab');
    // No text in the body and over 4 KB: the import falls back to recovery, which used to hang.
    const r = await importFile(enc(`{\\rtf1\\ansi{\\*\\qfjunk ${'a'.repeat(5000)} \\bin-6x}}`), 'damaged.rtf');
    expect(r.recovery).toBeTruthy();
  });

  it('a .doc piece table that repeats the same text cannot multiply it', () => {
    const one = doc97(1, 4096);
    expect(extractDoc97(one.file)!.main.length).toBeGreaterThan(4000);
    const many = doc97(300, 4096); // 1.2 million characters before the fix
    const t = Date.now();
    const d = extractDoc97(many.file)!;
    expect(d.method).toBe('piece table');
    expect(d.main.length).toBeLessThanOrEqual(many.wdSize);
    expect(Date.now() - t).toBeLessThan(2000);
  });

  it('RTF \\bin never allocates more than the file holds', () => {
    const t = Date.now();
    const d = rtfToDoc('{\\rtf1\\ansi Hello {\\pict\\pngblip\\picw10\\pich10\\bin50000000 }world}');
    expect(Date.now() - t).toBeLessThan(2000);
    expect(d.textContent).toContain('Hello');
    for (const img of find(d, 'image')) expect(String(img.attrs.src).length).toBeLessThan(1000);
    // Real binary picture data still reads.
    const png = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
    const ok = rtfToDoc(`{\\rtf1\\ansi {\\pict\\pngblip\\picw1\\pich1\\bin${png.length} ${png}}x}`);
    expect(find(ok, 'image').map((n) => n.attrs.src)).toEqual([`data:image/png;base64,${btoa(png)}`]);
  });

  it('RTF groups nested beyond the limit do not each copy the state', () => {
    const s = '{\\rtf1 ' + '{'.repeat(5000) + 'deep' + '}'.repeat(5000) + ' after}';
    const r = new RtfReader(s);
    let max = 0;
    const push = r.pushGroup.bind(r);
    r.pushGroup = () => { push(); max = Math.max(max, r.groups.length); };
    expect(r.parse().textContent).toBe('deep after');
    expect(max).toBeLessThanOrEqual(RTF_MAX_DEPTH);
  });
});

describe('markup and style injection', () => {
  const payload = '<p>Contents</p><img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a>';
  const qpd = JSON.stringify({ qf: 1, doc: { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
    { type: 'gen_block', attrs: { kind: 'toc', options: {}, cache: payload } },
    { type: 'gen_block', attrs: { kind: 'toc', options: {}, cache: '<p class="qf-toc-row"><a href="#intro"><span class="qf-toc-text">Intro</span></a></p>' } },
  ] } });

  it('generated-block caches are sanitized in HTML and EPUB exports', async () => {
    const { doc: d } = await importFile(enc(qpd), 'shared.qpd');
    const html = docToHtml(d, OPTS);
    const ch = await zipText(await exportEpubBytes(d, OPTS), 'OEBPS/chapter1.xhtml');
    for (const out of [html, ch]) {
      expect(out).not.toMatch(/onerror|<script|javascript:/);
      expect(out).toContain('<a href="#intro">');
      expect(out).toContain('Contents');
    }
  });

  it('text-box options from a .docx tag cannot carry arbitrary CSS', async () => {
    const tag = 'qf:textbox:' + JSON.stringify({ width: '100vw;position:fixed;inset:0;z-index:2147483647', bg: '#fff url(https://attacker.example/x.png)', padding: '0;position:fixed', float: 'x', kind: '"><b' });
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const d = await importDocx(await docx(`<w:sdt><w:sdtPr><w:tag w:val="${esc(tag)}"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Box</w:t></w:r></w:p></w:sdtContent></w:sdt>`), 'box.docx');
    const box = find(d, 'text_box')[0];
    expect(box.attrs).toMatchObject({ width: null, bg: null, padding: 6, float: 'none', kind: 'textbox' });
    const style = (DOMSerializer.fromSchema(S).serializeNode(box) as HTMLElement).getAttribute('style') || '';
    expect(style).not.toMatch(/position|url\(|z-index/);
    // Options Anne's Pen itself writes still round-trip.
    const attrs = { float: 'right', width: '35%', border: '2px solid var(--qf-accent1)', bg: '#fff8c5', radius: 8, rotate: 5, padding: 10, shadow: true, kind: 'callout' };
    const back = await importDocx(toArrayBuffer(await blobToBytes(await exportDocx(doc(S.nodes.text_box.create(attrs, [p('Inside')])), OPTS))), 'b.docx');
    expect(find(back, 'text_box')[0].attrs).toMatchObject(attrs);
  });
});

describe('numbers from documents', () => {
  const numbering = (start: string) => `<?xml version="1.0"?><w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="${start}"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
  const item = (t: string, ilvl = '0') => `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${t}</w:t></w:r></w:p>`;
  const noNaN = async (d: PMNode) => {
    expect(await zipText(await exportDocx(d, OPTS), 'word/numbering.xml')).not.toContain('NaN');
    expect(await zipText(await exportOdt(d, OPTS), 'content.xml')).not.toContain('NaN');
    for (const out of [docToText(d), docToMarkdown(d), docToRtf(d, OPTS), docToHtml(d, OPTS)]) expect(out).not.toContain('NaN');
  };

  it('a non-numeric list start or level does not become NaN', async () => {
    const d = await importDocx(await docx(item('First') + item('Second'), { 'numbering.xml': numbering('one') }), 'l.docx');
    expect(d.firstChild!.type.name).toBe('ordered_list');
    expect(d.firstChild!.attrs.order).toBe(1);
    await noNaN(d);
    const lv = await importDocx(await docx(item('First', 'x') + item('Second', 'x'), { 'numbering.xml': numbering('3') }), 'l.docx');
    expect(lv.firstChild!.attrs.order).toBe(3);
    expect(lv.firstChild!.childCount).toBe(2);
  });

  it('<ol start=""> imports as a list starting at 1', async () => {
    const d = await importHtml(enc('<ol start=""><li>alpha</li><li>beta</li></ol>'), 'l.html');
    expect(d.firstChild!.attrs.order).toBe(1);
    expect(docToText(d)).toBe('1. alpha\n2. beta\n');
  });

  it('exporters never write a NaN start', async () => {
    const list = S.nodes.ordered_list.create({ order: NaN }, [S.nodes.list_item.create(null, [p('alpha')]), S.nodes.list_item.create(null, [p('beta')])]);
    const d = doc(list);
    await noNaN(d);
    expect(docToText(d)).toBe('1. alpha\n2. beta\n');
  });

  it('ODT space counts are clamped instead of failing the whole import', async () => {
    const keep = (d: PMNode) => { const n = names(d); expect(n.has('table')).toBe(true); expect(n.has('mark:bold')).toBe(true); };
    keep(await importFodt(enc(fodt('<text:p>a<text:s text:c="-1"/>b</text:p>')), 'neg.fodt'));
    const big = await importFodt(enc(fodt('<text:p>x<text:note text:note-class="footnote"><text:note-citation>1</text:note-citation><text:note-body><text:p>n<text:s text:c="400000000"/>m</text:p></text:note-body></text:note></text:p>')), 'big.fodt');
    keep(big);
    expect(String(find(big, 'footnote')[0].attrs.text).length).toBeLessThanOrEqual(1002);
  });

  it('ODT style names that only look like escapes do not fail the import', async () => {
    const d = await importFodt(enc(fodt('<text:p text:style-name="Memo_202401_">memo</text:p><text:p text:style-name="Plan_ffffff_">plan</text:p>', '<style:style style:name="Memo_202401_" style:family="paragraph"/>')), 'n.fodt');
    expect(names(d).has('table')).toBe(true);
    expect(d.textContent).toContain('memo');
  });
});

describe('content fidelity', () => {
  it('Markdown import decodes UTF-16 and Windows-1252 like plain text', async () => {
    const md = '# Café\n\nNaïve résumé.\n';
    const u16 = new Uint8Array(2 + md.length * 2);
    u16[0] = 0xff; u16[1] = 0xfe;
    for (let i = 0; i < md.length; i++) { u16[2 + i * 2] = md.charCodeAt(i) & 0xff; u16[3 + i * 2] = md.charCodeAt(i) >> 8; }
    const cp1252 = Uint8Array.from(md, (c) => c.charCodeAt(0));
    for (const bytes of [u16, cp1252]) {
      const { doc: d } = await importFile(toArrayBuffer(bytes), 'notes.md');
      expect(d.firstChild!.attrs.style).toBe('Heading 1');
      expect(d.textContent).toBe('CaféNaïve résumé.');
    }
  });

  it('Markdown export keeps blank lines inside code and math blocks', () => {
    const code = 'import os\n\n\ndef main():\n    pass\n\n\n\nmain()';
    const latex = 'a\n\n\nb';
    const md = docToMarkdown(doc(p('Intro'), S.nodes.code_block.create({ language: 'python' }, S.text(code)), S.nodes.math_block.create({ latex }), p('End')));
    const back = markdownToBlocks(md);
    expect(back.find((b) => b.type.name === 'code_block')!.textContent).toBe(code);
    expect(back.find((b) => b.type.name === 'math_block')!.attrs.latex).toBe(latex);
    // Outside those blocks runs of blank lines still collapse.
    const listed = docToMarkdown(doc(S.nodes.bullet_list.create(null, [S.nodes.list_item.create(null, [p('a'), p(''), p('b')])])));
    expect(listed).not.toMatch(/\n{3}/);
  });

  it('DOCX bookmarks keep non-Latin names and stay distinct', async () => {
    const link = (t: string, href: string) => S.text(t, [S.marks.link.create({ href })]);
    const bm = (name: string) => S.nodes.bookmark.create({ name });
    const d = doc(
      S.nodes.paragraph.create(null, [link('one', '#Глава'), S.text(' '), link('two', '#Часть'), S.text(' '), link('three', '#a b'), S.text(' '), link('four', '#a_b')]),
      S.nodes.paragraph.create(null, [bm('Глава'), S.text('Глава')]),
      S.nodes.paragraph.create(null, [bm('Часть'), S.text('Часть')]),
      S.nodes.paragraph.create(null, [bm('a b'), S.text('ab1')]),
      S.nodes.paragraph.create(null, [bm('a_b'), S.text('ab2')]),
    );
    const bytes = await blobToBytes(await exportDocx(d, OPTS));
    const xml = await zipText(bytes, 'word/document.xml');
    const marks = [...xml.matchAll(/w:bookmarkStart [^>]*w:name="([^"]*)"/g)].map((m) => m[1]);
    const anchors = [...xml.matchAll(/w:anchor="([^"]*)"/g)].map((m) => m[1]);
    expect(marks).toEqual(['Глава', 'Часть', 'a_b', 'a_b_2']);
    expect(anchors).toEqual(marks);
    const back = await importDocx(toArrayBuffer(bytes), 'b.docx');
    expect(find(back, 'bookmark').map((n) => n.attrs.name)).toEqual(marks);
  });

  it('EPUB keeps literal xmlns text in content', async () => {
    const line = '<html xmlns="http://www.w3.org/1999/xhtml" lang="en">';
    const bytes = await exportEpubBytes(doc(p('Start every page with:'), S.nodes.code_block.create(null, S.text(line))), OPTS);
    const ch = await zipText(bytes, 'OEBPS/chapter1.xhtml');
    expect(wellFormed(ch)).toBe(true);
    expect(ch).not.toMatch(/<p xmlns=/);
    const back = await importEpub(toArrayBuffer(bytes), 'web.epub');
    expect(find(back, 'code_block')[0].textContent).toBe(line);
    // A third-party book.
    const z = new JSZip();
    z.file('mimetype', 'application/epub+zip');
    z.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
    z.file('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>T</dc:title></metadata><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>');
    z.file('OEBPS/c1.xhtml', '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>c</title></head><body><p>Declare it: <code>&lt;svg xmlns="http://www.w3.org/2000/svg"&gt;</code></p></body></html>');
    const book = await importEpub(toArrayBuffer(await z.generateAsync({ type: 'uint8array' })), 'book.epub');
    expect(book.textContent).toBe('Declare it: <svg xmlns="http://www.w3.org/2000/svg">');
  });

  it('a data-URL image type is never written raw into EPUB or ODT XML', async () => {
    const d = await importHtml(enc(`<p>pic <img src='data:image/png"&amp;x;base64,AAAAAAAA' alt="a"></p>`), 'p.html');
    const epub = await exportEpubBytes(d, OPTS);
    expect(wellFormed(await zipText(epub, 'OEBPS/content.opf'))).toBe(true);
    const odt = await blobToBytes(await exportOdt(d, OPTS));
    expect(wellFormed(await zipText(odt, 'content.xml'))).toBe(true);
    expect(wellFormed(await zipText(odt, 'META-INF/manifest.xml'))).toBe(true);
  });

  it('Markdown inline parsing stays linear on long runs of $ and *', () => {
    let t = Date.now();
    markdownToBlocks('$1 '.repeat(40000));
    expect(Date.now() - t).toBeLessThan(5000);
    t = Date.now();
    markdownToBlocks('a* '.repeat(80000));
    expect(Date.now() - t).toBeLessThan(5000);
    // Same results as before on ordinary text.
    const one = (md: string) => markdownToBlocks(md)[0];
    expect(find(one('Let $x$ and $y^2$ be real.'), 'math_inline').map((n) => n.attrs.latex)).toEqual(['x', 'y^2']);
    expect(find(one('It costs $5 or $10 today.'), 'math_inline')).toHaveLength(0);
    const marks = (md: string) => { const out: string[] = []; one(md).forEach((c) => out.push(`${c.text}:${c.marks.map((m) => m.type.name).join('+')}`)); return out; };
    expect(marks('*a* **b** _c_ ***d*** x* y')).toEqual(['a:italic', ' :', 'b:bold', ' :', 'c:italic', ' :', 'd:bold+italic', ' x* y:']);
  });
});
