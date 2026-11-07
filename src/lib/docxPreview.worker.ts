import JSZip from 'jszip';
import { preparePreview } from './docxPreview';

let zip: JSZip | undefined;
let xml: string | undefined;
self.onmessage = async (event: MessageEvent<{ file?: File; budget: number }>) => {
  try {
    if (event.data.file) {
      zip = await JSZip.loadAsync(await event.data.file.arrayBuffer());
      const document = zip.file('word/document.xml');
      if (!document) throw new Error('Missing document');
      xml = await document.async('string');
    }
    if (!zip || !xml) throw new Error('Missing document');
    const result = await preparePreview(zip, xml, event.data.budget);
    self.postMessage(result, { transfer: [result.bytes] });
  } catch { self.postMessage({ error: true }); }
};
