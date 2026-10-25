import { describe, it, expect } from 'vitest';
import { schema } from '../../src/editor/schema';
import { defaultSettings } from '../../src/editor/settings';
import { importHtml } from '../../src/io/html';
import { emailContent, inlineCss, specificity, stripActiveContent, withOriginalFonts } from '../../src/embed/emailHtml';
import { EmbedSession, embedModeFrom, EMBED_PREFIX, CHANGED_INTERVAL_MS, type LoadRequest } from '../../src/embed/embed';
import { embedHidden } from '../../src/embed/hidden';

const S = schema;
const p = (t: string, attrs: Record<string, unknown> | null = null, marks: any[] = []) => S.nodes.paragraph.create(attrs, t ? S.text(t, marks) : null);
const docOf = (...blocks: any[]) => S.node('doc', { settings: defaultSettings() }, blocks);
const frag = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

describe('email-safe HTML', () => {
  const doc = docOf(
    p('Greetings', { style: 'Heading 1' }),
    S.nodes.paragraph.create(null, [S.text('bold', [S.marks.bold.create()]), S.text(' red', [S.marks.color.create({ color: '#c00000' })])]),
    S.nodes.bullet_list.create(null, [S.nodes.list_item.create(null, p('item a'))]),
    S.nodes.table.create(null, [S.nodes.table_row.create(null, [S.nodes.table_cell.create(null, p('1')), S.nodes.table_cell.create(null, p('2'))])]),
    p('Quoted', { style: 'Quote' }),
    S.nodes.paragraph.create(null, [S.text('pic '), S.nodes.image.create({ src: 'cid:logo@host', alt: 'Logo' }), S.nodes.image.create({ src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'dot' })]),
    S.nodes.task_list.create(null, [S.nodes.task_item.create({ checked: true }, p('done')), S.nodes.task_item.create({ checked: false }, p('todo'))]),
    S.nodes.page_break.create(),
  );
  const { html, text } = emailContent(doc);
  const root = frag(html);

  it('has no style blocks, classes, data attributes, scripts or form controls', () => {
    expect(html).not.toMatch(/<style|<script|<link|<input|<button/i);
    expect(root.querySelectorAll('[class]').length).toBe(0);
    expect([...root.querySelectorAll('*')].some((e) => [...e.attributes].some((a) => a.name.startsWith('data-')))).toBe(false);
    expect(html).not.toMatch(/var\(--/);
  });
  it('inlines the paragraph and character styles', () => {
    const h1 = root.querySelector('h1')!;
    expect(h1.getAttribute('style')).toMatch(/font-size:16pt/);
    expect(h1.getAttribute('style')).toMatch(/color:#[0-9a-f]{6}/i); // theme colour resolved, not var()
    const quote = [...root.querySelectorAll('p')].find((e) => e.textContent === 'Quoted')!;
    expect(quote.getAttribute('style')).toMatch(/font-style:italic/);
    expect(quote.getAttribute('style')).toMatch(/text-align:center/);
    expect(root.querySelector('strong')?.textContent).toBe('bold');
    expect(root.querySelector('span[style*="color"]')?.textContent).toBe(' red');
    expect(root.querySelector('td')!.getAttribute('style')).toMatch(/border:1px solid/);
    // The container carries the body font, with the original font ahead of its open stand-in.
    expect(root.firstElementChild!.getAttribute('style')).toMatch(/font-family:Calibri, "Carlito"/);
  });
  it('keeps cid: and data: images unchanged and drops page breaks', () => {
    const srcs = [...root.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(srcs).toEqual(['cid:logo@host', 'data:image/png;base64,iVBORw0KGgo=']);
    expect(html).not.toMatch(/page-break/);
  });
  it('turns check boxes into symbols and provides plain text', () => {
    expect(root.textContent).toContain('☑ done');
    expect(root.textContent).toContain('☐ todo');
    expect(text).toContain('Greetings');
    expect(text).toContain('item a');
    expect(text).not.toMatch(/</);
  });
  it('round-trips through the importer', async () => {
    const back = await importHtml(new TextEncoder().encode(html).buffer as ArrayBuffer, 'm.html', { keepCidImages: true });
    expect(back.textContent).toContain('Greetings');
    let cid = false;
    back.descendants((n) => { if (n.type === S.nodes.image && n.attrs.src === 'cid:logo@host') cid = true; return true; });
    expect(cid).toBe(true);
  });
});

describe('CSS inliner', () => {
  it('orders by specificity, then source order, keeps inline styles and honours !important', () => {
    const root = frag('<div class="a"><p class="b" id="x" style="color:green">t</p><p>u</p></div>');
    const wrap = root.firstElementChild as HTMLElement;
    inlineCss(wrap, '.a p{color:red;margin:1px} p{color:blue} .a .b{margin:2px} #x{padding:3px !important} .a p:not(.b){color:navy}');
    const [p1, p2] = [...root.querySelectorAll('p')];
    expect(p1.getAttribute('style')).toBe('color:green;margin:2px;padding:3px');
    expect(p2.getAttribute('style')).toBe('color:navy;margin:1px');
  });
  it('resolves custom properties from ancestors and fallbacks, and drops unresolved ones', () => {
    const root = frag('<div class="d"><p>t</p><span>s</span></div>');
    inlineCss(root.firstElementChild as HTMLElement, '.d{--c:#123456} .d p{color:var(--c)} .d span{color:var(--none, #abcdef);border-color:var(--missing)}');
    expect(root.querySelector('p')!.getAttribute('style')).toBe('color:#123456');
    expect(root.querySelector('span')!.getAttribute('style')).toBe('color:#abcdef');
    expect(root.firstElementChild!.hasAttribute('style')).toBe(false);
  });
  it('removes content hidden with display:none and skips @-rules', () => {
    const root = frag('<div class="d"><span class="h">secret</span> ok</div>');
    inlineCss(root.firstElementChild as HTMLElement, '@media print{.d{color:red}} .h{display:none}');
    expect(root.textContent).toBe(' ok');
    expect(root.firstElementChild!.hasAttribute('style')).toBe(false);
  });
  it('computes specificity', () => {
    expect(specificity('#a')).toBeGreaterThan(specificity('.a .b .c'));
    expect(specificity('.a .b')).toBeGreaterThan(specificity('div p span'));
    expect(specificity('p:not([data-style])')).toBe(specificity('p[x]'));
  });
  it('strips active content', () => {
    const root = frag('<div><a href="javascript:alert(1)" onclick="x()">a</a><img src="data:text/html;base64,PHM+" onerror="y()"><script>z()</script><iframe src="x"></iframe><img src="cid:ok"></div>');
    stripActiveContent(root.firstElementChild as HTMLElement);
    expect(root.innerHTML).toBe('<div><a>a</a><img><img src="cid:ok"></div>');
  });
  it('maps open fonts back to the originals', () => {
    expect(withOriginalFonts('"Carlito", sans-serif')).toBe('Calibri, "Carlito", sans-serif');
    expect(withOriginalFonts('Calibri, "Carlito", sans-serif')).toBe('Calibri, "Carlito", sans-serif');
    expect(withOriginalFonts('"Lato", sans-serif')).toBe('"Lato", sans-serif');
  });
});

describe('embed protocol', () => {
  const setup = () => {
    const sent: { msg: any; origin: string }[] = [];
    const parent = { postMessage: (msg: unknown, origin: string) => sent.push({ msg, origin }) };
    let now = 0;
    const timers: { at: number; fn: () => void }[] = [];
    const loads: LoadRequest[] = [];
    const editor = { load: (r: LoadRequest) => { loads.push(r); }, content: () => ({ html: '<p style="margin:0">Hi</p>', text: 'Hi\n' }) };
    const s = new EmbedSession(editor, {
      parent, appVersion: '9.9', now: () => now,
      setTimeout: (fn, ms) => { const t = { at: now + ms, fn }; timers.push(t); return t; },
      clearTimeout: (h) => { const i = timers.indexOf(h as any); if (i >= 0) timers.splice(i, 1); },
    });
    const advance = (ms: number) => { now += ms; for (const t of [...timers].sort((a, b) => a.at - b.at)) if (t.at <= now) { timers.splice(timers.indexOf(t), 1); t.fn(); } };
    const msg = (data: any, origin = 'https://post.example', source: unknown = parent) => s.handle({ source, origin, data });
    return { s, sent, parent, loads, advance, msg, types: () => sent.map((x) => x.msg.type.replace(EMBED_PREFIX, '')) };
  };

  it('detects the mode from the query string', () => {
    expect(embedModeFrom('?embed=compose&host=quillpost&v=1')).toBe('compose');
    expect(embedModeFrom('?embed=other')).toBeNull();
    expect(embedModeFrom('')).toBeNull();
  });
  it('announces itself, then loads what the host sends', async () => {
    const t = setup();
    t.s.ready();
    expect(t.sent[0]).toEqual({ msg: { type: 'quill-embed:ready', v: 1, app: 'Anne\'s Pen', version: '9.9' }, origin: '*' });
    expect(await t.msg({ type: 'quill-embed:load', v: 1, html: '<p>x</p>', subject: 'Hello', theme: 'dark', lang: 'de-AT' })).toBe(true);
    expect(t.loads).toEqual([{ html: '<p>x</p>', subject: 'Hello', theme: 'dark', lang: 'de-AT' }]);
  });
  it('drops bad field values', async () => {
    const t = setup();
    await t.msg({ type: 'quill-embed:load', v: 1, html: 5, theme: 'neon', lang: 'x"><script>' });
    expect(t.loads).toEqual([{ html: '' }]);
  });
  it('answers requests, addressed to the host origin', async () => {
    const t = setup();
    await t.msg({ type: 'quill-embed:load', v: 1, html: '' });
    await t.msg({ type: 'quill-embed:request', v: 1, id: 'q7' });
    expect(t.sent.at(-1)).toEqual({ msg: { type: 'quill-embed:content', v: 1, id: 'q7', html: '<p style="margin:0">Hi</p>', text: 'Hi\n' }, origin: 'https://post.example' });
  });
  it('ignores other windows, other origins, other versions and foreign messages', async () => {
    const t = setup();
    expect(await t.msg({ type: 'quill-embed:load', v: 1, html: 'a' }, 'https://post.example', {})).toBe(false);
    expect(await t.msg({ type: 'quill-embed:load', v: 2, html: 'a' })).toBe(false);
    expect(await t.msg({ type: 'something', v: 1 })).toBe(false);
    expect(await t.msg('quill-embed:load')).toBe(false);
    await t.msg({ type: 'quill-embed:load', v: 1, html: 'ok' });
    expect(await t.msg({ type: 'quill-embed:request', v: 1, id: '1' }, 'https://evil.example')).toBe(false);
    expect(t.loads.map((l) => l.html)).toEqual(['ok']);
    expect(t.types()).toEqual([]);
  });
  it('reports changes at most every two seconds', async () => {
    const t = setup();
    await t.msg({ type: 'quill-embed:load', v: 1, html: '' });
    t.s.changed();
    expect(t.types()).toEqual(['changed']);
    expect(t.sent[0].msg).toEqual({ type: 'quill-embed:changed', v: 1, dirty: true });
    t.advance(500); t.s.changed(); t.s.changed();
    expect(t.types()).toEqual(['changed']);
    t.advance(CHANGED_INTERVAL_MS - 600);
    expect(t.types()).toEqual(['changed']);
    t.advance(100);
    expect(t.types()).toEqual(['changed', 'changed']);
    t.advance(5000);
    expect(t.types()).toEqual(['changed', 'changed']);
  });
  it('sends done and cancel, and no change report after them', async () => {
    const t = setup();
    await t.msg({ type: 'quill-embed:load', v: 1, html: '' });
    t.s.changed(); t.advance(100); t.s.changed();
    t.s.done();
    t.advance(5000);
    expect(t.types()).toEqual(['changed', 'done']);
    expect(t.sent.at(-1)!.msg).toEqual({ type: 'quill-embed:done', v: 1, html: '<p style="margin:0">Hi</p>', text: 'Hi\n' });
    t.s.cancel();
    expect(t.sent.at(-1)).toEqual({ msg: { type: 'quill-embed:cancel', v: 1 }, origin: 'https://post.example' });
  });
  it('does not report the load itself as a change', async () => {
    const sent: string[] = [];
    let session!: EmbedSession;
    const editor = { load: () => { session.changed(); }, content: () => ({ html: '', text: '' }) };
    const parent = { postMessage: (m: any) => sent.push(m.type) };
    session = new EmbedSession(editor, { parent, appVersion: '1' });
    await session.handle({ source: parent, origin: 'https://a', data: { type: 'quill-embed:load', v: 1, html: '' } });
    expect(sent).toEqual([]);
  });
});

describe('embedded editor commands', () => {
  it('hides commands that open, save, close, print or send files', () => {
    for (const id of ['file.open', 'file.save', 'file.saveAs', 'file.close', 'file.new', 'file.openRecent', 'file.recover', 'file.print', 'file.export.docx', 'file.share', 'file.versions', 'file.autosave'])
      expect(embedHidden(id), id).toBe(true);
    for (const id of ['file.options', 'file.customizeQat', 'file.exportSettings', 'file.inspect', 'edit.undo', 'fmt.bold', 'ai.rewrite'])
      expect(embedHidden(id), id).toBe(false);
  });
});
