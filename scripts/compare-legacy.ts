/**
 * Fidelity check against LibreOffice: imports every file in a directory with Anne's Pen's
 * importers, converts the same files to text with LibreOffice, and prints word recall/precision
 * and the formatting the import produced.
 *
 *   npx vite-node scripts/compare-legacy.ts <dir-with-samples> [<work-dir>]
 */
// @ts-expect-error jsdom ships without type declarations here
import { JSDOM } from 'jsdom';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const w = new JSDOM('<!doctype html><html><body></body></html>').window as any;
for (const k of ['DOMParser', 'document', 'Node', 'Element', 'HTMLElement', 'XMLSerializer', 'DocumentFragment', 'navigator', 'getComputedStyle']) (globalThis as any)[k] ??= w[k];
(globalThis as any).window ??= w;

const dir = resolve(process.argv[2] || '.');
const work = resolve(process.argv[3] || join(dir, '.lo-text'));
mkdirSync(work, { recursive: true });
const files = readdirSync(dir).filter((f) => !f.startsWith('.'));
try { execFileSync('soffice', ['--headless', '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', work, ...files.map((f) => join(dir, f))], { stdio: 'ignore', timeout: 600000 }); } catch { /* some files LibreOffice cannot read */ }

const words = (s: string) => s.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || [];
function score(ours: string, theirs: string) {
  const bag = new Map<string, number>();
  for (const x of words(theirs)) bag.set(x, (bag.get(x) || 0) + 1);
  let hit = 0;
  const mine = words(ours);
  for (const x of mine) { const n = bag.get(x) || 0; if (n) { hit++; bag.set(x, n - 1); } }
  const total = words(theirs).length;
  return { recall: total ? hit / total : 1, precision: mine.length ? hit / mine.length : 1, total };
}

const { importFile } = await import('../src/io');
for (const f of files) {
  const oracle = [join(work, f.replace(/\.[^.]+$/, '') + '.txt'), join(work, f + '.txt')].find(existsSync);
  try {
    const b = readFileSync(join(dir, f));
    const r = await importFile(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, f);
    const text: string[] = [];
    const kinds = new Set<string>();
    r.doc.descendants((n) => { n.marks.forEach((m) => kinds.add(m.type.name)); if (!n.isText && !n.isTextblock) kinds.add(n.type.name); if (n.isTextblock) { text.push(n.textContent); n.forEach((c) => c.marks.forEach((m) => kinds.add(m.type.name))); return false; } return true; });
    const s = oracle ? score(text.join('\n'), readFileSync(oracle, 'utf8')) : null;
    console.log(`${f.padEnd(40)} ${r.format.id.padEnd(9)} ${r.recovery ? 'recovered ' : ''}${s ? `recall ${s.recall.toFixed(2)} precision ${s.precision.toFixed(2)} (${s.total} words)` : 'no LibreOffice text'}  ${[...kinds].sort().join(',')}`);
  } catch (e: any) {
    console.log(`${f.padEnd(40)} error: ${e?.message || e}`);
  }
}
