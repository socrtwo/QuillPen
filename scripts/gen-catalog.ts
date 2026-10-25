/** Generates docs/COMMANDS.md from the live command registry. Run: npm run catalog */
import { writeFileSync } from 'node:fs';
import '../src/commands';
import { allCommands } from '../src/commands/registry';
import { DEFAULT_TABS, idsInTabs } from '../src/ui/ribbonLayout';

const cmds = allCommands();
const inTabs = idsInTabs();
const order = ['Backstage', 'Home', 'Insert', 'Draw', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View', 'Tools', 'AI', 'Developer', 'Help', 'Table', 'Picture'];
// Any tab not listed above still gets a section, so new tabs never vanish from the catalog.
for (const t of new Set(cmds.map((c) => c.tab))) if (t && !order.includes(t)) order.push(t);
const tabName = (t: string) => (t === 'Backstage' ? 'File' : t === 'Table' ? 'Table Tools (contextual)' : t === 'Picture' ? 'Picture Format (contextual)' : t);
const key = (k: string) => k.replace(/Mod/g, 'Ctrl').replace(/-/g, '+').replace(/\+\+$/, '+-');
const lines: string[] = [];
lines.push('# Anne\'s Pen Command Reference', '');
lines.push(`Anne's Pen ships **${cmds.length} commands**. Every one can be placed on the Quick Access Bar, added to a custom tab, bound to a keyboard shortcut, recorded in a macro, or found with command search (Alt+Q).`, '');
lines.push(`${cmds.filter((c) => !inTabs.has(c.id)).length} of them are "Commands Not in the Tabs" — reachable through the Quick Access Bar chooser, Customize Tabs, the command search, or menus — mirroring how desktop suites expose their full command library.`, '');
lines.push('This file is generated from the source by `npm run catalog`.', '');
lines.push('## Default tab layout', '');
for (const t of DEFAULT_TABS) lines.push(`- **${t.label}**${t.contextual ? ' (contextual)' : ''}: ${t.groups.map((g) => g.label).join(' · ')}`);
lines.push('');
for (const t of order) {
  const list = cmds.filter((c) => c.tab === t).sort((a, b) => (a.group || '').localeCompare(b.group || '') || a.label.localeCompare(b.label));
  if (!list.length) continue;
  lines.push(`## ${tabName(t)} (${list.length})`, '', '| Command | Group | Shortcut | ID | Notes |', '|---|---|---|---|---|');
  for (const c of list) lines.push(`| ${c.label.replace(/\|/g, '\\|')} | ${c.group || ''} | ${(c.keys || []).map(key).join(', ')} | \`${c.id}\` | ${[c.kind === 'menu' || c.kind === 'split' || c.kind === 'gallery' ? 'has options menu' : '', inTabs.has(c.id) ? '' : 'not in tabs', c.origin ? `inspired by ${c.origin}` : ''].filter(Boolean).join('; ')} |`);
  lines.push('');
}
writeFileSync('docs/COMMANDS.md', lines.join('\n'));
console.log(`Wrote docs/COMMANDS.md (${cmds.length} commands)`);
