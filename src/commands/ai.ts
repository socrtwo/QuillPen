/**
 * AI tab commands. Every feature in src/ai/features.ts becomes a registered command, so each
 * one can be put on the Quick Access Bar, a custom tab, or a keyboard shortcut, and recorded
 * in macros like any other command.
 */
import { def, type MenuEntry } from './registry';
import type { App } from '../app';
import { schema } from '../editor/schema';
import { FEATURES, BASE_SYSTEM, parseCommentJson, varietyName, type AiFeature } from '../ai/features';
import { dialectFor } from '../proof/proofing';
import { aiSettings, saveAiSettings, resolveProvider, ensemblePlan, receivingProviders } from '../ai/store';
import { providerById } from '../ai/providers';
import { chat, AiError, type ChatMessage, type ChatResult, type ContentPart } from '../ai/client';
import { MIN_MEMBERS, type EnsembleMode } from '../ai/ensemble';
import { selectionOrParagraph, documentText, textBefore, rangeText, cleanOutput, splitAlternatives, replaceRange, insertBelow, insertAtCursor, addComments, blocksFromText, anchorSelection, anchorBelow, anchorRange, resolveRange, resolveSelection, findNode } from '../ai/apply';
import type { Node as PMNode } from 'prosemirror-model';
import { openDialog, toast, promptDialog, confirmDialog } from '../ui/dialog';
import { selectedImage } from './picture';
import { docKey } from './file';
import { commentRanges } from './review';
import { kvGet, kvSet } from '../util/store';

const N = schema.nodes;

// ------------------------------------------------------------------------------------------
// Shared plumbing

async function ensureProvider(app: App, reason: string): Promise<boolean> {
  const s = aiSettings();
  if (!s.enabled) { toast('AI features are turned off (AI ▸ AI Settings).'); return false; }
  if (s.active && (await resolveProvider())) return true;
  const { openAiSetup } = await import('../ui/aiWizard');
  return openAiSetup(app, { reason });
}

const cloudDef = (id: string) => { const p = providerById(id); return p && p.kind !== 'local' && p.kind !== 'builtin' ? p : null; };
/** The cloud services that receive the text of an AI command (several with an ensemble). */
const cloudReceivers = () => receivingProviders().map(cloudDef).filter((p): p is NonNullable<typeof p> => !!p);
const isCloud = () => cloudReceivers().length > 0;
const listNames = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** First use of a cloud provider: say plainly where the text goes (every service, with several AIs). */
async function privacyCheck(): Promise<boolean> {
  const s = aiSettings();
  const fresh = cloudReceivers().filter((p) => !s.privacyAck.includes(p.id));
  if (!fresh.length) return true;
  const names = listNames(fresh.map((p) => p.name));
  const free = fresh.some((p) => p.free === 'free');
  const ok = await confirmDialog('Sending Text to an AI Service',
    `AI commands send the text they need directly from this device to ${names}. Anne\'s Pen has no server and keeps no copy. ${fresh.length > 1 ? 'Each service\'s' : `${names}'s`} terms and privacy policy apply${free ? ', and free tiers may use what you send to improve their models' : ''}. Continue?`, 'Continue', 'Cancel');
  if (ok) saveAiSettings((x) => { for (const p of fresh) if (!x.privacyAck.includes(p.id)) x.privacyAck.push(p.id); });
  return ok;
}

async function confirmWholeDoc(app: App, words: number): Promise<boolean> {
  const s = aiSettings();
  if (!s.confirmDocument || !isCloud()) return true;
  return confirmDialog('Send the Whole Document?', `This sends the whole document (${words.toLocaleString()} words) to ${listNames(cloudReceivers().map((p) => p.name))}. Select a passage first to send only that.`, 'Send', 'Cancel');
}

/** With "Show the discussion" on, an answer that was applied to the document is also shown in the AI pane with how the AIs answered. */
async function showDiscussion(app: App, title: string, text: string, r: ChatResult): Promise<void> {
  if (!r.ensemble || !aiSettings().ensemble.showDeliberation) return;
  const { paneResult } = await import('../ui/aiPane');
  paneResult(app, `${title}: how the AIs answered`, true).done(text, r);
}

async function storyNotes(app: App): Promise<string> {
  try { return ((await kvGet('ai:notes:' + docKey(app.tab))) as string) || ''; } catch { return ''; }
}

/** The English spelling variety the user chose for this document; empty means keep the author's. */
function variety(app: App): string {
  return varietyName(dialectFor(app.prefs.spellDialect, app.settings.language));
}

async function systemPrompt(app: App, f?: AiFeature): Promise<string> {
  const s = aiSettings();
  const parts = [BASE_SYSTEM];
  if (f?.system) parts.push(f.system);
  if (s.language && s.language !== 'auto') parts.push(`Write generated text in ${s.language} unless translating.`);
  const v = variety(app);
  if (v) parts.push(`When writing English, use ${v} spelling.`);
  const notes = await storyNotes(app);
  if (notes) parts.push(`Background notes from the author about this document (characters, setting, terminology, style). Respect them:\n${notes}`);
  return parts.join('\n\n');
}

function fail(e: unknown, app: App): void {
  if (e instanceof AiError && e.code === 'aborted') { toast('Stopped'); return; }
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof AiError && (e.code === 'auth' || e.code === 'no-provider')) {
    toast(msg, { action: 'Fix', onAction: () => app.exec('ai.providers'), ms: 8000 });
  } else toast(msg, { ms: 8000 });
  console.warn('AI:', e);
}

