import JSZip from 'jszip';

// A 1x1 transparent PNG. Pictures are not scored (only the writing is compared), but the file still has to point at something.
const PLACEHOLDER = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
const WORTH_SLIMMING = 1_000_000;
// A file with almost no text is made of its pictures (a scan or handwriting). The server looks at a few of them to say
// which, so the largest ones are kept. The three limits match services/paper_check.py and services/page_check.py.
const PICTURE_DOCUMENT_WORDS = 200;
const KEPT_PICTURES = 4;
const KEPT_BYTES = 8 * 1024 * 1024;

async function pagePicturesToKeep(zip: JSZip, pictures: string[]): Promise<Set<string>> {
  const xml = await zip.file('word/document.xml')?.async('string');
  if (xml === undefined) return new Set();
  const text = xml.split('</w:p>')
    .map(paragraph => Array.from(paragraph.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g), match => match[1]).join(''))
    .join(' ');
  if (text.split(/\s+/).filter(Boolean).length >= PICTURE_DOCUMENT_WORDS) return new Set();
  const sized: { name: string; size: number }[] = [];
  for (const name of pictures.filter(picture => /\.(png|jpe?g|webp)$/i.test(picture))) {
    sized.push({ name, size: (await zip.files[name].async('uint8array')).length });
  }
  const keep = new Set<string>();
  let total = 0;
  for (const { name, size } of sized.sort((a, b) => b.size - a.size)) {
    if (keep.size === KEPT_PICTURES || total + size > KEPT_BYTES) continue;
    keep.add(name);
    total += size;
  }
  return keep;
}

/**
 * Word files full of pictures are slow to send, open and draw, yet the pictures are thrown away anyway. This swaps every
 * picture for a tiny placeholder and keeps all the text, tables and layout as they were (a file that is only pictures
 * keeps a few of them, see above). Anything unexpected returns the original file untouched.
 */
export async function slimDocx(file: File): Promise<File> {
  if (file.size < WORTH_SLIMMING || !/\.docx$/i.test(file.name)) return file;
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const pictures = Object.keys(zip.files).filter(name => /^word\/media\//i.test(name) && !zip.files[name].dir);
    if (!pictures.length) return file;
    const keep = await pagePicturesToKeep(zip, pictures);
    for (const name of pictures) if (!keep.has(name)) zip.file(name, PLACEHOLDER);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
    if (blob.size >= file.size) return file;
    return new File([blob], file.name, { type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', lastModified: file.lastModified });
  } catch (error) {
    console.warn('Could not shrink the document; using it as it is.', error);
    return file;
  }
}
