/** Anne's Pen native format: ProseMirror JSON with a small envelope. */
import type { Node as PMNode } from 'prosemirror-model';
import { schema } from '../editor/schema';
import { decodeText } from './index';

export async function importNative(data: ArrayBuffer): Promise<PMNode> {
  const json = JSON.parse(decodeText(data));
  const docJson = json.qf ? json.doc : json;
  return schema.nodeFromJSON(docJson);
}

export async function exportNative(doc: PMNode): Promise<Blob> {
  const env = { qf: 1, app: 'Anne\'s Pen', saved: new Date().toISOString(), doc: doc.toJSON() };
  return new Blob([JSON.stringify(env)], { type: 'application/json' });
}