async function imageDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
}

function commentThreads(app: App, atCursor: boolean): string {
  const s = app.settings;
  const ranges = commentRanges(app.state.doc);
  const ids = Object.keys(s.comments || {});
  let pick = ids.filter((id) => !s.comments[id].resolved);
  if (atCursor) {
    const pos = app.state.selection.from;
    const here = [...ranges.entries()].find(([, r]) => pos >= r.from && pos <= r.to);
    if (here) pick = [here[0]];
  }
  return pick.map((id) => {
    const c = s.comments[id];
    const r = ranges.get(id);
    return [`On “${(r?.text || '').slice(0, 120)}”:`, `${c.author}: ${c.text}`, ...(c.replies || []).map((x: any) => `${x.author}: ${x.text}`)].join('\n');
  }).join('\n\n');
}

// ------------------------------------------------------------------------------------------
// Feature runner

export async function runFeature(app: App, f: AiFeature, arg?: string): Promise<void> {
  if (!(await ensureProvider(app, `“${f.label.replace(/…$/, '')}” needs an AI provider. Choose one below; free options are at the top.`))) return;
  if (!(await privacyCheck())) return;
  const s = aiSettings();
  // The answer goes to this document, even if another one is active when it arrives.
  const tab = app.tab;
  const st = tab.view.state;

  // Option menus (tone, language…) when run without an argument (palette, QAT, shortcut).
  if (f.options && arg == null) {
    const r = await openDialog({ title: f.label, fields: [{ key: 'v', label: 'Choose', type: 'select', options: f.options.map((o) => ({ value: o.value, label: o.label })), value: f.options[0].value }] });
    if (!r) return;
    arg = r.v;
  }

  // Input
  let text = '';
  let range: { from: number; to: number } | undefined;
  let images: ContentPart[] = [];
  switch (f.input) {
    case 'selection': {
      if (st.selection.empty) { toast('Select some text first.'); return; }
      range = { from: st.selection.from, to: st.selection.to };
      text = rangeText(st.doc, range.from, range.to);
      break;
    }
    case 'selectionOrParagraph': {
      const r = selectionOrParagraph(app);
      if (!r || !r.text) { toast('Select some text or place the cursor in a paragraph.'); return; }
      range = { from: r.from, to: r.to };
      text = r.text;
      break;
    }
    case 'selectionOrDocument':
    case 'document': {
      if (f.input === 'selectionOrDocument' && !st.selection.empty) {
        range = { from: st.selection.from, to: st.selection.to };
        text = rangeText(st.doc, range.from, range.to);
      } else {
        const d = documentText(app, receivingProviders(s).some((id) => providerById(id)?.kind === 'local') ? 6000 : 120000);
        if (!d.text) { toast('The document is empty.'); return; }
        if (!(await confirmWholeDoc(app, d.words))) return;
        text = d.text;
        if (d.truncated) toast('The document is long; the middle part was left out of the request.');
      }
      break;
    }
    case 'before': text = textBefore(app); if (!text) { toast('Write a few sentences first, then use Continue Writing.'); return; } break;
    case 'prompt': if (!st.selection.empty) text = rangeText(st.doc, st.selection.from, st.selection.to); break;
    case 'image': {
      const im = selectedImage(app);
      if (!im) { toast('Select a picture first.'); return; }
      // With several AIs the master or clerk writes the final answer, so it must read images.
      const p = providerById(ensemblePlan(s)?.master.provider || s.active!);
      if (p && !p.vision && p.kind !== 'openai') { toast(`${p.name} cannot read images here. Use a provider with vision models (OpenAI, Anthropic, Gemini, OpenRouter, xAI).`); return; }
      try { images = [{ type: 'image', dataUrl: await imageDataUrl(im.node.attrs.src) }]; } catch { toast('This picture could not be read.'); return; }
      break;
    }
    case 'comment': text = commentThreads(app, f.id === 'ai.draftReply'); if (!text) { toast('There are no open comments.'); return; } break;
    case 'none': break;
  }

  // Extra input
  let extra = '';
  if (f.ask) {
    const v = await promptDialog(f.ask.title, f.ask.label, '', f.ask.multiline ? ({ type: 'textarea', rows: 4, placeholder: f.ask.placeholder } as any) : ({ placeholder: f.ask.placeholder } as any));
    if (v == null || (!v.trim() && f.id !== 'ai.outline')) return;
    extra = v.trim();
    if (f.id === 'ai.outline' && !extra && !text) { toast('Enter a topic or select text to outline.'); return; }
  }
  if (f.id === 'ai.matchVoice') extra = s.voiceProfile || 'Plain, clear, and natural; keep the author\'s own phrasing where it works.';
  if (f.id === 'ai.styleGuide') extra = s.styleGuide;

  const n = f.alternatives ? Math.max(1, Math.min(5, s.alternatives)) : 1;
  const userText = f.prompt({ text, arg, extra, lang: s.language, n, variety: variety(app) });
  const sys = await systemPrompt(app, f);
  const messages: ChatMessage[] = [{ role: 'system', content: sys }, { role: 'user', content: images.length ? [{ type: 'text', text: userText }, ...images] : userText }];
  const base = { messages, tier: f.tier, temperature: f.temperature, maxTokens: f.maxTokens };
  const { aiBusy, aiIdle, aiStatus, showAiPreview, paneResult, aiAuthor } = await import('../ui/aiPane');
  const title = f.label.replace(/…$/, '');
  const author = aiAuthor();
  const track = s.trackAsRevisions;
  // Where the answer goes, remembered by the blocks holding it: the user may type meanwhile.
  const at = anchorSelection(tab.view.state), below = anchorBelow(tab.view.state);
  const rangeAt = range ? anchorRange(tab.view.state.doc, range) : null;
  const cutNote = () => toast('The answer was cut off (length limit or content filter); check its end.', { ms: 7000 });
  /** The document changed where the answer was to go (or was closed): show it in the AI pane. */
  let last: ChatResult | undefined, inPane = false;
  const toPane = (text: string) => { inPane = true; paneResult(app, f.label.replace(/…$/, ''), true).done(text, last); toast('The text changed while the AI was working, so the answer is shown in the AI pane instead.', { ms: 7000 }); };

  try {
    switch (f.output) {
      case 'preview': {
        const primary = f.input === 'prompt' || f.input === 'before' ? 'cursor' : f.id === 'ai.addDetail' ? 'insert' : 'replace';
        await showAiPreview(app, {
          title: f.label.replace(/…$/, '') + (arg ? `: ${arg}` : ''),
          original: range ? text : undefined,
          range: primary === 'replace' ? range : undefined,
          primary,
          markdown: f.markdown,
          generate: async (onToken, signal, ctx) => {
            const r = await chat({ ...base, signal, onToken: (_d, full) => onToken(f.alternatives ? full.split(/\n\s*-{3,}\s*\n/)[0] : full), onStatus: ctx.status });
            if (r.truncated) cutNote();
            ctx.result(r);
            return f.alternatives ? splitAlternatives(r.text) : [r.text];
          },
          refine: async (current, instruction) => {
            const r = await chat({ ...base, messages: [...messages, { role: 'assistant', content: current }, { role: 'user', content: `Revise that: ${instruction}. Return only the revised text.` }] });
            if (r.truncated) cutNote();
            return r.text;
          },
        });
        return;
      }
      case 'pane': {
        const out = paneResult(app, f.label.replace(/…$/, '') + (arg ? `: ${arg}` : ''), f.markdown);
        const ctl = aiBusy(`${title}…`);
        try {
          const r = await chat({ ...base, signal: ctl.signal, onToken: (_d, full) => out.update(full), onStatus: (t) => { aiStatus(ctl, t); out.status(t); } });
          out.done(cleanOutput(r.text, { keepMarkdown: true }), r);
          if (r.truncated) cutNote();
        } finally { aiIdle(ctl); }
        return;
      }
      case 'insertBelow':
      case 'cursor':
      case 'newDoc':
      case 'comments': {
        const ctl = aiBusy(`${title}…`);
        let r;
        try { r = await chat({ ...base, signal: ctl.signal, onStatus: (t) => aiStatus(ctl, t) }); } finally { aiIdle(ctl); }
        // Only the final answer is applied; the discussion is shown in the pane, never inserted.
        const result = cleanOutput(r.text, { keepMarkdown: !!f.markdown || f.output === 'comments' });
        if (!result) { toast('The AI returned nothing.'); return; }
        if (r.truncated) cutNote();
        last = r;
        const open = app.docs.includes(tab);
        if (f.output === 'insertBelow') { if (!open || !(await insertBelow(app, result, { track, author, markdown: f.markdown, heading: f.id === 'ai.keyPoints' ? 'Key points' : undefined, tab, below }))) toPane(result); }
        else if (f.output === 'cursor') { if (!open || !(await insertAtCursor(app, result, { track, author, markdown: f.markdown, tab, at }))) toPane(result); }
        else if (f.output === 'newDoc') {
          const blocks = await blocksFromText(result, true);
          const title = `${f.label.replace(/…$/, '')}${arg ? ` (${arg})` : ''}`;
          const doc = schema.nodes.doc.createAndFill(null, blocks.length ? blocks : [schema.nodes.paragraph.create()])!;
          const tab = app.createTab(doc, { title, fileName: `${title}.docx`, format: 'docx', uri: null });
          tab.dirty = true;
          app.activate(tab);
        } else {
          const items = parseCommentJson(result);
          if (!items.length) { const p = paneResult(app, f.label, true); p.done(result, r); toast('The notes could not be matched to the text; they are shown in the AI pane.'); return; }
          if (!open) { toPane(result); return; }
          const placed = addComments(app, items, author, tab);
          toast(`${placed} comment${placed === 1 ? '' : 's'} added${placed < items.length ? ` (${items.length - placed} could not be matched to the text)` : ''}`);
          if (placed) app.ui.openPane('comments');
        }
        if (!inPane) void showDiscussion(app, title, result, r);
        return;
      }
      case 'tracked': {
        await trackedEdit(app, f, base.messages[0].content as string, range);
        return;
      }
      case 'replace': {
        const ctl = aiBusy(`${f.label}…`);
        let r;
        try { r = await chat({ ...base, signal: ctl.signal, onStatus: (t) => aiStatus(ctl, t) }); } finally { aiIdle(ctl); }
        const out = cleanOutput(r.text, { keepMarkdown: f.markdown });
        last = r;
        // A cut-off answer would replace the whole range with part of it: show it instead.
        const where = rangeAt && !r.truncated && app.docs.includes(tab) ? resolveRange(tab.view.state.doc, rangeAt) : null;
        if (where) { await replaceRange(app, where, out, { track, author, markdown: f.markdown, tab }); void showDiscussion(app, title, out, r); }
        else if (r.truncated) { paneResult(app, f.label.replace(/…$/, ''), true).done(out, r); cutNote(); }
        else if (range) toPane(out);
        return;
      }
    }
  } catch (e) {
    fail(e, app);
  }
}

