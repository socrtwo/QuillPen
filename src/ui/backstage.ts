/** File backstage: Home, New, Open, Info, Save As, Export, Print, Share, Options. */
import type { App } from '../app';
import { h, icon, clear } from './dom';
import { TEMPLATES } from '../templates';
import { FORMATS } from '../io';
import { kvKeys, kvGet, kvDel } from '../util/store';
import { schema } from '../editor/schema';
import { countWords, docText } from '../editor/ops';
import { listChanges } from '../editor/plugins/trackChanges';
import { pageInfo } from '../editor/plugins/pagination';
import { toast } from './dialog';

const PAGES: [string, string, string][] = [
  ['home', 'Home', 'home'], ['new', 'New', 'note_add'], ['open', 'Open', 'folder_open'], ['info', 'Info', 'info'],
  ['save', 'Save', 'save'], ['saveas', 'Save As', 'save_as'], ['export', 'Export', 'ios_share'], ['print', 'Print', 'print'],
  ['share', 'Share', 'share'], ['close', 'Close', 'close'], ['options', 'Options', 'settings'],
];

export function renderBackstage(app: App, root: HTMLElement, page: string): void {
  clear(root);
  const nav = h('nav', { class: 'qf-bs-nav' }, h('button', { class: 'qf-bs-back', onclick: () => app.ui.hideBackstage(), 'aria-label': 'Back to document' }, icon('arrow_back'), ' Back'));
  for (const [id, label, ic] of PAGES) {
    const b = h('button', { class: 'qf-bs-item' + (id === page ? ' qf-on' : ''), onclick: () => {
      if (id === 'save') { app.ui.hideBackstage(); app.exec('file.save'); return; }
      if (id === 'close') { app.exec('file.close'); return; }
      if (id === 'options') { app.exec('file.options'); return; }
      renderBackstage(app, root, id);
    } }, icon(ic), ' ', label);
    nav.appendChild(b);
  }
  const body = h('div', { class: 'qf-bs-body' });
  root.append(nav, body);
  const card = (title: string, sub: string, ic: string, onclick: () => void, extra?: HTMLElement) => h('button', { class: 'qf-bs-card', onclick }, icon(ic, 'qf-bs-card-icon'), h('div', null, h('b', null, title), h('div', { class: 'qf-help' }, sub)), extra || null);
  switch (page) {
    case 'home':
    case 'new': {
      body.appendChild(h('h1', null, page === 'home' ? 'Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening') : 'New'));
      const grid = h('div', { class: 'qf-bs-templates' });
      const cats = [...new Set(TEMPLATES.map((t) => t.category))];
      for (const c of page === 'home' ? ['General', 'Business', 'Publishing'] : cats) {
        for (const t of TEMPLATES.filter((x) => x.category === c)) grid.appendChild(h('button', { class: 'qf-template', onclick: () => { app.ui.hideBackstage(); app.exec('file.new', t.id); } }, h('div', { class: 'qf-template-thumb', 'data-tpl': t.id }, icon(t.id === 'blank' ? 'note_add' : 'description')), h('b', null, t.name), h('div', { class: 'qf-help' }, t.description)));
      }
      body.appendChild(grid);
      if (page === 'new') {
        const mine = h('div', { class: 'qf-bs-templates' });
        body.append(h('h2', null, 'My Templates'), mine);
        kvKeys('tpl:').then(async (keys) => {
          if (!keys.length) mine.appendChild(h('p', { class: 'qf-help' }, 'Use File ▸ Save as Template to add your own.'));
          for (const k of keys) {
            const t = await kvGet(k);
            mine.appendChild(h('div', { class: 'qf-template' }, h('button', { class: 'qf-link', onclick: () => { app.ui.hideBackstage(); app.createTab(schema.nodeFromJSON(t.json), { title: t.name }); } }, h('b', null, t.name)), h('div', { class: 'qf-help' }, t.category), h('button', { class: 'qf-iconbtn qf-sm', title: 'Delete template', onclick: async () => { await kvDel(k); renderBackstage(app, root, 'new'); } }, icon('delete'))));
          }
        });
      }
      if (page === 'home') { body.appendChild(h('h2', null, 'Recent')); recentList(app, body); }
      break;
    }
    case 'open': {
      body.append(h('h1', null, 'Open'),
        card('Browse…', 'Open a file from this device, Drive, or any document provider', 'folder_open', () => app.exec('file.open')),
        card('Encrypted document…', 'Open a password-protected .qpde file', 'lock_open', () => app.exec('file.openEncrypted')),
        card('Open and Repair…', 'Rebuild a damaged .docx, .doc or .odt and show what was recovered', 'healing', () => app.exec('file.openRepair')),
        card('Recover Text from Any File…', 'Pull readable text out of any file, however damaged', 'text_snippet', () => app.exec('file.recoverText')),
        card('Manual recovery options', 'AutoRecover folders, version history and other ways to find a lost document', 'support', () => app.exec('file.recoveryHelp')),
        card('Recover unsaved documents', 'Drafts saved automatically before a crash or close', 'restore_page', () => app.exec('file.recover')),
        h('h2', null, 'Recent'));
      recentList(app, body, true);
      break;
    }
    case 'info': {
      const st = app.state;
      const tab = app.tab;
      const s = app.settings;
      const words = countWords(docText(st.doc));
      body.append(h('h1', null, 'Info'), h('h2', null, tab.displayName),
        h('div', { class: 'qf-bs-cards' },
          card('Protect Document', s.protection.mode === 'none' ? 'Control what changes people can make' : `Protected: ${s.protection.mode}`, 'shield_lock', () => app.exec('review.restrictEditing')),
          card('Mark as Final', s.markedFinal ? 'Document is marked final' : 'Make the document read-only', 'verified', () => app.exec('review.markFinal')),
          card('Encrypt with Password', 'Save an AES-256 encrypted copy', 'enhanced_encryption', () => app.exec('file.encrypt')),
          card('Inspect Document', 'Remove comments, tracked changes, hidden text and personal information', 'policy', () => app.exec('file.inspect')),
          card('Check Accessibility', 'Find content people with disabilities might have trouble reading', 'accessibility_new', () => { app.ui.hideBackstage(); app.exec('review.accessibility'); }),
          card('Version History', 'Browse, compare and restore snapshots', 'history', () => app.exec('file.versions')),
          card('Revert to Saved', 'Discard changes since the last save', 'settings_backup_restore', () => app.exec('file.revert'))),
        h('h3', null, 'Properties'),
        h('table', { class: 'qf-stats' },
          ...[['Title', s.properties.title || '—'], ['Author', s.properties.author || app.prefs.author], ['Words', String(words)], ['Pages', app.tab.viewMode === 'print' ? String(pageInfo(st).pages) : '(Print Layout)'], ['Comments', String(Object.keys(s.comments).length)], ['Tracked changes', String(listChanges(st.doc).length)], ['Format', tab.format.toUpperCase()], ['Location', tab.uri ? 'Device storage' : 'Not saved yet'], ['Created', new Date(tab.created).toLocaleString()], ['Last saved', tab.saved ? new Date(tab.saved).toLocaleString() : '—']].map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v)))),
        h('button', { class: 'qf-btn', onclick: () => app.exec('file.properties') }, 'All Properties…'));
      break;
    }
    case 'saveas':
    case 'export': {
      body.append(h('h1', null, page === 'saveas' ? 'Save As' : 'Export'), h('p', { class: 'qf-help' }, page === 'saveas' ? 'Choose a format. The system file dialog lets you pick the folder (device, SD card, Drive, Dropbox…).' : 'Save a copy in another format; the current document keeps its file.'));
      const grid = h('div', { class: 'qf-bs-cards' });
      for (const f of FORMATS.filter((x) => x.canExport)) grid.appendChild(card(f.label, f.note || `.${f.ext[0]}`, f.id === 'pdf' ? 'picture_as_pdf' : 'description', () => (page === 'saveas' ? app.exec('file.saveAsFormat', f.id) : f.id === 'pdf' ? app.exec('file.exportPdf') : app.exec(`file.export.${f.id}`))));
      grid.appendChild(card('Encrypted Anne\'s Pen (.qpde)', 'AES-256 password protected', 'enhanced_encryption', () => app.exec('file.encrypt')));
      grid.appendChild(card('Template', 'Reuse this document as a starting point', 'bookmark_add', () => app.exec('file.saveTemplate')));
      body.appendChild(grid);
      break;
    }
    case 'print': {
      const s = app.settings;
      body.append(h('h1', null, 'Print'),
        card('Print…', 'Opens the system print dialog (printers, Save as PDF)', 'print', () => app.exec('file.print')),
        card('Print Preview', 'Whole-page view of the document', 'preview', () => app.exec('file.printPreview')),
        card('Page Setup…', `${s.page.sizeName}, ${s.page.orientation}, margins ${Math.round(s.page.margin.top / 7.2) / 10}"`, 'settings_applications', () => app.exec('layout.pageSetup')),
        card('Export as PDF', 'Choose "Save as PDF" in the print dialog', 'picture_as_pdf', () => app.exec('file.exportPdf')));
      break;
    }
    case 'share': {
      body.append(h('h1', null, 'Share'),
        card('Share a copy…', 'Send as Word, PDF, OpenDocument, Markdown, EPUB…', 'share', () => app.exec('file.share')),
        card('Email', 'Attach to an email', 'mail', () => app.exec('file.email')),
        card('Copy as Markdown', 'Copy the whole document as Markdown text', 'markdown', async () => { const { exportMarkdown } = await import('../io/markdown'); const b = await exportMarkdown(app.state.doc, { fileName: 'x.md', author: app.prefs.author }); await navigator.clipboard?.writeText(await new Response(b).text()); toast('Markdown copied'); }));
      break;
    }
  }
}

