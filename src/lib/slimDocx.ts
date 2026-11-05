import JSZip from 'jszip';

// A 1x1 transparent PNG. Pictures are never read (only the writing is compared), but the file still has to point at something.
const PLACEHOLDER = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
const WORTH_SLIMMING = 1_000_000;

/**
 * Word files full of pictures are slow to send, open and draw, yet the pictures are thrown away anyway. This swaps every
 * picture for a tiny placeholder and keeps all the text, tables and layout as they were. Anything unexpected returns the
 * original file untouched.
 */
export async function slimDocx(file: File): Promise<File> {
  if (file.size < WORTH_SLIMMING || !/\.docx$/i.test(file.name)) return file;
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const pictures = Object.keys(zip.files).filter(name => /^word\/media\//i.test(name) && !zip.files[name].dir);
    if (!pictures.length) return file;
    for (const name of pictures) zip.file(name, PLACEHOLDER);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
    if (blob.size >= file.size) return file;
    return new File([blob], file.name, { type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', lastModified: file.lastModified });
  } catch (error) {
    console.warn('Could not shrink the document; using it as it is.', error);
    return file;
  }
}
