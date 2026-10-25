/** Application shell: title bar, Quick Access Bar, tabs + ribbon, document area, panes, status bar. */
import type { App, DocTab } from '../app';
import type { EditorView } from 'prosemirror-view';
import type { Node as PMNode } from 'prosemirror-model';
import { NodeSelection } from 'prosemirror-state';
import { isInTable } from 'prosemirror-tables';
import { getCommand, allCommands, searchCommands, type Command, type MenuEntry } from '../commands/registry';
import { h, icon, clear, isPhone, esc } from './dom';
import { showMenu, closeMenus, openDialog, toast, safeInsets } from './dialog';
import { DEFAULT_TABS, tabsFor, type RibbonTab } from './ribbonLayout';
import { prettyKey, canonicalKey, keyName } from '../editor/setup';
import { pageInfo, pageOfPos } from '../editor/plugins/pagination';
import { trackKey, listChanges } from '../editor/plugins/trackChanges';
import { proofKey } from '../editor/plugins/decorations';
import { countWords, docText, selectedText, currentParagraph, paraAttr, effectiveParaProp, setParaAttrs } from '../editor/ops';
import { pageDims } from '../editor/settings';
import { quickStyles, resolveStyles, effectiveStyle, fontStack } from '../editor/styles';
import { currentFontFamily, currentFontSize, applySize } from '../commands/format';
import { PANES, type PaneDef } from './panes';
import { customizeQat, customizeRibbon, customizeKeyboard } from './customize';
import { renderBackstage } from './backstage';
import { controlClick } from '../commands/developer';
import { schema } from '../editor/schema';
import { embedHidden } from '../embed/hidden';
import { toUnit, fromUnit } from '../prefs';

const SLASH_ITEMS = ['style.p.Heading1', 'style.p.Heading2', 'style.p.Heading3', 'style.p.Normal', 'style.p.Quote', 'list.bullets', 'list.numbering', 'list.checklist', 'insert.table', 'insert.picture', 'insert.codeBlock', 'insert.hr', 'insert.pageBreak', 'insert.equation', 'insert.textBox', 'insert.chart', 'insert.diagram', 'insert.shapes', 'refs.toc', 'refs.footnote', 'insert.dateTime', 'insert.emoji', 'insert.symbol', 'insert.chip', 'draw.canvas', 'insert.lorem', 'review.newComment', 'insert.link', 'insert.snippets'];

export class Shell {
  root: HTMLElement;
  titlebar!: HTMLElement;
  qatEl!: HTMLElement;
  qatBottom!: HTMLElement;
  tabsEl!: HTMLElement;
  ribbonEl!: HTMLElement;
  docTabsEl!: HTMLElement;
  workspace!: HTMLElement;
  paneEl!: HTMLElement;
  statusEl!: HTMLElement;
  backstageEl!: HTMLElement;
  miniBar!: HTMLElement;
  titleBtn!: HTMLElement;
  currentTab = 'home';
  ribbonOpen = true;
  pane: { def: PaneDef; el: HTMLElement; opts: any } | null = null;
  statusMsg = '';
  private statusTimer: any;
  private statsDoc: PMNode | null = null;
  private statsWords = 0;
  private statsChanges = 0;

  constructor(public app: App) {
    this.root = app.host;
    this.build();
    this.applyPrefs();
    window.addEventListener('resize', () => { for (const d of app.docs) app.applyZoom(d); this.positionMiniBar(); });
    document.addEventListener('keydown', (e) => this.globalKey(e), true);
    document.addEventListener('selectionchange', () => this.positionMiniBar());
  }

  // ----------------------------------------------------------------------------------------
  // Layout

  build(): void {
    clear(this.root);
    this.root.className = 'qf-app';
    this.titlebar = h('header', { class: 'qf-titlebar' });
    const fileBtn = h('button', { class: 'qf-iconbtn qf-filebtn', title: 'File', 'aria-label': 'File menu', onclick: () => this.showBackstage() }, icon('menu'));
    this.qatEl = h('div', { class: 'qf-qat', role: 'toolbar', 'aria-label': 'Quick Access Bar' });
    this.titleBtn = h('button', { class: 'qf-title', title: 'Rename / document info', onclick: () => this.renameDoc() }, 'Document');
    const search = h('button', { class: 'qf-iconbtn', title: 'Search commands (Alt+Q)', 'aria-label': 'Search commands', onclick: () => this.commandPalette() }, icon('search'));
    const more = h('button', { class: 'qf-iconbtn', title: 'More', 'aria-label': 'More', onclick: (e: MouseEvent) => this.moreMenu(e.currentTarget as HTMLElement) }, icon('more_vert'));
    this.titlebar.append(fileBtn, this.qatEl, this.titleBtn, h('span', { class: 'qf-spacer' }), search, more);
    this.tabsEl = h('nav', { class: 'qf-tabs', role: 'tablist' });
    this.ribbonEl = h('div', { class: 'qf-ribbon', role: 'toolbar' });
    this.docTabsEl = h('div', { class: 'qf-doctabs' });
    this.workspace = h('div', { class: 'qf-workspace' });
    this.paneEl = h('aside', { class: 'qf-pane', 'aria-hidden': 'true' });
    const main = h('main', { class: 'qf-main' }, this.workspace, this.paneEl);
    this.qatBottom = h('div', { class: 'qf-qat qf-qat-bottom', role: 'toolbar' });
    this.statusEl = h('footer', { class: 'qf-status' });
    this.backstageEl = h('div', { class: 'qf-backstage', 'aria-hidden': 'true' });
    this.miniBar = h('div', { class: 'qf-minibar', role: 'toolbar' });
    // Distraction-free writing hides every bar: this button (and Esc) brings them back, also on touch screens.
    const zenExit = h('button', { class: 'qf-iconbtn qf-zen-exit', title: 'Exit distraction-free writing (Esc)', 'aria-label': 'Exit distraction-free writing', onclick: () => this.app.exec('view.distractionFree') }, icon('close_fullscreen'));
    this.root.append(this.titlebar, this.tabsEl, this.ribbonEl, this.docTabsEl, main, this.qatBottom, this.statusEl, this.backstageEl, this.miniBar, zenExit, h('div', { class: 'qf-toasts' }));
    if (this.app.embedded) {
      // Embedded in Anne's Post: a slim bar hands the message back (Done) or leaves it unchanged (Cancel).
      this.root.classList.add('qf-embed');
      const bar = h('div', { class: 'qf-embed-bar', role: 'toolbar', 'aria-label': 'Message editor' },
        icon('edit_note'), h('span', { class: 'qf-embed-title' }, 'Editing message'), h('span', { class: 'qf-spacer' }),
        h('button', { class: 'qf-btn qf-embed-cancel', type: 'button', onclick: () => this.app.embedControls?.cancel() }, 'Cancel'),
        h('button', { class: 'qf-btn qf-primary qf-embed-done', type: 'button', onclick: () => this.app.embedControls?.done() }, icon('check'), 'Done'));
      this.root.prepend(bar);
    }
    this.renderQat();
    this.renderTabs();
    this.renderRibbon();
    this.renderMiniBar();
  }

  rebuild(): void {
    this.renderQat();
    this.renderTabs();
    this.renderRibbon();
    this.refresh();
  }

  mountTab(tab: DocTab): void {
    tab.el = h('div', { class: 'qf-scroll', tabindex: '-1' });
    const ruler = h('div', { class: 'qf-ruler' });
    tab.page = h('div', { class: 'qf-page qf-doc' });
    tab.mount = h('div', { class: 'qf-mount' });
    const overlays = h('div', { class: 'qf-page-overlays', 'aria-hidden': 'true' });
    tab.page.append(overlays, tab.mount);
    tab.el.append(ruler, tab.page);
    this.workspace.appendChild(tab.el);
    tab.el.addEventListener('qf-paginated', () => { this.drawOverlays(tab); this.refresh(); });
    tab.el.addEventListener('scroll', () => this.positionMiniBar(), { passive: true });
    this.attachPinchZoom(tab);
    this.attachRuler(tab, ruler);
  }

