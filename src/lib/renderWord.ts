// Draws a Word file as pages that begin where the file's own pages begin. Used by the preview before a scan and by the
// report, so both show the same copy.
import { parseAsync, renderDocument } from 'docx-preview';
import { markLayout } from './pagePlan';
import { layoutPages } from './pageLayout';

const OPTIONS = {
  className: 'docx', inWrapper: true, ignoreWidth: false, ignoreHeight: false, ignoreFonts: false,
  breakPages: true, ignoreLastRenderedPageBreak: true, renderHeaders: true, renderFooters: true,
  renderFootnotes: false, renderEndnotes: false, useBase64URL: true, renderAltChunks: false,
};

/**
 * Returns the drawn document and its styles, not yet on the page. Change them as needed, then call `paginate` to cut the
 * long stretches into pages.
 */
export async function renderWord(bytes: ArrayBuffer): Promise<{ body: HTMLElement; styles: HTMLElement; paginate: () => Promise<void> }> {
  const parsed = await parseAsync(bytes, OPTIONS);
  const documentBody = (parsed as unknown as { documentPart?: { body?: Parameters<typeof markLayout>[0] } }).documentPart?.body;
  if (documentBody) markLayout(documentBody);
  const body = document.createElement('div');
  const styles = document.createElement('div');
  for (const node of await renderDocument(parsed, OPTIONS)) (node.nodeName === 'STYLE' ? styles : body).appendChild(node);
  // the file's default tab distance, given in points; Word's own default is half an inch
  const points = parseFloat((parsed as unknown as { settingsPart?: { settings?: { defaultTabStop?: string } } }).settingsPart?.settings?.defaultTabStop ?? '');
  return { body, styles, paginate: () => layoutPages(body, styles, points > 0 ? points * 96 / 72 : 48) };
}
