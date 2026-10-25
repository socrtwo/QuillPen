/**
 * Anne's Office suite scroll cues (see ../styles/scrollcue.css). Framework-free; one instance per page.
 * TypeScript copy of the shared suite module suite/scrollcue/scrollcue.js: keep the two in step.
 *
 *   import { installScrollCues } from './scrollcue.js';
 *   installScrollCues({ selector: '.menu, .dialog-body, .list', label: 'More' });
 *
 * Every element matching `selector` gets the .sc-scroll class (thin bar + edge shadows). While such an
 * element is visible and can scroll further down, a "More" chip floats at its bottom edge; activating it
 * scrolls by most of a page. The chip lives in <body> (position: fixed), so container layouts are never
 * changed; for a container inside a modal <dialog> or an open popover the chip lives in that element
 * instead, because anything outside the top layer is drawn under it and made inert. Containers are
 * found again whenever the DOM changes.
 *
 * A container whose bottom edge is hidden inside another scrolling container (a list inside a dialog
 * body, say) shows no chip of its own until that edge is scrolled into view: the outer container's chip
 * already says "more below", and two chips would stack (nor while its chip would sit right next to the
 * outer one's). Chips also stay above the on-screen keyboard
 * (visualViewport) and below anything that covers the container (they take its stacking level, and hide
 * when another surface, such as a second dialog at the same z-index, is drawn over the chip's spot).
 * DOM changes inside `ignore` (an editing surface that changes on every key) never trigger a rescan.
 */
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>';
/**
 * @param {{ selector?: string, label?: string, minHeight?: number, ignore?: string }} [opts]
 *   selector: the scroll containers to decorate (default `[data-scrollcue]`); label: chip text (default
 *   "More"); minHeight: containers shorter than this (px) get shadows but no chip (default 64);
 *   ignore: subtrees whose DOM changes need no rescan (default none).
 * @returns {{ refresh(): void, destroy(): void }}
 */
export interface ScrollCueOptions { selector?: string; label?: string; minHeight?: number; ignore?: string }