function recentList(app: App, body: HTMLElement, full = false) {
  const list = h('div', { class: 'qf-recent' });
  const rec = app.prefs.recent;
  if (!rec.length) list.appendChild(h('p', { class: 'qf-help' }, 'Documents you open or save appear here.'));
  for (const r of rec.slice(0, full ? 40 : 8)) {
    list.appendChild(h('div', { class: 'qf-recent-row' },
      h('button', { class: 'qf-recent-open', onclick: () => app.exec('file.openRecent', r.key) }, icon('description'), h('div', null, h('b', null, r.name), h('div', { class: 'qf-help' }, new Date(r.when).toLocaleString()))),
      h('button', { class: 'qf-iconbtn', title: r.pinned ? 'Unpin' : 'Pin', onclick: () => { r.pinned = !r.pinned; app.savePrefs(); renderBackstage(app, body.parentElement!, full ? 'open' : 'home'); } }, icon(r.pinned ? 'keep_off' : 'keep')),
      h('button', { class: 'qf-iconbtn', title: 'Remove from list', onclick: () => { app.prefs.recent = app.prefs.recent.filter((x) => x !== r); app.savePrefs(); renderBackstage(app, body.parentElement!, full ? 'open' : 'home'); } }, icon('close'))));
  }
  if (full && rec.length) list.appendChild(h('button', { class: 'qf-btn', onclick: () => app.exec('file.clearRecent') }, 'Clear unpinned'));
  body.appendChild(list);
}
