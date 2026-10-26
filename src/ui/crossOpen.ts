/**
 * Opening a file that is not a word-processing document (a spreadsheet, a presentation or an
 * email): offer the sister app that edits it natively (Anne's Grid, Anne's Post, Anne's Stage) when it
 * can be reached from here, and always offer to import it into a document.
 */
import type { SniffResult } from '../io/sniff';
import { SISTER_APPS, sisterAppReach, openInSisterApp, type OpenedFile } from '../platform/native';
import { choiceDialog, toast, alertDialog } from './dialog';

const WHAT: Record<string, string> = {
  spreadsheet: 'Each sheet becomes a table.',
  presentation: 'Each slide becomes a section with its title, text and pictures.',
  email: 'The message opens with its sender, recipients, date and subject, the body, and a list of attachments.',
};

const IMPORTABLE: Record<string, string> = {
  spreadsheet: 'Excel (.xlsx, .xls, Excel 2-95), OpenDocument (.ods), CSV/TSV, dBASE and Lotus 1-2-3 files',
  presentation: 'PowerPoint (.pptx, .ppt) and OpenDocument (.odp) presentations',
  email: '.eml, .emlx, mbox, .msg and winmail.dat messages',
};

/** 'import' to continue opening as a document, 'done' when another app took it, 'cancel'. */
export async function chooseCrossOpen(s: SniffResult, file: OpenedFile, importable: boolean): Promise<'import' | 'done' | 'cancel'> {
  const cat = s.category as 'spreadsheet' | 'presentation' | 'email';
  const sister = SISTER_APPS[cat];
  if (!sister) return 'import';
  const reach = await sisterAppReach(sister);
  const choices: string[] = [];
  const actions: ('sister' | 'import')[] = [];
  if (reach === 'yes' || reach === 'maybe') { choices.push(`Open in ${sister.name}`); actions.push('sister'); }
  if (importable) { choices.push('Import into a document'); actions.push('import'); }
  if (reach === 'web') { choices.push(`Get ${sister.name} (web)`); actions.push('sister'); }
  const lead = `${file.name} is ${/^[aeiou]/i.test(s.label) ? 'an' : 'a'} ${s.label}${s.note ? ` (${s.note.replace(/^Opened as [^;]+; /, '').replace(/\.$/, '')})` : ''}.`;
  const body = importable
    ? `${lead} ${sister.name} edits ${sister.what} files. You can also import it here: ${WHAT[cat] || ''}`
    : `${lead} ${sister.name} edits ${sister.what} files. This kind of ${sister.what} file cannot be imported into a document; the ones that can are ${IMPORTABLE[cat]}.`;
  if (!choices.length) { await alertDialog('Not a Document', body); return 'cancel'; }
  const i = await choiceDialog(`Open ${s.label}`, body, choices);
  if (i < 0) return 'cancel';
  if (actions[i] === 'import') return 'import';
  try {
    const r = await openInSisterApp(sister, file);
    if (r.message) {
      if (!r.ok && importable) {
        const again = await choiceDialog(`Open ${s.label}`, r.message, ['Import into a document']);
        return again === 0 ? 'import' : 'cancel';
      }
      toast(r.message, { ms: 6000 });
    }
    return r.ok ? 'done' : 'cancel';
  } catch (e: any) {
    toast(`Could not open ${sister.name}: ${e?.message || e}`);
    return importable ? 'import' : 'cancel';
  }
}