/**
 * Proofread/OCR fixes: per paragraph batches, applied as minimal tracked edits by "AI (model)".
 * Each paragraph is found again by identity when its answer arrives (earlier corrections and the
 * user's typing move it); a paragraph edited in the meantime is skipped.
 */
export async function trackedEdit(app: App, f: AiFeature, system: string, range?: { from: number; to: number }): Promise<void> {
  const { aiBusy, aiIdle, aiAuthor } = await import('../ui/aiPane');
  const tab = app.tab;
  const st = tab.view.state;
  const v = variety(app);
  const from = range?.from ?? 0, to = range?.to ?? st.doc.content.size;
  type Para = { pos: number; node: PMNode; text: string };
  const blocks: Para[] = [];
  st.doc.nodesBetween(from, to, (n, pos) => {
    // Line breaks travel as \n (the prompt keeps them), so a correction never turns them into spaces.
    if (n.isTextblock) { const t = n.textBetween(0, n.content.size, '', (x) => (x.type === N.hard_break ? '\n' : '')); if (t.trim()) blocks.push({ pos, node: n, text: t }); return false; }
    return true;
  });
  if (!blocks.length) { toast('Nothing to check.'); return; }
  const batches: Para[][] = [];
  let cur: Para[] = [], size = 0;
  for (const b of blocks) { if (size + b.text.length > 3500 && cur.length) { batches.push(cur); cur = []; size = 0; } cur.push(b); size += b.text.length; }
  if (cur.length) batches.push(cur);
  const ctl = aiBusy(`${f.label}… 0 of ${blocks.length} paragraphs`);
  const author = aiAuthor();
  const ask = (text: string, maxTokens: number) => chat({ messages: [{ role: 'system', content: system }, { role: 'user', content: f.prompt({ text, lang: 'auto', n: 1, variety: v }) }], tier: f.tier, temperature: 0, signal: ctl.signal, maxTokens });
  let changed = 0, done = 0, skipped = 0, stopped = false;
  try {
    for (const batch of batches) {
      if (ctl.signal.aborted) break;
      const joined = batch.map((b) => b.text).join('\n\n');
      const r = await ask(joined, Math.max(512, Math.ceil(joined.length / 2)));
      let outs = cleanOutput(r.text).split(/\n\s*\n/);
      if (r.truncated || outs.length !== batch.length) {
        // Cut off, or the paragraph count changed: one request per paragraph for this batch. A
        // paragraph whose answer is cut off is left alone (its missing end is not a correction).
        outs = [];
        for (const b of batch) {
          const one = await ask(b.text, Math.max(256, b.text.length));
          outs.push(one.truncated ? '' : cleanOutput(one.text));
        }
      }
      // Apply from the last paragraph backward so earlier positions stay valid.
      for (let k = batch.length - 1; k >= 0; k--) {
        const b = batch[k];
        const fixed = outs[k]?.trim();
        if (!fixed || fixed === b.text.trim()) continue;
        const at = app.docs.includes(tab) ? findNode(tab.view.state.doc, b.node, b.pos) : null;
        if (at == null) { skipped++; continue; }
        const ok = await replaceRange(app, { from: at + 1, to: at + 1 + b.node.content.size }, fixed, { track: true, author, tab, inBlock: true });
        if (ok) changed++;
      }
      done += batch.length;
      const label = document.querySelector('.qf-ai-busy span:nth-child(2)');
      if (label) label.textContent = `${f.label}… ${done} of ${blocks.length} paragraphs`;
    }
  } catch (e) {
    stopped = true;
    fail(e, app);
  } finally {
    aiIdle(ctl);
  }
  const extra = skipped ? ` ${skipped} paragraph${skipped === 1 ? ' was' : 's were'} edited while checking and left alone.` : '';
  if (changed) toast(`${changed} paragraph${changed === 1 ? '' : 's'} corrected as tracked changes. Review them with Review ▸ Next Change.${extra}`, { ms: 7000 });
  else if (ctl.signal.aborted) { if (!stopped) toast('Stopped'); }
  else if (!stopped) toast(`No corrections were needed.${extra}`, { ms: 7000 });
  if (changed) app.ui.openPane('revisions');
}