  // ----------------------------------------------------------------------------------------
  // Quick Access Bar

  renderQat(): void {
    const target = this.app.prefs.qatPosition === 'bottom' ? this.qatBottom : this.qatEl;
    clear(this.qatEl); clear(this.qatBottom);
    for (const id of this.app.prefs.qat) {
      if (id === '|') { target.appendChild(h('span', { class: 'qf-qat-sep' })); continue; }
      const c = getCommand(id);
      if (!c || this.hidden(id)) continue;
      const b = this.commandButton(c, 'qat');
      target.appendChild(b);
    }
    target.appendChild(h('button', { class: 'qf-iconbtn qf-qat-customize', title: 'Customize Quick Access Bar', 'aria-label': 'Customize Quick Access Bar', onclick: (e: MouseEvent) => this.qatMenu(e.currentTarget as HTMLElement) }, icon('arrow_drop_down')));
  }

  qatMenu(anchor: HTMLElement): void {
    const common = ['file.new', 'file.open', 'file.save', 'file.saveAs', 'edit.undo', 'edit.redo', 'file.print', 'file.printPreview', 'file.share', 'review.spelling', 'review.readAloud', 'fmt.bold', 'list.bullets', 'insert.table', 'insert.picture', 'edit.find', 'view.formattingMarks', 'view.cmdSearch', 'review.trackChanges', 'view.print', 'view.mobile'];
    const q = this.app.prefs.qat;
    showMenu([
      { heading: 'Customize Quick Access Bar' },
      ...common.filter((id) => !this.hidden(id)).map((id) => ({ id, label: getCommand(id)?.label || id, checked: q.includes(id), arg: '__toggle' })),
      { separator: true },
      { id: '__more', label: 'More Commands…', icon: 'library_add' },
      { id: '__pos', label: this.app.prefs.qatPosition === 'bottom' ? 'Show Above the Ribbon' : 'Show at the Bottom (near keyboard)', icon: 'swap_vert' },
      { id: '__labels', label: this.app.prefs.qatLabels ? 'Hide Command Labels' : 'Show Command Labels', icon: 'label' },
      { id: '__ribbon', label: this.app.prefs.ribbon === 'full' ? 'Collapse the Ribbon' : 'Show the Ribbon', icon: 'expand_less' },
    ], {
      anchor, onPick: (e) => {
        const p = this.app.prefs;
        if (e.arg === '__toggle' && e.id) { p.qat = q.includes(e.id) ? q.filter((x) => x !== e.id) : [...q, e.id]; }
        else if (e.id === '__more') { this.customizeQat(); return; }
        else if (e.id === '__pos') p.qatPosition = p.qatPosition === 'bottom' ? 'top' : 'bottom';
        else if (e.id === '__labels') p.qatLabels = !p.qatLabels;
        else if (e.id === '__ribbon') p.ribbon = p.ribbon === 'full' ? 'tabs' : 'full';
        this.app.savePrefs();
        this.applyPrefs();
        this.renderQat();
        this.refresh();
      },
    });
  }

  // ----------------------------------------------------------------------------------------
  // Tabs and ribbon

  renderTabs(): void {
    clear(this.tabsEl);
    if (!this.app.embedded) this.tabsEl.appendChild(h('button', { class: 'qf-tab qf-tab-file', role: 'tab', onclick: () => this.showBackstage() }, 'File'));
    for (const t of tabsFor(this.app)) {
      const b = h('button', { class: 'qf-tab' + (t.contextual ? ' qf-contextual' : '') + (t.id === this.currentTab ? ' qf-active' : ''), role: 'tab', 'data-tab': t.id, style: t.accent ? `--tab-accent:${t.accent}` : '' }, t.label);
      b.addEventListener('click', () => {
        if (this.currentTab === t.id && this.app.prefs.ribbon !== 'hidden') { this.ribbonOpen = !this.ribbonOpen; this.root.classList.toggle('qf-ribbon-closed', !this.ribbonOpen); return; }
        this.currentTab = t.id; this.ribbonOpen = true; this.root.classList.remove('qf-ribbon-closed');
        this.renderTabs(); this.renderRibbon(); this.refresh();
        b.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      });
      b.addEventListener('dblclick', () => { this.app.exec('view.collapseRibbon'); });
      this.tabsEl.appendChild(b);
    }
  }

  /** Commands left out of the embedded editor (file commands: the embedding app owns the document). */
  hidden(id: string): boolean { return this.app.embedded && embedHidden(id); }

  ribbonTab(): RibbonTab {
    return tabsFor(this.app).find((t) => t.id === this.currentTab) || DEFAULT_TABS[0];
  }

  renderRibbon(): void {
    clear(this.ribbonEl);
    const tab = this.ribbonTab();
    for (const g of tab.groups) {
      const items = h('div', { class: 'qf-group-items' });
      for (const id of g.items) {
        const c = getCommand(id);
        if (!c || this.hidden(id)) continue;
        items.appendChild(this.ribbonItem(c));
      }
      if (!items.childElementCount) continue;
      const label = h('div', { class: 'qf-group-label' }, g.label, g.launcher ? h('button', { class: 'qf-launcher', title: `${g.label} settings`, 'aria-label': `${g.label} settings`, onclick: () => this.app.exec(g.launcher!) }, icon('open_in_new')) : null);
      this.ribbonEl.appendChild(h('section', { class: 'qf-group', 'data-group': g.id }, items, label));
    }
    this.ribbonEl.scrollLeft = 0;
  }

  ribbonItem(c: Command): HTMLElement {
    switch (c.kind) {
      case 'font': return this.fontBox(c);
      case 'size': return this.sizeBox(c);
      case 'gallery': return this.gallery(c);
      default: return this.commandButton(c, 'ribbon');
    }
  }

  commandButton(c: Command, where: 'ribbon' | 'qat' | 'mini'): HTMLElement {
    const showLabel = where === 'ribbon' || (where === 'qat' && this.app.prefs.qatLabels);
    const key = c.keys?.[0] ? ` (${prettyKey(c.keys[0])})` : '';
    const main = h('button', { class: 'qf-cmd', 'data-cmd': c.id, title: (c.tip ? `${c.label}: ${c.tip}` : c.label) + key, 'aria-label': c.label, type: 'button' }, icon(c.icon), showLabel ? h('span', { class: 'qf-cmd-label' }, c.label.replace(/…$/, '')) : null);
    if (c.kind === 'color') {
      const bar = h('span', { class: 'qf-colorbar' });
      main.appendChild(bar);
    }
    let longPress: any;
    main.addEventListener('pointerdown', () => { longPress = setTimeout(() => { longPress = 'fired'; this.longPress(c, main); }, 550); });
    main.addEventListener('pointerup', () => { if (longPress !== 'fired') clearTimeout(longPress); });
    main.addEventListener('pointerleave', () => { if (longPress !== 'fired') clearTimeout(longPress); });
    main.addEventListener('click', (e) => {
      if (longPress === 'fired') { longPress = null; e.preventDefault(); return; }
      if (c.kind === 'menu') { this.openCommandMenu(c, main); return; }
      this.app.exec(c.id);
      if (where !== 'qat' && !['menu', 'split', 'color'].includes(c.kind || '')) setTimeout(() => this.app.focus(), 0);
    });
    main.addEventListener('mousedown', (e) => e.preventDefault()); // keep editor selection
    if (c.kind === 'menu') main.appendChild(icon('arrow_drop_down', 'qf-caret'));
    if (c.kind === 'split' || c.kind === 'color') {
      const arrow = h('button', { class: 'qf-split-arrow', type: 'button', title: `${c.label} options`, 'aria-label': `${c.label} options` }, icon('arrow_drop_down'));
      arrow.addEventListener('mousedown', (e) => e.preventDefault());
      arrow.addEventListener('click', () => (c.kind === 'color' ? this.app.exec(c.id, 'menu') : this.openCommandMenu(c, wrap)));
      const wrap = h('span', { class: 'qf-split', 'data-cmd-wrap': c.id }, main, arrow);
      return wrap;
    }
    return main;
  }

