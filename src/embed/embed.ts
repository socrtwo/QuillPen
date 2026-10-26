/**
 * Embedded-editor mode (docs/EMBED.md): Anne's Post loads this app in an <iframe> as
 * index.html?embed=compose&host=quillpost&v=1 and edits a message body in it. This module is the message
 * protocol, kept free of the application so it can be tested on its own:
 *
 *   Pen -> Post  quill-embed:ready    { app: "Anne's Pen", version }
 *   Post -> Pen  quill-embed:load     { html, subject?, theme?, lang? }
 *   Pen -> Post  quill-embed:changed  { dirty: true }            (at most every 2 s)
 *   Post -> Pen  quill-embed:request  { id }
 *   Pen -> Post  quill-embed:content  { id, html, text }
 *   Pen -> Post  quill-embed:done     { html, text }
 *   Pen -> Post  quill-embed:cancel   {}
 *
 * Every message carries v: 1. Only messages from the parent window are accepted; the origin of the first one
 * is remembered and later messages must come from it, and replies are addressed to it.
 */
export const EMBED_PREFIX = 'quill-embed:';
export const EMBED_VERSION = 1;
export const CHANGED_INTERVAL_MS = 2000;

/** "compose" when the page was opened as Anne's Post's embedded editor, else null. */
export function embedModeFrom(search: string): 'compose' | null {
  try { return new URLSearchParams(search).get('embed') === 'compose' ? 'compose' : null; } catch { return null; }
}

export interface LoadRequest { html: string; subject?: string; theme?: 'light' | 'dark'; lang?: string }

/** What the protocol needs from the editor. */
export interface EmbedEditor {
  /** Replace the document with the message body (not a user edit: no "changed" follows). */
  load(req: LoadRequest): void | Promise<void>;
  /** The current content as an email-safe HTML fragment and plain text. */
  content(): { html: string; text: string };
}

export interface MessageTarget { postMessage(message: unknown, targetOrigin: string): void }
export interface EmbedEnv {
  /** The window that embedded us (window.parent). */
  parent: MessageTarget;
  /** Origin to address "ready" to before the host has spoken (location.ancestorOrigins[0], else "*"). */
  initialOrigin?: string;
  appVersion: string;
  now?: () => number;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}

export class EmbedSession {
  private hostOrigin: string | null = null;
  private lastChanged = -Infinity;
  private changedTimer: unknown = null;
  private loading = false;
  private finished = false;
  loaded = false;
  private now: () => number;
  private setT: (fn: () => void, ms: number) => unknown;
  private clearT: (h: unknown) => void;

  constructor(private editor: EmbedEditor, private env: EmbedEnv) {
    this.now = env.now || (() => Date.now());
    this.setT = env.setTimeout || ((fn, ms) => setTimeout(fn, ms));
    this.clearT = env.clearTimeout || ((h) => clearTimeout(h as any));
  }

  private send(type: string, fields: Record<string, unknown> = {}): void {
    // Before the host has spoken: the embedding page's origin when the browser reports it. An opaque
    // origin ("null", e.g. a file: page) cannot be addressed, so it gets "*".
    const target = this.hostOrigin === null ? this.env.initialOrigin || '*' : this.hostOrigin === 'null' ? '*' : this.hostOrigin;
    this.env.parent.postMessage({ ...fields, type: EMBED_PREFIX + type, v: EMBED_VERSION }, target);
  }

  /** Tell the host the editor is listening. */
  ready(): void { this.send('ready', { app: 'Anne\'s Pen', version: this.env.appVersion }); }

  /** Handle a window "message" event. Returns true when it was a protocol message that was acted on. */
  async handle(e: { source: unknown; origin: string; data: unknown }): Promise<boolean> {
    if (e.source !== this.env.parent) return false;
    const m = e.data as Record<string, unknown> | null;
    if (!m || typeof m !== 'object' || typeof m.type !== 'string' || !m.type.startsWith(EMBED_PREFIX) || m.v !== EMBED_VERSION) return false;
    if (this.hostOrigin === null) this.hostOrigin = e.origin;
    else if (e.origin !== this.hostOrigin) return false;
    switch (m.type.slice(EMBED_PREFIX.length)) {
      case 'load': {
        const req: LoadRequest = { html: typeof m.html === 'string' ? m.html : '' };
        if (typeof m.subject === 'string') req.subject = m.subject;
        if (m.theme === 'light' || m.theme === 'dark') req.theme = m.theme;
        if (typeof m.lang === 'string' && /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(m.lang)) req.lang = m.lang;
        this.loading = true;
        try { await this.editor.load(req); } finally { this.loading = false; }
        this.loaded = true;
        this.finished = false;
        if (this.changedTimer != null) { this.clearT(this.changedTimer); this.changedTimer = null; }
        return true;
      }
      case 'request': {
        if (typeof m.id !== 'string' && typeof m.id !== 'number') return false;
        const c = this.editor.content();
        this.send('content', { id: m.id, html: c.html, text: c.text });
        return true;
      }
      default: return false;
    }
  }

  /** The user changed the document: "changed" goes out at most every CHANGED_INTERVAL_MS. */
  changed(): void {
    if (this.loading || this.finished) return;
    if (this.changedTimer != null) return; // one is already scheduled
    const wait = this.lastChanged + CHANGED_INTERVAL_MS - this.now();
    const fire = () => { this.changedTimer = null; if (this.finished) return; this.lastChanged = this.now(); this.send('changed', { dirty: true }); };
    if (wait <= 0) fire();
    else this.changedTimer = this.setT(fire, wait);
  }

  /** Done pressed: hand the content back. */
  done(): void {
    const c = this.editor.content();
    this.finish();
    this.send('done', { html: c.html, text: c.text });
  }

  /** Cancel pressed: the host keeps its old body. */
  cancel(): void {
    this.finish();
    this.send('cancel');
  }

  private finish(): void {
    this.finished = true;
    if (this.changedTimer != null) { this.clearT(this.changedTimer); this.changedTimer = null; }
  }
}