// ------------------------------------------------------------------------------------------
// Registration

const featureCommands = FEATURES.filter((f) => f.id !== 'ai.storyNotes').map((f) => ({
  id: f.id, label: f.label, icon: f.icon, tab: 'AI', group: f.group, tip: f.tip, keys: f.keys, popular: f.popular, keywords: `ai ${f.keywords || ''}`,
  kind: (f.options ? 'menu' : 'button') as 'menu' | 'button',
  edits: ['preview', 'replace', 'tracked', 'insertBelow', 'cursor', 'comments'].includes(f.output),
  run: (app: App, arg?: any) => runFeature(app, f, typeof arg === 'string' ? arg : undefined),
  menu: f.options ? (): MenuEntry[] => f.options!.map((o) => ({ id: f.id, arg: o.value, label: o.label })) : undefined,
}));

def(featureCommands);

def([
  {
    id: 'ai.setup', label: 'Set Up AI…', icon: 'auto_awesome', tab: 'AI', group: 'Assistant', popular: true, noRecord: true,
    tip: 'Choose a free or paid AI: on-device, free cloud tiers, your own computer, or a paid key. Opens the right page in your browser and picks up the key.',
    keywords: 'api key openai anthropic gemini mistral groq openrouter ollama wizard',
    run: async (app) => { const { openAiSetup } = await import('../ui/aiWizard'); await openAiSetup(app); },
  },
  {
    id: 'ai.providers', label: 'Providers & Models…', icon: 'tune', tab: 'AI', group: 'Providers', noRecord: true,
    tip: 'Switch AI provider, choose models, test or remove keys',
    run: async (app) => { const { openAiProviders } = await import('../ui/aiWizard'); await openAiProviders(app); },
  },
  {
    id: 'ai.chooseProvider', label: 'Active AI', icon: 'swap_horiz', tab: 'AI', group: 'Providers', kind: 'menu', noRecord: true,
    tip: 'Switch between the AI providers you have set up',
    run: async (app, id?: string) => {
      if (!id) { const { openAiProviders } = await import('../ui/aiWizard'); await openAiProviders(app); return; }
      if (!aiSettings().providers[id]) return;
      saveAiSettings((s) => { s.active = id; });
      toast(`AI: ${providerById(id)?.name}`);
    },
    menu: () => {
      const s = aiSettings();
      const items: MenuEntry[] = Object.keys(s.providers).map((id) => ({ id: 'ai.chooseProvider', arg: id, label: `${providerById(id)?.name || id} · ${s.providers[id].model}`, checked: s.active === id }));
      return [...items, ...(items.length ? [{ separator: true }] : []), { id: 'ai.setup', label: 'Add a provider…' }];
    },
  },
  {
    id: 'ai.chat', label: 'AI Pane', icon: 'chat_bubble', tab: 'AI', group: 'Assistant', kind: 'toggle', popular: true, keys: ['Mod-Alt-a'], noRecord: true,
    tip: 'Chat with the AI about this document; results can be inserted with one tap',
    run: (app) => app.ui.togglePane('ai'),
    isActive: (app) => (app.ui as any).pane?.def?.id === 'ai',
  },
  {
    id: 'ai.ensembleMode', label: 'Several AIs', icon: 'hub', tab: 'AI', group: 'Providers', kind: 'menu',
    tip: 'Use one AI, or send each request to several AIs: one combines their answers (master), or they deliberate until they agree (Quaker consensus)',
    keywords: 'ensemble multiple several ais master synthesize combine consensus quaker deliberate compare providers',
    run: async (app, mode?: string) => {
      if (mode !== 'single' && mode !== 'master' && mode !== 'consensus') { await openEnsembleSettings(app); return; }
      if (mode !== 'single' && !hasEnsembleMembers()) {
        toast('Choose at least two AIs first.');
        await openEnsembleSettings(app, mode as EnsembleMode);
        return;
      }
      saveAiSettings((s) => { s.ensemble.mode = mode as EnsembleMode; });
      toast(mode === 'single' ? 'AI: one AI answers' : mode === 'master' ? 'AI: several AIs; one combines the answers' : 'AI: several AIs deliberate until they agree');
      app.ui.refresh?.();
    },
    menu: () => {
      const m = aiSettings().ensemble.mode;
      return [
        { id: 'ai.ensembleMode', arg: 'single', label: 'Single AI', checked: m === 'single' },
        { id: 'ai.ensembleMode', arg: 'master', label: 'Master Combines Answers', checked: m === 'master' },
        { id: 'ai.ensembleMode', arg: 'consensus', label: 'Quaker Consensus', checked: m === 'consensus' },
        { separator: true },
        { id: 'ai.ensembleMembers', label: 'Choose AIs…' },
      ];
    },
  },
  {
    id: 'ai.ensembleMembers', label: 'Choose AIs…', icon: 'groups', tab: 'AI', group: 'Providers',
    tip: 'Choose which AIs answer together, which one is the master or clerk, and how many rounds of discussion',
    keywords: 'ensemble several ais members master clerk consensus quaker rounds',
    run: (app) => openEnsembleSettings(app),
  },
  {
    id: 'ai.showDeliberation', label: 'Show AI Discussion', icon: 'reviews', tab: 'AI', group: 'Providers', kind: 'toggle',
    tip: 'With several AIs, show each AI\'s answer and the rounds of discussion below the result',
    keywords: 'ensemble several ais discussion deliberation rounds consensus',
    run: (app) => { saveAiSettings((s) => { s.ensemble.showDeliberation = !s.ensemble.showDeliberation; }); toast(aiSettings().ensemble.showDeliberation ? 'The AI discussion will be shown' : 'The AI discussion will be hidden'); app.ui.refresh?.(); },
    isActive: () => aiSettings().ensemble.showDeliberation,
  },
  { id: 'ai.stop', label: 'Stop AI', icon: 'stop_circle', tab: 'AI', group: 'Assistant', noRecord: true, tip: 'Stop the request in progress', run: async () => { const { stopAi } = await import('../ui/aiPane'); stopAi(); } },
  {
    id: 'ai.settings', label: 'AI Settings…', icon: 'settings_suggest', tab: 'AI', group: 'Assistant', noRecord: true,
    tip: 'Tracked AI edits, privacy prompts, voice profile, style guide, language, usage',
    run: async (app) => { const { openAiSettings } = await import('../ui/aiWizard'); await openAiSettings(app); },
  },
  {
    id: 'ai.privacy', label: 'AI & Privacy', icon: 'shield', tab: 'AI', group: 'Assistant', noRecord: true,
    tip: 'Where your text goes when you use AI',
    run: async () => {
      const s = aiSettings();
      const p = providerById(s.active || '');
      const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const plan = ensemblePlan(s);
      const who = plan
        ? `<p><b>Several AIs:</b> each request goes to ${esc(listNames(receivingProviders(s).map((id) => { const d = providerById(id); return d ? `${d.name}${d.kind === 'local' || d.kind === 'builtin' ? ' (on this device)' : ''}` : id; })))}. Each cloud service receives the selected text (or the document, after asking) and the other AIs' answers; each one's terms apply.</p>`
        : `<p><b>Active provider:</b> ${p ? esc(p.name) : 'none'}${p && (p.kind === 'local' || p.kind === 'builtin') ? ' — runs on this device; your text does not leave it.' : p ? ' — the selected text (or the document, after asking) is sent to this service; its terms apply.' : ''}</p>`;
      await openDialog({ title: 'AI & Privacy', ok: 'Close', cancel: false, fields: [{ key: 'i', type: 'info', html: [
        '<p><b>Anne\'s Pen has no server.</b> AI requests go directly from this device to the provider you choose, using your own key. Nothing is sent until you run an AI command.</p>',
        who,
        '<p><b>Keys</b> are stored on this device only: in the Android Keystore-encrypted store in the app, or in this browser\'s IndexedDB on the web. They are never placed in documents, drafts or exported settings.</p>',
        '<p><b>Free tiers</b> of some services may use prompts to improve their models. Use the on-device model for confidential text.</p>',
        '<p><b>AI can be wrong.</b> Turn on "Insert AI edits as tracked changes" in AI Settings to review every change it makes.</p>',
      ].join('') }] });
    },
  },
  {
    id: 'ai.storyNotes', label: 'Story Notes…', icon: 'sticky_note_2', tab: 'AI', group: 'Creative', noRecord: true,
    tip: 'Notes about characters, setting, terminology and style, sent with every AI request for this document',
    run: async (app) => {
      const cur = await storyNotes(app);
      const v = await promptDialog('Story Notes', 'Background the AI should respect in this document (characters and relationships, places, era, spelling of names, style rules).', cur, { type: 'textarea', rows: 10 } as any);
      if (v == null) return;
      await kvSet('ai:notes:' + docKey(app.tab), v);
      toast(v.trim() ? 'Story notes saved for this document' : 'Story notes cleared');
    },
  },
  {
    id: 'ai.prompts', label: 'Prompt Library…', icon: 'library_books', tab: 'AI', group: 'Assistant', noRecord: true,
    tip: 'Save your own AI instructions and run them from the AI tab, the Quick Access Bar or a shortcut',
    run: (app) => managePrompts(app),
  },
  {
    id: 'ai.runPrompt', label: 'My Prompts', icon: 'play_circle', tab: 'AI', group: 'Assistant', kind: 'menu',
    tip: 'Run one of your saved AI prompts',
    run: async (app, id?: string) => {
      const s = aiSettings();
      if (!s.prompts.length) { await managePrompts(app); return; }
      let p = s.prompts.find((x) => x.id === id);
      if (!p) {
        const r = await openDialog({ title: 'Run Prompt', fields: [{ key: 'p', label: 'Prompt', type: 'select', options: s.prompts.map((x) => ({ value: x.id, label: x.name })), value: s.prompts[0].id }] });
        if (!r) return;
        p = s.prompts.find((x) => x.id === r.p);
      }
      if (!p) return;
      const sp = p;
      const output = sp.output === 'replace' ? 'preview' : sp.output === 'insert' ? 'insertBelow' : sp.output === 'newdoc' ? 'newDoc' : sp.output === 'comment' ? 'comments' : 'pane';
      await runFeature(app, {
        id: 'ai.custom', label: sp.name, icon: 'play_circle', group: 'Assistant', tip: '', markdown: true,
        input: sp.input === 'selection' ? 'selectionOrParagraph' : sp.input === 'document' ? 'selectionOrDocument' : 'prompt',
        output: output as AiFeature['output'], tier: 'quality', temperature: 0.5,
        prompt: ({ text }) => `${sp.prompt}${sp.output === 'comment' ? '\nRespond with JSON only: an array of {"quote": "exact excerpt", "comment": "note"}.' : ''}${text ? `\n\nText:\n${text}` : ''}`,
      });
    },
    menu: () => {
      const s = aiSettings();
      return [...s.prompts.map((p) => ({ id: 'ai.runPrompt', arg: p.id, label: p.name })), ...(s.prompts.length ? [{ separator: true }] : []), { id: 'ai.prompts', label: 'Manage prompts…' }];
    },
  },
  {
    id: 'ai.generateImage', label: 'Generate Image…', icon: 'image', tab: 'AI', group: 'Media', edits: true,
    tip: 'Create a picture from a description (needs a provider with an image model, such as OpenAI)',
    run: (app) => generateImage(app),
  },
  {
    id: 'ai.reviewEdits', label: 'Review AI Edits', icon: 'manage_history', tab: 'AI', group: 'Review', noRecord: true,
    tip: 'Open the Revisions pane to accept or reject changes made by AI (tracked as "AI (model)")',
    run: (app) => { app.ui.openPane('revisions'); },
  },
  {
    id: 'ai.clearLocal', label: 'Delete Downloaded Models', icon: 'delete', tab: 'AI', group: 'Assistant', noRecord: true,
    tip: 'Free the storage used by the on-device model',
    run: async () => {
      const { clearLocalModels, localStorageEstimate } = await import('../ai/local');
      const before = await localStorageEstimate();
      if (!(await confirmDialog('Delete Downloaded Models', `Delete the on-device AI model files? ${before}`, 'Delete'))) return;
      const n = await clearLocalModels();
      toast(n ? 'Downloaded model files deleted' : 'No downloaded model files were found');
    },
  },
]);