  longPress(c: Command, el: HTMLElement): void {
    const inQat = this.app.prefs.qat.includes(c.id);
    showMenu([
      { id: '__qat', label: inQat ? 'Remove from Quick Access Bar' : 'Add to Quick Access Bar', icon: inQat ? 'remove_circle' : 'add_circle' },
      ...(c.id === 'fmt.painter' ? [{ id: '__sticky', label: 'Keep Format Painter On', icon: 'format_paint' }] : []),
      { id: '__key', label: 'Assign Shortcut…', icon: 'keyboard' },
      { id: '__info', label: `About: ${c.label}`, icon: 'info' },
    ], {
      anchor: el, onPick: (e) => {
        if (e.id === '__qat') { this.app.prefs.qat = inQat ? this.app.prefs.qat.filter((x) => x !== c.id) : [...this.app.prefs.qat, c.id]; this.app.savePrefs(); this.renderQat(); this.refresh(); toast(inQat ? 'Removed from Quick Access Bar' : 'Added to Quick Access Bar'); }
        if (e.id === '__sticky') this.app.exec('fmt.painter', 'sticky');
        if (e.id === '__key') this.customizeKeyboard(c.id);
        if (e.id === '__info') toast(`${c.label} — ${c.tab}${c.group ? ' ▸ ' + c.group : ''}${c.keys?.length ? ' — ' + c.keys.map(prettyKey).join(', ') : ''}${c.origin ? ' — inspired by ' + c.origin : ''}`, { ms: 5000 });
      },
    });
  }

  openCommandMenu(c: Command, anchor: HTMLElement): void {
    const entries = c.menu ? c.menu(this.app) : [];
    showMenu(entries, { anchor, onPick: (e) => this.pickEntry(c, e) });
  }

  pickEntry(c: Command, e: MenuEntry): void {
    if (!e.id) return;
    if (e.id === c.id) this.app.exec(c.id, e.arg);
    else this.app.exec(e.id, e.arg);
    setTimeout(() => this.app.focus(), 0);
  }

