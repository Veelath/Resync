import JSZip from 'jszip';
import { archiveDocument } from './docxPreview';
import { pageDocument } from './docxPages';

let zip: JSZip | undefined;
let pages: string[] = [];
self.onmessage = async (event: MessageEvent<{ file?: File; index: number }>) => {
  try {
    if (event.data.file) {
      zip = await JSZip.loadAsync(await event.data.file.arrayBuffer());
      const xml = await zip.file('word/document.xml')?.async('string');
      if (!xml) throw new Error('Missing document');
      pages = pageDocument(xml);
    }
    if (!zip || !pages[event.data.index]) throw new Error('Missing page');
    const bytes = await archiveDocument(zip, pages[event.data.index], { image: 12_000_000, total: 30_000_000 });   // the report shows the real pictures
    self.postMessage({ bytes, index: event.data.index, total: pages.length }, { transfer: [bytes] });
  } catch { self.postMessage({ error: true }); }
};
