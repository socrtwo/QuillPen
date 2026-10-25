/** Recovery report dialog and the manual recovery guide (from socrtwo/wordrecovery-SF). */
import { h, icon } from './dom';
import { openDialog, toast } from './dialog';
import type { RecoveryReport, MethodStatus } from '../io/recover';
import { MIME } from '../io/recover/fileid';
import { saveAs, openExternal, platformName } from '../platform/native';

const STATUS: Record<MethodStatus, [string, string]> = {
  success: ['check_circle', 'Succeeded'],
  partial: ['adjust', 'Partial'],
  failed: ['cancel', 'Failed'],
  skipped: ['remove_circle_outline', 'Skipped'],
};

export interface ReportActions {
  /** Open the best recovered text as a separate document. */
  openText?: (text: string) => void;
}

export function recoverySummary(r: RecoveryReport): string {
  if (r.mode === 'formatted') return `Recovered with formatting from the repaired ${r.repaired?.kind === 'odt' ? 'OpenDocument' : 'Word'} package.`;
  if (r.mode === 'text') return `Recovered text only (${r.bestName}). Formatting could not be rebuilt.`;
  return 'Nothing could be recovered from this file.';
}

export async function showRecoveryReport(r: RecoveryReport, actions: ReportActions = {}): Promise<void> {
  const base = r.fileName.replace(/\.[^.]+$/, '');
  const body = h('div', { class: 'qf-recovery' },
    h('p', { class: 'qf-recovery-summary' }, h('b', null, recoverySummary(r))),
    h('p', { class: 'qf-help' }, `Identified as: ${r.identified.description}.`),
    r.notes.length ? h('ul', { class: 'qf-recovery-notes' }, r.notes.map((n) => h('li', null, n))) : null,
    h('h3', null, 'Recovery methods'),
    h('table', { class: 'qf-recovery-methods' },
      h('tbody', null, r.methods.map((m) => {
        const [ic, label] = STATUS[m.status];
        return h('tr', { class: `qf-st-${m.status}${r.bestKey === m.key ? ' qf-best' : ''}` },
          h('td', { title: label }, icon(ic)),
          h('td', null, h('b', null, m.name), r.bestKey === m.key ? h('span', { class: 'qf-chip' }, 'best text') : null, h('div', { class: 'qf-help' }, m.detail), h('div', { class: 'qf-help qf-dim' }, m.desc)));
      }))),
    r.repaired && (r.repaired.repairedParts.length || r.repaired.salvagedParts.length || r.repaired.lostParts.length)
      ? h('div', null,
        h('h3', null, 'Package parts'),
        r.repaired.salvagedParts.length ? h('p', { class: 'qf-help' }, `Salvaged from raw bytes: ${r.repaired.salvagedParts.join(', ')}`) : null,
        r.repaired.repairedParts.length ? h('p', { class: 'qf-help' }, `Repaired XML: ${r.repaired.repairedParts.join('; ')}`) : null,
        r.repaired.lostParts.length ? h('p', { class: 'qf-help' }, `Could not recover: ${r.repaired.lostParts.join(', ')}`) : null)
      : null,
    r.foreign.length ? h('div', null,
      h('h3', null, 'Other data found inside the file'),
      r.foreign.map((seg) => h('div', { class: 'qf-recovery-seg' },
        h('span', null, `${seg.description}: ${fmtSize(seg.length)} at byte ${seg.offset.toLocaleString()}`),
        h('button', { class: 'qf-btn', onclick: () => saveAs(new Blob([seg.bytes.slice()], { type: MIME[seg.ext] || 'application/octet-stream' }), seg.suggestedName || `${base}.part.${seg.ext}`) }, 'Save piece…'),
        seg.recommended?.[0] ? h('button', { class: 'qf-link', onclick: () => openExternal(seg.recommended![0].url) }, `Repair with ${seg.recommended[0].name}`) : null)))
      : null,
  );
  const buttons: { label: string; onClick: (v: Record<string, any>, ctl: any) => void; primary?: boolean }[] = [];
  if (r.repaired) {
    buttons.push({
      label: `Save repaired .${r.repaired.kind}…`,
      onClick: () => saveAs(new Blob([r.repaired!.data], { type: MIME[r.repaired!.kind] }), `${base} (repaired).${r.repaired!.kind}`),
    });
  }
  if (r.bestText) {
    if (actions.openText && r.mode === 'formatted') buttons.push({ label: 'Open recovered text', onClick: (_v, ctl) => { ctl.close(null); actions.openText!(r.bestText); } });
    buttons.push({ label: 'Copy text', onClick: async () => { try { await navigator.clipboard.writeText(r.bestText); toast('Recovered text copied'); } catch { toast('Clipboard is not available'); } } });
    buttons.push({ label: 'Save text…', onClick: () => saveAs(new Blob([r.bestText], { type: 'text/plain' }), `${base} (recovered).txt`) });
  }
  buttons.push({ label: 'Manual recovery options', onClick: () => { void showManualRecovery(); } });
  await openDialog({ title: `Recovery Report: ${r.fileName}`, content: body, wide: true, ok: 'Close', cancel: false, buttons });
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

const link = (url: string, text: string) => `<a href="${url}" data-external="1">${text}</a>`;

/** Per-platform manual recovery guide, adapted from the Word Recovery "Manual recovery" tab. */
const MANUAL: Record<string, [string, string]> = {
  android: ['Android', `
    <h3>1. Version history in the app that created the file</h3>
    <p>Word for Android: open the document, ⋮ menu → <b>History</b> → <b>See version history</b>. Google Docs/Drive and OneDrive keep versions too.</p>
    <h3>2. Trash and recently deleted</h3>
    <p>Google Drive → <b>Trash</b>, OneDrive → <b>Recycle bin</b>, and the Files app's trash keep deleted files for about 30 days.</p>
    <h3>3. Cached and temporary copies</h3>
    <p>With a file manager, look in <code>/sdcard/Android/data/com.microsoft.office.word/cache/</code> and the app's <code>files</code> folder (access depends on the Android version).</p>
    <h3>4. Anne's Pen's own copies</h3>
    <p>File → Info → <b>Versions</b> lists the snapshots Anne's Pen saved, and Open → Recent keeps a cached copy of each file you opened here.</p>
    <h3>5. Online viewers</h3>
    <p>${link('https://office.live.com/start/Word.aspx', 'Word for the web')} and ${link('https://docs.google.com/', 'Google Docs')} sometimes open what desktop apps refuse.</p>`],
  windows: ['Windows', `
    <h3>1. AutoRecover files</h3>
    <p>Word saves AutoRecover snapshots as <code>.asd</code> files (Anne's Pen opens them). Paste into the Explorer address bar:</p>
    <ul><li><code>%AppData%\\Microsoft\\Word\\</code></li><li><code>%LocalAppData%\\Microsoft\\Office\\UnsavedFiles\\</code></li></ul>
    <h3>2. Temporary and backup files</h3>
    <p><code>%Temp%</code>: search for <code>~WRD*.tmp</code>, <code>~WRL*.tmp</code> and <code>~$*.docx</code>; Word backup copies are <code>.wbk</code>. In Word: File → Info → Manage Document → <b>Recover Unsaved Documents</b>.</p>
    <h3>3. Previous Versions / Shadow Copies</h3>
    <p>Right-click the file or folder → Properties → <b>Previous Versions</b> (needs System Protection or File History). For older Windows: ${link('http://www.shadowexplorer.com/', 'ShadowExplorer')}.</p>
    <h3>4. Open and Repair, Recover Text from Any File</h3>
    <p>In Word: File → Open → Browse, select the file, click the arrow on <b>Open</b> → <b>Open and Repair</b>. Or set the file-type filter to <b>Recover Text from Any File (*.*)</b>. Anne's Pen has both commands on File → Open.</p>
    <h3>5. Microsoft's guidance</h3>
    <p>${link('https://support.microsoft.com/en-us/office/recover-an-earlier-version-of-an-office-file-851b6ea8-1d12-43e2-b3f2-1095bb16cee2', 'Recover an earlier version of an Office file')} · ${link('https://support.microsoft.com/en-us/topic/how-to-troubleshoot-damaged-documents-in-word-b3b1986b-0c45-4ec2-baef-1e9a222badf3', 'Troubleshoot damaged documents in Word')}</p>
    <h3>6. Deleted-file recovery</h3>
    <p>${link('https://www.ccleaner.com/recuva', 'Recuva')} · ${link('https://www.cgsecurity.org/wiki/PhotoRec', 'PhotoRec')} · ${link('https://www.voidtools.com/', 'Everything')}</p>`],
  macos: ['macOS', `
    <h3>1. AutoRecovery files</h3>
    <ul><li><code>~/Library/Containers/com.microsoft.Word/Data/Library/Preferences/AutoRecovery/</code></li><li><code>~/Library/Application Support/Microsoft/Office/Office 2011 AutoRecovery/</code></li></ul>
    <p>Finder → Go → <b>Go to Folder…</b>; hold Option on the Go menu to show Library.</p>
    <h3>2. Temporary files</h3><p><code>/private/var/folders/</code> (Word's scratch directory) and <code>/tmp/</code>.</p>
    <h3>3. Time Machine</h3><p>Open the containing folder and enter Time Machine to browse snapshots.</p>
    <h3>4. Open and Repair</h3><p>Word 2016+: File → Open, select the file, arrow on Open → <b>Open and Repair</b>. ${link('https://www.libreoffice.org/', 'LibreOffice')} is often more tolerant.</p>`],
  linux: ['Linux', `
    <h3>1. LibreOffice</h3><p>${link('https://www.libreoffice.org/', 'LibreOffice Writer')} usually tolerates damaged DOCX/DOC better than Word.</p>
    <h3>2. Repair the ZIP container</h3><pre><code>cp damaged.docx broken.zip
zip -FF broken.zip --out fixed.zip
mv fixed.zip recovered.docx</code></pre>
    <h3>3. Extract text directly</h3><pre><code>unzip -p damaged.docx word/document.xml | sed 's/&lt;[^&gt;]*&gt;//g'
pandoc damaged.docx -o recovered.txt
antiword old.doc &gt; recovered.txt</code></pre>
    <h3>4. Strings on .doc binaries</h3><pre><code>strings -n 4 damaged.doc | less
strings -n 4 -e l damaged.doc   # UTF-16, Word's default</code></pre>
    <h3>5. Deleted-file recovery</h3><p>${link('https://www.cgsecurity.org/wiki/PhotoRec', 'PhotoRec')} · ${link('https://github.com/sleuthkit/sleuthkit', 'The Sleuth Kit')}</p>`],
  ios: ['iOS / iPadOS', `
    <h3>1. Version history</h3><p>Word for iOS: … menu → <b>Restore</b> → <b>Browse Version History</b>.</p>
    <h3>2. Files → Recently Deleted</h3><p>Files keeps deleted items for about 30 days.</p>
    <h3>3. Online viewers</h3><p>${link('https://office.live.com/start/Word.aspx', 'Word for the web')} · ${link('https://docs.google.com/', 'Google Docs')}</p>`],
  tools: ['More S2 recovery tools', `
    <p>Free tools by the author of Word Recovery, each specialized for one kind of damage:</p>
    <ul>
      <li>${link('https://socrtwo.github.io/wordrecovery-SF/', 'Word Recovery')}: the engine Anne's Pen's recovery is ported from</li>
      <li>${link('https://socrtwo.github.io/CorruptDOCXRepair/', 'CorruptDOCXRepair')} · ${link('https://socrtwo.github.io/quickwordrecovr-SF/', 'Quick Word Recovr')} · ${link('https://socrtwo.github.io/damageddocx2txt-SF/', 'Damageddocx2txt')}</li>
      <li>${link('https://socrtwo.github.io/xmltrncatorfixr-SF/app/', 'XML Truncator-Fixer')} · ${link('https://socrtwo.github.io/Immortal-Zip/', 'Immortal Zip')} · ${link('https://socrtwo.github.io/Universal-File-Repair-Tool/', 'Universal File Repair Tool')}</li>
      <li>${link('https://socrtwo.github.io/oorecovery-SF/', 'OO Recovery (OpenDocument)')} · ${link('https://socrtwo.github.io/savvyoffice-SF/', 'Savvy Repair for Microsoft Office')}</li>
    </ul>`],
};

export async function showManualRecovery(): Promise<void> {
  const plat = platformName();
  const guess = plat === 'android' ? 'android' : plat === 'ios' ? 'ios' : /Mac/.test(navigator.platform) ? 'macos' : /Linux/.test(navigator.platform) ? 'linux' : 'windows';
  const content = h('div', { class: 'qf-manual' });
  const pane = h('div', { class: 'qf-manual-body' });
  const tabs = h('div', { class: 'qf-seg' }, Object.entries(MANUAL).map(([k, [label]]) => h('button', { class: 'qf-seg-btn', 'data-k': k, onclick: () => show(k) }, label)));
  const show = (k: string) => {
    pane.innerHTML = MANUAL[k][1];
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('qf-on', b.getAttribute('data-k') === k));
  };
  pane.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a[data-external]') as HTMLAnchorElement | null;
    if (a) { e.preventDefault(); openExternal(a.href); }
  });
  content.append(tabs, pane);
  show(guess);
  await openDialog({ title: 'Manual Recovery Options', content, wide: true, ok: 'Close', cancel: false });
}