/** At least two set-up providers are chosen as members. */
function hasEnsembleMembers(): boolean {
  const s = aiSettings();
  return s.ensemble.members.filter((m) => s.providers[m.provider] && providerById(m.provider)).length >= MIN_MEMBERS;
}

async function openEnsembleSettings(app: App, mode?: EnsembleMode): Promise<void> {
  const { openAiSettings } = await import('../ui/aiWizard');
  await openAiSettings(app, { section: 'ensemble', mode });
}

async function managePrompts(app: App): Promise<void> {
  for (;;) {
    const s = aiSettings();
    const r = await openDialog({
      title: 'Prompt Library', wide: true,
      fields: [
        { key: 'id', label: 'Saved prompts', type: 'list', options: s.prompts.map((p) => ({ value: p.id, label: p.name })), value: s.prompts[0]?.id },
        { key: 'help', type: 'info', html: '<p class="qf-help">Saved prompts appear under AI ▸ My Prompts and can be added to the Quick Access Bar. The selected text (or document) is appended to the prompt.</p>' },
      ],
      ok: 'Close', cancel: false,
      buttons: [
        { label: 'New…', onClick: (_v, c) => c.close({ act: 'new' }) },
        { label: 'Edit…', onClick: (v, c) => c.close({ act: 'edit', id: v.id }) },
        { label: 'Delete', onClick: (v, c) => c.close({ act: 'delete', id: v.id }) },
      ],
    });
    if (!r || !r.act) return;
    if (r.act === 'delete' && r.id) { saveAiSettings((x) => { x.prompts = x.prompts.filter((p) => p.id !== r.id); }); continue; }
    const cur = r.act === 'edit' ? s.prompts.find((p) => p.id === r.id) : undefined;
    if (r.act === 'edit' && !cur) continue;
    const e = await openDialog({
      title: cur ? 'Edit Prompt' : 'New Prompt', wide: true, fields: [
        { key: 'name', label: 'Name', type: 'text', value: cur?.name || '' },
        { key: 'prompt', label: 'Instruction', type: 'textarea', rows: 5, value: cur?.prompt || '', placeholder: 'e.g. Rewrite as a formal genealogical abstract with dates in "1 Jan 1850" form' },
        { key: 'input', label: 'Works on', type: 'select', options: [{ value: 'selection', label: 'The selection (or paragraph)' }, { value: 'document', label: 'The selection, or the whole document' }, { value: 'none', label: 'Nothing (just the instruction)' }], value: cur?.input || 'selection', half: true },
        { key: 'output', label: 'Result', type: 'select', options: [{ value: 'replace', label: 'Preview, then replace' }, { value: 'insert', label: 'Insert below' }, { value: 'pane', label: 'Show in the AI pane' }, { value: 'comment', label: 'Comments' }, { value: 'newdoc', label: 'New document' }], value: cur?.output || 'replace', half: true },
      ],
      validate: (v) => (!String(v.name).trim() || !String(v.prompt).trim() ? 'Enter a name and an instruction.' : null),
    });
    if (!e) continue;
    saveAiSettings((x) => {
      const p = { id: cur?.id || `p${Date.now().toString(36)}`, name: String(e.name).trim(), prompt: String(e.prompt).trim(), input: e.input, output: e.output };
      x.prompts = cur ? x.prompts.map((q) => (q.id === cur.id ? p : q)) : [...x.prompts, p];
    });
  }
}