export function installScrollCues(opts: ScrollCueOptions = {}): { refresh(): void; destroy(): void } {
  const selector = opts.selector || '[data-scrollcue]';
  const label = opts.label || 'More';
  const minHeight = opts.minHeight ?? 64;
  const ignore = opts.ignore || '';
  const tracked = new Set<HTMLElement>();
  const chips = new Map<HTMLElement, HTMLButtonElement>(); // container -> chip, created on first need
  let queued = false;
  // Only a container that can actually scroll (overflow-y auto/scroll) gets a chip: an element with
  // overflow hidden or visible may report a larger scrollHeight, but scrolling it does nothing.
  const scrollable = (el: HTMLElement) => el.scrollHeight - el.clientHeight > 6 && /(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY);
  const atBottom = (el: HTMLElement) => el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
  const visible = (el: HTMLElement) => el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const scrolls = (st: CSSStyleDeclaration) => /(auto|scroll|overlay)/.test(st.overflowY);
  function chipFor(el: HTMLElement): HTMLButtonElement {
    let chip = chips.get(el);
    if (chip)
      return chip;
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'sc-chip sc-hidden';
    chip.tabIndex = -1; // keyboard users scroll with the keys; the chip is a pointer/touch affordance
    chip.setAttribute('aria-hidden', 'true');
    chip.innerHTML = `${ARROW}<span></span>`;
    chip.lastElementChild!.textContent = label;
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.scrollBy({ top: Math.max(40, el.clientHeight * 0.8), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    document.body.appendChild(chip);
    chips.set(el, chip);
    return chip;
  }
  /** The top-layer element (modal dialog, open popover) that contains el, else <body>. */
  function hostFor(el: HTMLElement): Element {
    try {
      return el.closest('dialog:modal, :popover-open') || document.body;
    }
    catch { /* older engines */ }
    try {
      return el.closest('dialog[open]') || document.body;
    }
    catch {
      return document.body;
    }
  }
  /** Visible part of el after clipping by overflow ancestors and the visual viewport; `cut` is true when a
   *  scrolling ancestor hides el's bottom edge. */
  function visibleBox(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    let top = r.top, bottom = r.bottom, left = r.left, right = r.right, cut = false;
    for (let n: HTMLElement = el; n.parentElement && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed')
        break; // fixed boxes escape their ancestors' clipping
      const a = n.parentElement;
      const st = getComputedStyle(a);
      if (st.overflowY === 'visible')
        continue;
      const ar = a.getBoundingClientRect();
      const ab = ar.top + a.clientTop + a.clientHeight;
      if (bottom > ab + 1 && scrolls(st))
        cut = true;
      top = Math.max(top, ar.top + a.clientTop);
      bottom = Math.min(bottom, ab);
      if (st.overflowX !== 'visible') {
        left = Math.max(left, ar.left + a.clientLeft);
        right = Math.min(right, ar.left + a.clientLeft + a.clientWidth);
      }
    }
    const vv = window.visualViewport;
    const vb = vv ? Math.min(innerHeight, vv.offsetTop + vv.height) : innerHeight;
    return { top: Math.max(top, 0), bottom: Math.min(bottom, vb), left: Math.max(left, 0), right: Math.min(right, innerWidth), cut };
  }
  /** Something other than el (a dialog or menu opened on top at the same or a higher stacking level) is
   *  drawn at (x, y). The chip's own parts do not count. */
  function covered(el: HTMLElement, x: number, y: number): boolean {
    const hit = document.elementsFromPoint(x, y).find((n) => !n.closest('.sc-chip'));
    return !!hit && hit !== el && !el.contains(hit);
  }
  function place(el: HTMLElement) {
    let show = visible(el) && scrollable(el) && !atBottom(el);
    let box: ReturnType<typeof visibleBox> | null = null;
    if (show) {
      box = visibleBox(el);
      show = !box.cut && box.bottom - box.top >= minHeight && box.right > box.left
        && !covered(el, (box.left + box.right) / 2, box.bottom - 12);
    }
    const existing = chips.get(el);
    if (!show) {
      existing?.classList.add('sc-hidden');
      return;
    }
    const chip = existing || chipFor(el);
    const host = hostFor(el);
    if (chip.parentNode !== host)
      host.appendChild(chip);
    const { left, right } = box!;
    chip.classList.remove('sc-hidden');
    // A narrow container (a side rail of icons) gets the arrow alone; the chip never sticks out of it.
    chip.classList.remove('sc-compact');
    if (chip.offsetWidth > right - left - 8)
      chip.classList.add('sc-compact');
    const half = chip.offsetWidth / 2, mid = (left + right) / 2;
    const lo = left + half + 2, hi = right - half - 2;
    chip.style.left = `${Math.round(lo > hi ? mid : Math.min(hi, Math.max(lo, mid)))}px`;
    chip.style.top = `${Math.round(box!.bottom - 8 - chip.offsetHeight)}px`;
    // Stacking: just above the container's own stacking level, so whatever covers the container covers the chip.
    chip.style.zIndex = String(Math.max(1, zOf(el) + 1));
  }
  function zOf(el: HTMLElement): number {
    let z = 0;
    for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
      const v = parseInt(getComputedStyle(n).zIndex, 10);
      if (!Number.isNaN(v))
        z = Math.max(z, v);
    }
    return z;
  }
  function scan() {
    queued = false;
    const found = new Set(document.querySelectorAll<HTMLElement>(selector));
    for (const el of found) {
      if (!tracked.has(el)) {
        tracked.add(el);
        el.classList.add('sc-scroll');
        el.addEventListener('scroll', schedule, { passive: true });
        resize.observe(el);
      }
      place(el);
    }
    for (const el of [...tracked]) {
      if (found.has(el) && el.isConnected)
        continue;
      tracked.delete(el);
      el.removeEventListener('scroll', schedule);
      resize.unobserve(el);
      chips.get(el)?.remove();
      chips.delete(el);
    }
    // A list whose bottom edge is visible near its dialog body's bottom edge would put two chips almost on
    // top of each other: keep the outer one, which also leads to whatever follows the list.
    const shown = [...chips].filter(([, c]) => !c.classList.contains('sc-hidden')).map(([el, c]) => ({ el, c, r: c.getBoundingClientRect() }));
    for (const a of shown) for (const b of shown) {
      if (a === b || !a.el.contains(b.el) || a.c.classList.contains('sc-hidden') || b.c.classList.contains('sc-hidden')) continue;
      const gap = a.r.height; // closer than a chip's height reads as one cue
      if (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom + gap && b.r.top < a.r.bottom + gap) b.c.classList.add('sc-hidden');
    }
  }
  function schedule() { if (!queued) {
    queued = true;
    requestAnimationFrame(scan);
  } }
  const resize = new ResizeObserver(schedule);
  // Ignore the chips' own position/visibility updates, or every placement would schedule another.
  const isChip = (n: unknown) => n instanceof Element && n.classList.contains('sc-chip');
  const ignored = (n: Node) => !!ignore && (n instanceof Element ? n : n.parentElement)?.closest(ignore) != null;
  const relevant = (m: MutationRecord) => !ignored(m.target) && (m.type === 'attributes' ? !isChip(m.target) : [...m.addedNodes, ...m.removedNodes].some((n) => !isChip(n)));
  const mo = new MutationObserver((list) => { if (list.some(relevant))
    schedule(); });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
  // A scrolling ancestor moves its containers (and their chips); unrelated scrollers (a big canvas or grid)
  // are ignored so that scrolling them costs nothing.
  const onScroll = (e: Event) => {
    const t = e.target;
    if (!(t instanceof Element) || t === document.documentElement) {
      schedule();
      return;
    }
    for (const el of chips.keys())
      if (t.contains(el)) {
        schedule();
        return;
      }
  };
  // Wider-looking thumb while dragging it (desktop).
  const onDown = (e: PointerEvent) => {
    const el = e.target instanceof Element ? e.target.closest('.sc-scroll') : null;
    if (!el)
      return;
    el.classList.add('sc-dragging');
    const up = () => { el.classList.remove('sc-dragging'); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  };
  // Keep menus and dialogs open: a press on a chip is not "outside" them. Stopped in the window's capture
  // phase, which runs before any document-level "click outside" listener, capturing or not (a listener on
  // the chip itself runs too late for a capturing one).
  const onChipPress = (e: Event) => { if (e.target instanceof Element && e.target.closest('.sc-chip')) e.stopPropagation(); };
  const PRESS = ['mousedown', 'pointerdown', 'touchstart'];
  for (const ev of PRESS) addEventListener(ev, onChipPress, { capture: true, passive: true });
  addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  addEventListener('scroll', onScroll, { passive: true, capture: true });
  addEventListener('pointerdown', onDown, { capture: true });
  schedule();
  return {
    refresh: schedule,
    destroy() {
      mo.disconnect();
      resize.disconnect();
      removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      removeEventListener('scroll', onScroll, { capture: true });
      removeEventListener('pointerdown', onDown, { capture: true });
      for (const ev of PRESS) removeEventListener(ev, onChipPress, { capture: true });
      for (const el of tracked)
        el.removeEventListener('scroll', schedule);
      for (const chip of chips.values())
        chip.remove();
      chips.clear();
      tracked.clear();
    },
  };
}