  fontBox(c: Command): HTMLElement {
    const b = h('button', { class: 'qf-combo qf-fontbox', 'data-cmd': c.id, 'data-combo': 'font', title: 'Font', type: 'button' }, h('span', { class: 'qf-combo-text' }, 'Font'), icon('arrow_drop_down'));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      const entries = c.menu!(this.app);
      const input = h('input', { class: 'qf-menu-search', placeholder: 'Search fonts or type a name…' }) as HTMLInputElement;
      const m = showMenu(entries, { anchor: b, onPick: (e) => { this.app.exec('fmt.font', e.arg); this.app.focus(); }, className: 'qf-font-menu' });
      m.prepend(input);
      input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        m.querySelectorAll<HTMLElement>('.qf-menu-item').forEach((it) => { it.style.display = it.textContent!.toLowerCase().includes(q) ? '' : 'none'; });
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value) { closeMenus(); this.app.exec('fmt.font', input.value); this.app.focus(); } });
      setTimeout(() => { if (!isPhone()) input.focus(); }, 20);
    });
    return b;
  }

  sizeBox(c: Command): HTMLElement {
    const wrap = h('span', { class: 'qf-sizebox', 'data-cmd-wrap': c.id });
    const input = h('input', { class: 'qf-size-input', 'data-combo': c.id === 'fmt.size' ? 'size' : c.id, inputmode: 'decimal', 'aria-label': c.label, title: c.label }) as HTMLInputElement;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const val = parseFloat(input.value); if (!isNaN(val)) this.app.exec(c.id, c.id.startsWith('layout.indent') ? String(val) : val); this.app.focus(); }
      if (e.key === 'Escape') this.app.focus();
    });
    const arrow = h('button', { class: 'qf-split-arrow', type: 'button', 'aria-label': `${c.label} list` }, icon('arrow_drop_down'));
    arrow.addEventListener('mousedown', (e) => e.preventDefault());
    arrow.addEventListener('click', () => { if (c.menu) this.openCommandMenu(c, wrap); else this.app.exec(c.id); });
    const lab = h('span', { class: 'qf-size-label' }, c.id === 'fmt.size' ? '' : c.label.replace(/^(Indent|Spacing) /, ''));
    wrap.append(lab, input, arrow);
    return wrap;
  }

  gallery(c: Command): HTMLElement {
    const wrap = h('div', { class: 'qf-gallery', 'data-gallery': c.id });
    const strip = h('div', { class: 'qf-gallery-strip' });
    const more = h('button', { class: 'qf-gallery-more', title: 'More', 'aria-label': `More ${c.label}` }, icon('expand_more'));
    more.addEventListener('mousedown', (e) => e.preventDefault());
    more.addEventListener('click', () => (c.id === 'style.apply' ? this.app.exec('style.pane') : this.openCommandMenu(c, wrap)));
    wrap.append(strip, more);
    return wrap;
  }

  fillGalleries(): void {
    this.ribbonEl.querySelectorAll<HTMLElement>('[data-gallery]').forEach((wrap) => {
      const id = wrap.dataset.gallery!;
      const c = getCommand(id);
      if (!c?.menu) return;
      const strip = wrap.querySelector('.qf-gallery-strip')!;
      const entries = c.menu(this.app);
      const sig = JSON.stringify(entries.map((e) => [e.label, e.checked]));
      if (strip.getAttribute('data-sig') === sig) return;
      strip.setAttribute('data-sig', sig);
      clear(strip as HTMLElement);
      const s = this.app.settings;
      const map = resolveStyles(s);
      const cur = currentParagraph(this.app.state)?.attrs.style || 'Normal';
      for (const e of entries) {
        let style = e.preview || '';
        if (id === 'style.apply' && e.arg) {
          const st = effectiveStyle(map, e.arg);
          style = `font-family:${fontStack(st.font || '+body', s)};font-weight:${st.bold ? 700 : 400};font-style:${st.italic ? 'italic' : 'normal'};color:${st.color && !String(st.color).startsWith('var') ? st.color : 'inherit'};${st.caps ? 'text-transform:uppercase;' : ''}${st.smallCaps ? 'font-variant:small-caps;' : ''}font-size:${Math.min(16, Math.max(10, (st.size || 11) * 0.8))}px`;
        }
        const chip = h('button', { class: 'qf-gallery-item' + ((id === 'style.apply' ? e.arg === cur : e.checked) ? ' qf-on' : ''), title: e.label || '', type: 'button' }, h('span', { style }, id === 'style.apply' ? 'AaBb' : e.label || ''), id === 'style.apply' ? h('small', null, e.label || '') : null);
        chip.addEventListener('mousedown', (ev) => ev.preventDefault());
        chip.addEventListener('click', () => { this.app.exec(e.id || id, e.arg); this.app.focus(); });
        strip.appendChild(chip);
      }
    });
  }

  // ----------------------------------------------------------------------------------------
  // Refresh (state → UI)

  refresh(): void {
    const app = this.app;
    if (!app.active) return;
    // contextual tabs
    for (const t of DEFAULT_TABS.filter((x) => x.contextual)) {
      const el = this.tabsEl.querySelector<HTMLElement>(`[data-tab="${t.id}"]`);
      const show = t.contextual!(app);
      if (el) el.style.display = show ? '' : 'none';
      if (!show && this.currentTab === t.id) { this.currentTab = 'home'; this.renderTabs(); this.renderRibbon(); }
    }
    const buttons = this.root.querySelectorAll<HTMLElement>('[data-cmd]');
    for (const b of buttons) {
      const c = getCommand(b.dataset.cmd!);
      if (!c) continue;
      let active = false, enabled = true;
      try { active = !!c.isActive?.(app); enabled = c.isEnabled ? c.isEnabled(app) : true; } catch { /* */ }
      b.classList.toggle('qf-on', active);
      b.setAttribute('aria-pressed', String(active));
      b.classList.toggle('qf-disabled', !enabled);
    }
    const fontEl = this.ribbonEl.querySelector<HTMLElement>('[data-combo=font] .qf-combo-text');
    if (fontEl) { const f = currentFontFamily(app); fontEl.textContent = f; fontEl.style.fontFamily = `"${f.replace(/ \((Body|Headings)\)$/, '')}"`; }
    const u = app.prefs.units;
    this.root.querySelectorAll<HTMLInputElement>('input[data-combo]').forEach((inp) => {
      if (document.activeElement === inp) return;
      const k = inp.dataset.combo;
      if (k === 'size') inp.value = String(currentFontSize(app) ?? '');
      if (k === 'layout.indentLeft') inp.value = String(toUnit(paraAttr(app.state, 'indentLeft') || 0, u));
      if (k === 'layout.indentRight') inp.value = String(toUnit(paraAttr(app.state, 'indentRight') || 0, u));
      if (k === 'layout.spaceBefore') inp.value = String(effectiveParaProp(app.state, 'spaceBefore') ?? 0);
      if (k === 'layout.spaceAfter') inp.value = String(effectiveParaProp(app.state, 'spaceAfter') ?? 0);
    });
    this.fillGalleries();
    this.renderStatus();
    this.updateRuler(app.tab);
    if (this.pane?.def.update) this.pane.def.update(app, this.pane.el, this.pane.opts);
    this.positionMiniBar();
    this.titleBtn.textContent = app.tab.displayName + (app.tab.dirty ? ' •' : '');
  }

  // ----------------------------------------------------------------------------------------
  // Status bar

  renderStatus(): void {
    const app = this.app;
    const st = app.state;
    const tab = app.tab;
    clear(this.statusEl);
    const info = pageInfo(st);
    const paged = tab.viewMode === 'print';
    if (this.statsDoc !== st.doc) { this.statsDoc = st.doc; this.statsWords = countWords(docText(st.doc)); this.statsChanges = listChanges(st.doc).length; }
    const words = this.statsWords;
    const selWords = st.selection.empty ? 0 : countWords(selectedText(st));
    if (tab.sessionStartWords < 0) tab.sessionStartWords = words;
    const item = (text: string, onclick?: () => void, title?: string, cls = '') => h('button', { class: 'qf-status-item ' + cls, onclick, title: title || text, type: 'button' }, text);
    if (paged) this.statusEl.appendChild(item(`Page ${pageOfPos(st, st.selection.head)} of ${info.pages}`, () => app.exec('nav.goto'), 'Go To'));
    this.statusEl.appendChild(item(selWords ? `${selWords} of ${words} words` : `${words} words`, () => app.exec('review.wordCount'), 'Word Count'));
    if (app.prefs.writingGoal > 0) {
      const done = Math.max(0, words - tab.sessionStartWords);
      const pct = Math.min(100, Math.round((done / app.prefs.writingGoal) * 100));
      const g = item(`🎯 ${done}/${app.prefs.writingGoal}`, () => app.exec('view.writingGoal'), 'Session writing goal', pct >= 100 ? 'qf-goal-done' : '');
      g.style.setProperty('--pct', pct + '%');
      g.classList.add('qf-goal');
      this.statusEl.appendChild(g);
    }
    const issues = proofKey.getState(st)?.issues.length || 0;
    if (app.prefs.spellcheck || app.prefs.grammar) this.statusEl.appendChild(item(issues ? `⚠ ${issues}` : '✓', () => app.exec('review.spelling'), issues ? `${issues} proofing issue(s)` : 'No proofing errors'));
    const tracking = trackKey.getState(st)?.enabled || app.settings.protection.mode === 'tracked';
    const nChanges = this.statsChanges;
    if (tracking || nChanges) this.statusEl.appendChild(item(tracking ? `Track Changes: On${nChanges ? ` (${nChanges})` : ''}` : `${nChanges} change(s)`, () => app.exec('review.trackChanges'), 'Toggle Track Changes', tracking ? 'qf-status-track' : ''));
    if (app.recording) this.statusEl.appendChild(item(app.recordingPaused ? '⏸ Paused' : '● REC', () => app.exec('dev.stopRecording'), 'Stop recording macro', 'qf-status-rec'));
    if (app.settings.protection.mode !== 'none' || app.settings.markedFinal) this.statusEl.appendChild(item('🔒', () => app.exec('review.restrictEditing'), 'Protection'));
    this.statusEl.appendChild(item(app.settings.language, () => app.exec('fmt.language'), 'Language'));
    if (this.statusMsg) this.statusEl.appendChild(h('span', { class: 'qf-status-msg' }, this.statusMsg));
    this.statusEl.appendChild(h('span', { class: 'qf-spacer' }));
    const views: [string, string, string][] = [['read', 'chrome_reader_mode', 'Read Mode'], ['print', 'description', 'Print Layout'], ['mobile', 'smartphone', 'Mobile View'], ['web', 'public', 'Web Layout']];
    for (const [m, ic, l] of views) this.statusEl.appendChild(h('button', { class: 'qf-iconbtn qf-status-view' + (tab.viewMode === m ? ' qf-on' : ''), title: l, 'aria-label': l, onclick: () => app.exec(`view.${m}`) }, icon(ic)));
    const zoom = h('button', { class: 'qf-status-item qf-zoom', title: 'Zoom', onclick: () => app.exec('view.zoom') }, `${Math.round(tab.zoom * 100)}%`);
    this.statusEl.append(h('button', { class: 'qf-iconbtn', title: 'Zoom out', 'aria-label': 'Zoom out', onclick: () => app.exec('view.zoomOut') }, icon('remove')), zoom, h('button', { class: 'qf-iconbtn', title: 'Zoom in', 'aria-label': 'Zoom in', onclick: () => app.exec('view.zoomIn') }, icon('add')));
  }

  status(msg: string): void {
    this.statusMsg = msg;
    clearTimeout(this.statusTimer);
    if (msg && !msg.startsWith('●') && !msg.startsWith('Format Painter')) this.statusTimer = setTimeout(() => { this.statusMsg = ''; this.renderStatus(); }, 3000);
    this.renderStatus();
  }

  // ----------------------------------------------------------------------------------------
  // Document tabs strip and title

  tabsChanged(): void {
    const app = this.app;
    clear(this.docTabsEl);
    this.root.classList.toggle('qf-multi-doc', app.docs.length > 1);
    for (const d of app.docs) {
      // Embedded: the message (the first document) cannot be closed; documents a command made (merged
      // letters, an AI draft) close without saving, since files are not available here.
      const close = app.embedded ? (d === app.docs[0] ? null : () => app.closeTab(d)) : () => { app.activate(d); app.exec('file.close', d.id); };
      const t = h('div', { class: 'qf-doctab' + (d === app.active ? ' qf-active' : ''), role: 'tab' },
        h('button', { class: 'qf-doctab-name', onclick: () => app.activate(d) }, d.displayName + (d.dirty ? ' •' : '')),
        close ? h('button', { class: 'qf-doctab-close', 'aria-label': `Close ${d.displayName}`, onclick: close }, icon('close')) : null);
      this.docTabsEl.appendChild(t);
    }
    if (!app.embedded) this.docTabsEl.appendChild(h('button', { class: 'qf-iconbtn', title: 'New document', 'aria-label': 'New document', onclick: () => app.exec('file.new') }, icon('add')));
    if (app.active) this.titleBtn.textContent = app.active.displayName + (app.active.dirty ? ' •' : '');
  }

  async renameDoc(): Promise<void> {
    const tab = this.app.tab;
    const r = await openDialog({ title: 'Document', fields: [{ key: 'name', label: 'File name', type: 'text', value: tab.fileName || tab.title }, { key: 'title', label: 'Title property', type: 'text', value: this.app.settings.properties.title }] });
    if (!r) return;
    tab.fileName = r.name; tab.title = r.name.replace(/\.[^.]+$/, '');
    this.app.updateSettings((s) => { s.properties.title = r.title; });
    this.tabsChanged();
  }

  moreMenu(anchor: HTMLElement): void {
    const app = this.app;
    const entries: MenuEntry[] = [
      { id: 'file.save', label: 'Save', icon: 'save' }, { id: 'file.share', label: 'Share', icon: 'share' }, { id: 'file.print', label: 'Print / PDF', icon: 'print' },
      { separator: true },
      { id: 'view.navPane', label: 'Navigation', icon: 'list_alt' }, { id: 'review.showComments', label: 'Comments', icon: 'forum' }, { id: 'style.pane', label: 'Styles', icon: 'style' },
      { id: 'edit.find', label: 'Find & Replace', icon: 'search' }, { id: 'view.revealCodes', label: 'Reveal Codes', icon: 'code' },
      { separator: true },
      { id: 'file.customizeQat', label: 'Customize Quick Access Bar…', icon: 'tune' }, { id: 'file.customizeRibbon', label: 'Customize Tabs…', icon: 'view_quilt' },
      { id: 'file.customizeKeyboard', label: 'Customize Keyboard…', icon: 'keyboard' }, { id: 'file.options', label: 'Options…', icon: 'settings' },
      { id: 'help.about', label: 'About', icon: 'info' },
    ];
    const shown = entries.filter((e) => !e.id || !this.hidden(e.id));
    showMenu(shown[0]?.separator ? shown.slice(1) : shown, { anchor, onPick: (e) => e.id && app.exec(e.id, e.arg) });
  }

  // ----------------------------------------------------------------------------------------
  // Panes

  openPane(id: string, opts: any = {}): void {
    const def = PANES[id];
    if (!def) { toast(`Unknown pane ${id}`); return; }
    if (this.pane?.def.id === id) { this.pane.opts = opts; def.update?.(this.app, this.pane.el, opts); def.onOpen?.(this.app, this.pane.el, opts); return; }
    this.closePane();
    const body = h('div', { class: 'qf-pane-body' });
    const head = h('div', { class: 'qf-pane-head' }, h('h2', null, def.title), h('button', { class: 'qf-iconbtn', 'aria-label': 'Close pane', onclick: () => this.closePane() }, icon('close')));
    clear(this.paneEl);
    this.paneEl.append(head, body);
    this.paneEl.setAttribute('aria-hidden', 'false');
    this.root.classList.add('qf-pane-open');
    this.pane = { def, el: body, opts };
    def.render(this.app, body, opts);
    def.onOpen?.(this.app, body, opts);
    this.refresh();
    requestAnimationFrame(() => this.app.applyZoom(this.app.tab));
  }

  closePane(): void {
    if (!this.pane) return;
    this.pane.def.onClose?.(this.app);
    this.pane = null;
    clear(this.paneEl);
    this.paneEl.setAttribute('aria-hidden', 'true');
    this.root.classList.remove('qf-pane-open');
    this.app.refresh();
    requestAnimationFrame(() => this.app.applyZoom(this.app.tab));
  }

  togglePane(id: string, opts?: any): void { if (this.pane?.def.id === id) this.closePane(); else this.openPane(id, opts); }
  paneOpen(id: string): boolean { return this.pane?.def.id === id; }

  // ----------------------------------------------------------------------------------------
  // Backstage

  showBackstage(page = 'home'): void {
    closeMenus();
    if (this.app.embedded) return; // its pages are all about files
    this.backstageEl.setAttribute('aria-hidden', 'false');
    this.root.classList.add('qf-backstage-open');
    renderBackstage(this.app, this.backstageEl, page);
  }
  hideBackstage(): void {
    this.backstageEl.setAttribute('aria-hidden', 'true');
    this.root.classList.remove('qf-backstage-open');
    clear(this.backstageEl);
  }

  // ----------------------------------------------------------------------------------------
  // Customization dialogs

  customizeQat(): void { customizeQat(this.app); }
  customizeRibbon(): void { customizeRibbon(this.app); }
  customizeKeyboard(id?: string): void { customizeKeyboard(this.app, id); }

  // ----------------------------------------------------------------------------------------
  // Command palette

  commandPalette(): void {
    const app = this.app;
    const overlay = h('div', { class: 'qf-overlay qf-palette-overlay' });
    const input = h('input', { class: 'qf-palette-input', placeholder: `Search ${allCommands().length} commands… (e.g. "double underline", "toc", "merge")`, 'aria-label': 'Search commands' }) as HTMLInputElement;
    const list = h('div', { class: 'qf-palette-list', role: 'listbox' });
    const box = h('div', { class: 'qf-palette', role: 'dialog' }, input, list);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    let results: Command[] = [];
    let sel = 0;
    const close = () => { overlay.remove(); app.focus(); };
    const run = (c: Command) => { close(); app.exec(c.id); };
    const draw = () => {
      clear(list);
      const q = input.value.trim();
      results = (q ? searchCommands(q, 80) : [...app.prefs.pinnedCommands.map((id) => getCommand(id)!).filter(Boolean), ...allCommands().filter((c) => c.popular).slice(0, 40)]).filter((c) => !this.hidden(c.id));
      results.forEach((c, i) => {
        const pinned = app.prefs.qat.includes(c.id);
        const row = h('div', { class: 'qf-palette-row' + (i === sel ? ' qf-sel' : ''), role: 'option' },
          icon(c.icon), h('span', { class: 'qf-palette-label' }, c.label), h('span', { class: 'qf-palette-tab' }, `${c.tab === 'Backstage' ? 'File' : c.tab}${c.group ? ' ▸ ' + c.group : ''}`),
          c.keys?.[0] ? h('kbd', null, prettyKey(c.keys[0])) : null,
          h('button', { class: 'qf-iconbtn qf-palette-pin', title: pinned ? 'Remove from Quick Access Bar' : 'Add to Quick Access Bar', onclick: (e: Event) => { e.stopPropagation(); app.prefs.qat = pinned ? app.prefs.qat.filter((x) => x !== c.id) : [...app.prefs.qat, c.id]; app.savePrefs(); this.renderQat(); draw(); } }, icon(pinned ? 'push_pin' : 'keep')));
        row.addEventListener('click', () => run(c));
        list.appendChild(row);
      });
      if (!results.length) list.appendChild(h('div', { class: 'qf-help' }, 'No matching commands.'));
    };
    input.addEventListener('input', () => { sel = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); draw(); list.children[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
      if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); list.children[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
      if (e.key === 'Enter' && results[sel]) { e.preventDefault(); run(results[sel]); }
      if (e.key === 'Escape') close();
    });
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    draw();
    setTimeout(() => input.focus(), 20);
  }

  // ----------------------------------------------------------------------------------------
  // Slash menu

  slashMenu(view: EditorView): void {
    const app = this.app;
    const coords = view.coordsAtPos(view.state.selection.head);
    const startPos = view.state.selection.head;
    let filter = '';
    let menuEl: HTMLElement | null = null;
    const items = () => SLASH_ITEMS.map((id) => getCommand(id)).filter((c): c is Command => !!c && (!filter || c.label.toLowerCase().includes(filter) || c.id.toLowerCase().includes(filter)));
    const removeSlash = () => {
      const st = view.state;
      const end = st.selection.head;
      const text = st.doc.textBetween(startPos - 1, end, '', '');
      if (text.startsWith('/')) view.dispatch(st.tr.delete(startPos - 1, end));
    };
    const show = () => {
      menuEl = showMenu(items().slice(0, 14).map((c) => ({ id: c.id, label: c.label, icon: c.icon })), {
        x: coords.left, y: coords.bottom + 4, className: 'qf-slash-menu', focus: false,
        onPick: (e) => { cleanup(); removeSlash(); if (e.id) app.exec(e.id); },
      });
    };
    const onKey = () => {
      setTimeout(() => {
        const st = view.state;
        const head = st.selection.head;
        if (head < startPos) { cleanup(); closeMenus(); return; }
        const typed = st.doc.textBetween(startPos - 1, head, '', '');
        if (!typed.startsWith('/') || /\s/.test(typed)) { cleanup(); closeMenus(); return; }
        filter = typed.slice(1).toLowerCase();
        closeMenus();
        if (items().length) show();
      }, 0);
    };
    const onEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && menuEl?.isConnected) { const first = items()[0]; if (first) { e.preventDefault(); e.stopPropagation(); cleanup(); closeMenus(); removeSlash(); app.exec(first.id); } }
      if (e.key === 'Escape') { cleanup(); closeMenus(); }
    };
    const cleanup = () => { view.dom.removeEventListener('keyup', onKey); view.dom.removeEventListener('input', onKey); view.dom.removeEventListener('keydown', onEnter, true); };
    view.dom.addEventListener('keyup', onKey);
    view.dom.addEventListener('input', onKey);
    view.dom.addEventListener('keydown', onEnter, true);
    show();
  }

  // ----------------------------------------------------------------------------------------
  // Context menu

  contextMenu(e: MouseEvent): void {
    const app = this.app;
    const view = app.view;
    const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
    const st = view.state;
    if (pos && st.selection.empty) {
      const node = st.doc.nodeAt(pos.inside >= 0 ? pos.inside : pos.pos);
      if (node && node.type === schema.nodes.image) view.dispatch(st.tr.setSelection(NodeSelection.create(st.doc, pos.inside)));
      else if (!(st.selection.from <= pos.pos && st.selection.to >= pos.pos)) app.selectPos(pos.pos);
    }
    const entries: MenuEntry[] = [];
    const s = view.state;
    const issue = (proofKey.getState(s)?.issues || []).find((i) => i.from <= s.selection.head && i.to >= s.selection.head);
    if (issue) {
      entries.push({ heading: issue.message });
      const fix = (text: string) => ({ id: '__fix', arg: { text, issue }, label: text, icon: 'spellcheck' });
      for (const sug of issue.suggestions.slice(0, 5)) entries.push(fix(sug));
      if (issue.kind === 'spell') {
        entries.push({ id: '__suggest', arg: issue, label: 'More suggestions…', icon: 'lightbulb' });
        entries.push({ id: '__ignore', arg: issue, label: 'Ignore All', icon: 'block' }, { id: '__add', arg: issue, label: 'Add to Dictionary', icon: 'library_add' });
      }
      entries.push({ separator: true });
    }
    const img = s.selection instanceof NodeSelection && s.selection.node.type === schema.nodes.image;
    const link = s.selection.$head.marks().find((m) => m.type === schema.marks.link);
    entries.push({ id: 'edit.cut', label: 'Cut', icon: 'content_cut' }, { id: 'edit.copy', label: 'Copy', icon: 'content_copy' },
      { id: 'edit.paste', label: 'Paste', icon: 'content_paste', submenu: [{ id: 'edit.paste', arg: 'keep', label: 'Keep Source Formatting' }, { id: 'edit.paste', arg: 'merge', label: 'Merge Formatting' }, { id: 'edit.paste', arg: 'text', label: 'Keep Text Only' }, { id: 'edit.paste', arg: 'markdown', label: 'Paste Markdown' }] });
    entries.push({ separator: true });
    if (img) {
      const n = (s.selection as NodeSelection).node;
      if (n.attrs.editKind) entries.push({ id: 'insert.editGraphic', label: `Edit ${n.attrs.editKind}…`, icon: 'edit' });
      entries.push({ id: 'picture.crop', label: 'Crop…', icon: 'crop' }, { id: 'picture.wrap', label: 'Wrap Text', icon: 'wrap_text', submenu: (getCommand('picture.wrap')!.menu!(app)) }, { id: 'picture.size', label: 'Size…', icon: 'photo_size_select_large' }, { id: 'picture.altText', label: 'Edit Alt Text…', icon: 'image_search' }, { id: 'refs.caption', label: 'Insert Caption…', icon: 'subtitles' }, { id: 'picture.save', label: 'Save as Picture…', icon: 'download' });
    } else if (isInTable(s)) {
      entries.push({ label: 'Insert', icon: 'add', submenu: [{ id: 'table.insertRowAbove', label: 'Insert Row Above' }, { id: 'table.insertRowBelow', label: 'Insert Row Below' }, { id: 'table.insertColLeft', label: 'Insert Column Left' }, { id: 'table.insertColRight', label: 'Insert Column Right' }] },
        { label: 'Delete', icon: 'delete', submenu: [{ id: 'table.deleteRow', label: 'Delete Row' }, { id: 'table.deleteCol', label: 'Delete Column' }, { id: 'table.delete', label: 'Delete Table' }] },
        { id: 'table.merge', label: 'Merge Cells', icon: 'cell_merge' }, { id: 'table.split', label: 'Split Cells…', icon: 'splitscreen_right' }, { id: 'table.align', label: 'Cell Alignment', icon: 'vertical_align_center', submenu: getCommand('table.align')!.menu!(app) }, { id: 'table.properties', label: 'Table Properties…', icon: 'tune' });
    } else {
      entries.push({ id: 'fmt.fontDialog', label: 'Font…', icon: 'text_format' }, { id: 'para.dialog', label: 'Paragraph…', icon: 'format_paragraph' });
    }
    if (link) entries.push({ separator: true }, { id: 'insert.link', label: 'Edit Link…', icon: 'link' }, { id: 'insert.openLink', label: 'Open Link', icon: 'open_in_new' }, { id: 'insert.copyLink', label: 'Copy Link', icon: 'content_copy' }, { id: 'insert.removeLink', label: 'Remove Link', icon: 'link_off' });
    else entries.push({ id: 'insert.link', label: 'Link…', icon: 'link' });
    entries.push({ id: 'review.newComment', label: 'New Comment', icon: 'add_comment' }, { id: 'review.define', label: 'Define / Thesaurus', icon: 'menu_book' }, { id: 'review.translate', label: 'Translate', icon: 'translate' }, { id: 'view.cmdSearch', label: 'Search Commands…', icon: 'search' });
    showMenu(entries, {
      x: e.clientX, y: e.clientY, onPick: async (en) => {
        const prof = await import('../proof/proofing');
        if (en.id === '__fix') { const { text, issue: i } = en.arg; view.dispatch(view.state.tr.insertText(text, i.from, i.to)); return; }
        if (en.id === '__ignore') { app.prefs.ignoredWords.push(view.state.doc.textBetween(en.arg.from, en.arg.to)); app.savePrefs(); app.proofer.schedule(app.tab, 0); return; }
        if (en.id === '__add') { const w = view.state.doc.textBetween(en.arg.from, en.arg.to); app.prefs.dictionary.push(w); app.savePrefs(); await prof.addWord(w); app.proofer.schedule(app.tab, 0); return; }
        if (en.id === '__suggest') { const w = view.state.doc.textBetween(en.arg.from, en.arg.to); const sugs = await prof.suggest(w, en.arg.dialect); showMenu(sugs.length ? sugs.map((x) => ({ id: '__fix2', arg: x, label: x })) : [{ label: '(no suggestions)' }], { x: e.clientX, y: e.clientY, onPick: (p) => { if (p.id === '__fix2') view.dispatch(view.state.tr.insertText(p.arg, en.arg.from, en.arg.to)); } }); return; }
        if (en.id) app.exec(en.id, en.arg);
      },
    });
  }

  // ----------------------------------------------------------------------------------------
  // Mini toolbar

  renderMiniBar(): void {
    clear(this.miniBar);
    for (const id of ['fmt.bold', 'fmt.italic', 'fmt.underline', 'fmt.highlight', 'fmt.color', 'fmt.grow', 'fmt.shrink', 'list.bullets', 'insert.link', 'review.newComment', 'fmt.painter', 'fmt.clear']) {
      const c = getCommand(id);
      if (c) this.miniBar.appendChild(this.commandButton(c, 'mini'));
    }
  }

  positionMiniBar(): void {
    const app = this.app;
    if (!app.active || !this.miniBar) return;
    const st = app.state;
    const show = app.prefs.miniToolbar && !st.selection.empty && !(st.selection instanceof NodeSelection) && app.view.hasFocus() && app.view.editable;
    if (!show) { this.miniBar.classList.remove('qf-show'); return; }
    try {
      const a = app.view.coordsAtPos(st.selection.from), b = app.view.coordsAtPos(st.selection.to);
      const sa = safeInsets();
      const top = Math.min(a.top, b.top) - 50;
      const left = Math.max(sa.left + 6, Math.min(window.innerWidth - sa.right - this.miniBar.offsetWidth - 6, (a.left + b.left) / 2 - this.miniBar.offsetWidth / 2));
      this.miniBar.style.top = `${top < sa.top + 60 ? Math.min(Math.max(a.bottom, b.bottom) + 8, window.innerHeight - sa.bottom - this.miniBar.offsetHeight - 6) : top}px`;
      this.miniBar.style.left = `${left}px`;
      this.miniBar.classList.add('qf-show');
    } catch { this.miniBar.classList.remove('qf-show'); }
  }

  // ----------------------------------------------------------------------------------------
  // Page overlays: watermark, page border, line numbers

  drawOverlays(tab: DocTab): void {
    const ov = tab.page.querySelector<HTMLElement>('.qf-page-overlays');
    if (!ov) return;
    clear(ov);
    if (tab.viewMode !== 'print') return;
    const s = tab.settings;
    const { h: ph } = pageDims(s.page);
    const pagePx = ph * (4 / 3);
    const gaps = [...tab.mount.querySelectorAll<HTMLElement>('.qf-pgap:not(.qf-pgap-first)')];
    const pageRect = tab.page.getBoundingClientRect();
    const z = tab.page.offsetWidth ? pageRect.width / tab.page.offsetWidth : 1;
    const tops = [0];
    for (const g of gaps) { if (g.classList.contains('qf-pgap-last')) break; const gp = g.querySelector('.qf-pg-gap') as HTMLElement | null; if (gp) tops.push((gp.getBoundingClientRect().bottom - pageRect.top) / z); }
    tops.forEach((top, i) => {
      const sheet = h('div', { class: 'qf-sheet', style: `top:${top}px;height:${pagePx}px` });
      if (s.watermark?.text) sheet.appendChild(h('div', { class: 'qf-watermark' }, s.watermark.text));
      if (s.pageBorder) sheet.appendChild(h('div', { class: 'qf-page-border', style: `inset:${(s as any).pageBorderInset ?? 24}pt;border:${s.pageBorder}` }));
      sheet.dataset.page = String(i + 1);
      ov.appendChild(sheet);
    });
    if (s.lineNumbers.enabled) this.drawLineNumbers(tab, ov, tops, pagePx, z);
  }

  drawLineNumbers(tab: DocTab, ov: HTMLElement, tops: number[], pagePx: number, z: number): void {
    const pageRect = tab.page.getBoundingClientRect();
    const s = tab.settings;
    let n = 0, lastPage = 0;
    const seen = new Set<number>();
    tab.view.state.doc.descendants((node, pos) => {
      if (!node.isTextblock) return true;
      if (node.attrs.suppressLineNumbers) return false;
      const dom = tab.view.nodeDOM(pos) as HTMLElement | null;
      if (!dom) return false;
      const range = document.createRange();
      range.selectNodeContents(dom);
      for (const r of range.getClientRects()) {
        const y = Math.round((r.top - pageRect.top) / z);
        if (seen.has(y) || r.height < 4) continue;
        if (r.width < 2 && r.height > 40) continue;
        seen.add(y);
        let page = 0; for (let i = 0; i < tops.length; i++) if (tops[i] <= y) page = i;
        if (s.lineNumbers.restart === 'page' && page !== lastPage) { n = 0; lastPage = page; }
        n++;
        if (n % (s.lineNumbers.countBy || 1) === 0) ov.appendChild(h('div', { class: 'qf-line-number', style: `top:${y}px;height:${r.height / z}px;line-height:${r.height / z}px` }, String(n)));
      }
      return false;
    });
    void pagePx;
  }

  // ----------------------------------------------------------------------------------------
  // Ruler (indent markers are draggable)

  attachRuler(tab: DocTab, ruler: HTMLElement): void {
    const markers = { left: h('div', { class: 'qf-ruler-marker qf-rm-left', title: 'Left indent' }), first: h('div', { class: 'qf-ruler-marker qf-rm-first', title: 'First line indent' }), right: h('div', { class: 'qf-ruler-marker qf-rm-right', title: 'Right indent' }) };
    const scale = h('div', { class: 'qf-ruler-scale' });
    ruler.append(scale, markers.left, markers.first, markers.right);
    (tab as any).ruler = { el: ruler, scale, markers };
    const drag = (which: 'left' | 'first' | 'right') => (e: PointerEvent) => {
      e.preventDefault();
      const s = tab.settings;
      const z = tab.zoom;
      const startX = e.clientX;
      const p = currentParagraph(tab.view.state);
      if (!p) return;
      const a0 = { left: p.attrs.indentLeft || 0, first: p.attrs.indentFirst || 0, right: p.attrs.indentRight || 0 };
      const move = (ev: PointerEvent) => {
        const dpt = Math.round((((ev.clientX - startX) / z) * 0.75) / 4.5) * 4.5;
        const next: Record<string, number | null> = {};
        if (which === 'left') { next.indentLeft = Math.max(0, a0.left + dpt) || null; }
        if (which === 'first') next.indentFirst = a0.first + dpt || null;
        if (which === 'right') next.indentRight = Math.max(0, a0.right - dpt) || null;
        setParaAttrs(tab.view, next);
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      void s;
    };
    markers.left.addEventListener('pointerdown', drag('left'));
    markers.first.addEventListener('pointerdown', drag('first'));
    markers.right.addEventListener('pointerdown', drag('right'));
  }

  updateRuler(tab: DocTab): void {
    const r = (tab as any).ruler;
    if (!r || !this.app.prefs.showRuler) return;
    const s = tab.settings;
    const { w } = pageDims(s.page);
    const z = tab.zoom;
    const px = (pt: number) => pt * (4 / 3) * z;
    const pageLeft = tab.page.getBoundingClientRect().left - tab.el.getBoundingClientRect().left;
    const ml = s.page.margin.left + (s.page.gutter || 0), mr = s.page.margin.right;
    const u = this.app.prefs.units;
    const unitPt = u === 'in' ? 72 : u === 'cm' ? 72 / 2.54 : u === 'mm' ? 72 / 2.54 : 72;
    const sig = [w, ml, mr, z, pageLeft, u].join(',');
    if (r.scale.dataset.sig !== sig) {
      r.scale.dataset.sig = sig;
      clear(r.scale);
      r.scale.style.cssText = `left:${pageLeft}px;width:${px(w)}px`;
      r.scale.appendChild(h('div', { class: 'qf-ruler-margin', style: `left:0;width:${px(ml)}px` }));
      r.scale.appendChild(h('div', { class: 'qf-ruler-margin', style: `right:0;width:${px(mr)}px` }));
      for (let t = 0, i = 0; t <= w - ml; t += unitPt / 4, i++) {
        const major = i % 4 === 0;
        r.scale.appendChild(h('div', { class: 'qf-tick' + (major ? ' qf-major' : ''), style: `left:${px(ml + t)}px` }, major && i ? String(i / 4) : ''));
      }
    }
    const p = currentParagraph(tab.view.state);
    const li = p?.attrs.indentLeft || 0, fi = p?.attrs.indentFirst || 0, ri = p?.attrs.indentRight || 0;
    r.markers.left.style.left = `${pageLeft + px(ml + li)}px`;
    r.markers.first.style.left = `${pageLeft + px(ml + li + fi)}px`;
    r.markers.right.style.left = `${pageLeft + px(w - mr - ri)}px`;
  }

  // ----------------------------------------------------------------------------------------
  // Pinch zoom

  attachPinchZoom(tab: DocTab): void {
    const pts = new Map<number, { x: number; y: number }>();
    let start = 0, z0 = 1;
    tab.el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; start = Math.hypot(a.x - b.x, a.y - b.y); z0 = tab.zoom; } });
    tab.el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && start) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const z = Math.max(0.25, Math.min(4, z0 * (d / start))); tab.zoom = z; tab.zoomMode = 'fixed'; tab.page.style.zoom = String(z); }
    });
    const end = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2 && start) { start = 0; this.app.setZoom(tab.zoom); } };
    tab.el.addEventListener('pointerup', end);
    tab.el.addEventListener('pointercancel', end);
    tab.el.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); this.app.setZoom(Math.max(0.25, Math.min(4, tab.zoom * (e.deltaY < 0 ? 1.1 : 0.9)))); } }, { passive: false });
  }

  // ----------------------------------------------------------------------------------------
  // Misc hooks used by the app/commands

  anchorFor(id: string): HTMLElement {
    const els = [...this.root.querySelectorAll<HTMLElement>(`[data-cmd-wrap="${id}"], [data-cmd="${id}"]`)].filter((e) => e.offsetParent);
    return els[0] || this.ribbonEl;
  }

  inTable(): boolean { return isInTable(this.app.state); }

  controlClick(tab: DocTab, pos: number, node: PMNode, el: HTMLElement): void { controlClick(this.app, pos, node, el); }

  showFootnote(tab: DocTab, pos: number, node: PMNode): void { void node; this.app.exec('refs.editFootnote', { pos }); }

  updatePrintCss(tab: DocTab): void {
    const s = tab.settings;
    const { w, h: ph } = pageDims(s.page);
    let el = document.getElementById('qf-print-css') as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = 'qf-print-css'; document.head.appendChild(el); }
    el.textContent = `@page{size:${w}pt ${ph}pt;margin:0}`;
  }

  applyPrefs(): void {
    const p = this.app.prefs;
    const dark = this.app.embedTheme ? this.app.embedTheme === 'dark' : p.theme === 'dark' || (p.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    this.root.classList.toggle('qf-ribbon-collapsed', p.ribbon !== 'full');
    this.root.classList.toggle('qf-qat-at-bottom', p.qatPosition === 'bottom');
    this.root.classList.toggle('qf-show-ruler', p.showRuler);
    this.root.classList.toggle('qf-show-marks', p.showMarks);
    this.root.classList.toggle('qf-show-hidden', p.showHiddenText || p.showMarks);
    this.root.classList.toggle('qf-show-codes', p.showFieldCodes);
    this.root.dataset.fieldShading = p.fieldShading;
    this.root.style.setProperty('--qf-ui-scale', String(p.uiScale || 1));
    if (!this.app.docs.length) return;
    this.renderQat();
    this.refresh();
  }

  globalKey(e: KeyboardEvent): void {
    const k = keyName(e);
    if (!k) return;
    if (e.key === 'Escape') {
      if (document.querySelector('.qf-menu')) { closeMenus(); return; }
      if (this.root.classList.contains('qf-backstage-open')) { this.hideBackstage(); return; }
      if (document.body.classList.contains('qf-zen')) { document.body.classList.remove('qf-zen'); return; }
    }
    const inEditor = this.app.active && this.app.view.dom.contains(e.target as Node);
    if (inEditor) return; // handled by the editor's keymap plugin
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (document.querySelector('.qf-overlay')) return;
    const id = this.app.keyIndex.get(canonicalKey(k));
    if (id && /^(file|view|help|dev\.macros|edit\.find|edit\.replace)/.test(id)) { e.preventDefault(); this.app.exec(id); }
  }

  async showShortcuts(): Promise<void> {
    const rows = allCommands().filter((c) => (c.keys && c.keys.length) || Object.values(this.app.prefs.keymap).includes(c.id));
    const custom = Object.entries(this.app.prefs.keymap);
    const table = h('table', { class: 'qf-stats qf-shortcuts' }, ...rows.sort((a, b) => a.tab.localeCompare(b.tab) || a.label.localeCompare(b.label)).map((c) => {
      const keys = [...(c.keys || []), ...custom.filter(([, id]) => id === c.id).map(([k]) => k)];
      return h('tr', null, h('td', null, c.label), h('td', null, keys.map(prettyKey).join(', ')), h('td', { class: 'qf-help' }, c.tab === 'Backstage' ? 'File' : c.tab));
    }));
    await openDialog({ title: 'Keyboard Shortcuts', wide: true, content: table, cancel: false });
  }

  async showCommandReference(): Promise<void> {
    const byTab = new Map<string, Command[]>();
    for (const c of allCommands()) { const t = c.tab === 'Backstage' ? 'File' : c.tab; if (!byTab.has(t)) byTab.set(t, []); byTab.get(t)!.push(c); }
    const div = h('div', { class: 'qf-cmdref' });
    div.appendChild(h('p', { class: 'qf-help' }, `${allCommands().length} commands. Every command can be added to the Quick Access Bar, a custom tab, a keyboard shortcut, or a macro.`));
    for (const [t, cs] of byTab) {
      div.appendChild(h('h3', null, `${t} (${cs.length})`));
      div.appendChild(h('ul', null, ...cs.sort((a, b) => a.label.localeCompare(b.label)).map((c) => h('li', null, h('b', null, c.label), c.keys?.length ? ` — ${c.keys.map(prettyKey).join(', ')}` : '', c.origin ? h('span', { class: 'qf-help' }, ` (from ${c.origin})`) : ''))));
    }
    await openDialog({ title: 'Command Reference', wide: true, content: div, cancel: false });
  }

  async tour(): Promise<void> {
    const steps = [
      ['Everything is a command', 'Every feature of Anne\'s Pen is a command you can find with the search button (or Alt+Q), place on the Quick Access Bar, put on your own tab, assign a key, or record in a macro.'],
      ['Quick Access Bar', 'Tap ▾ at the end of the Quick Access Bar to add common commands, or choose More Commands… to pick from the full library. Long-press any ribbon button to add it. Options lets you move the bar to the bottom, near the keyboard.'],
      ['Views', 'Use Mobile View for comfortable phone editing and Print Layout to see real pages with headers, footers, and footnotes. The buttons at the bottom right switch views.'],
      ['Type “/”', 'At the start of an empty line, type / to insert headings, lists, tables, pictures, equations, and more. Markdown shortcuts such as # Heading, - bullet, and **bold** work too.'],
      ['Files', 'Open and save .docx, .odt, .rtf, .html, Markdown, EPUB, and text with the system file picker. Print or Save as PDF through the system print service.'],
    ];
    for (let i = 0; i < steps.length; i++) {
      const r = await openDialog({ title: `${steps[i][0]} (${i + 1}/${steps.length})`, content: h('p', { class: 'qf-msg' }, steps[i][1]), ok: i === steps.length - 1 ? 'Start writing' : 'Next', cancel: 'Skip tour' });
      if (!r) break;
    }
    this.app.prefs.firstRun = false;
    this.app.savePrefs();
  }
}

void esc;
void fromUnit;
void applySize;
void quickStyles;