async function generateImage(app: App): Promise<void> {
  if (!(await ensureProvider(app, 'Generating images needs an AI provider with an image model.'))) return;
  const rp = await resolveProvider();
  if (!rp) return;
  if (!rp.def.images) { toast(`${rp.def.name} has no image model set up in QuillPen. OpenAI (gpt-image-1) is supported; add it in AI ▸ Set Up AI.`, { ms: 8000 }); return; }
  if (!(await privacyCheck())) return;
  const prompt = await promptDialog('Generate Image', 'Describe the picture', '', { type: 'textarea', rows: 3 } as any);
  if (!prompt?.trim()) return;
  const { aiBusy, aiIdle } = await import('../ui/aiPane');
  const tab = app.tab, at = anchorSelection(tab.view.state);
  const ctl = aiBusy('Generating image…');
  try {
    const res = await fetch(`${rp.baseUrl}/images/generations`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rp.key}` },
      body: JSON.stringify({ model: rp.def.images, prompt: prompt.trim(), size: '1024x1024', n: 1 }),
    });
    const text = await res.text();
    if (!res.ok) throw new AiError(`${rp.def.name} image error ${res.status}: ${text.slice(0, 300)}`);
    const j = JSON.parse(text);
    const b64 = j.data?.[0]?.b64_json;
    const url = b64 ? `data:image/png;base64,${b64}` : j.data?.[0]?.url;
    if (!url) throw new AiError('No image was returned.');
    const src = url.startsWith('data:') ? url : await imageDataUrl(url);
    const node = N.image.create({ src, alt: prompt.trim().slice(0, 200), width: 400 });
    if (ctl.signal.aborted) return;
    // Into the document it was asked for, where the caret was (or is now, if that text changed).
    if (!app.docs.includes(tab)) { toast('The document was closed before the picture arrived.'); return; }
    const view = tab.view;
    const sel = resolveSelection(view.state.doc, at) || view.state.selection;
    view.dispatch(view.state.tr.setSelection(sel).replaceSelectionWith(node).scrollIntoView());
  } catch (e) {
    fail(e, app);
  } finally {
    aiIdle(ctl);
  }
}
