// The one template a student keeps in this browser: its headings and, so it can be looked at again, the uploaded file.
export const SAVED_TEMPLATE_KEY = 'resync_saved_template';

export interface TemplateChapter { id: string; title: string; sections: string[] }

export interface SavedTemplate {
  chapters: TemplateChapter[];
  savedAt?: string;
  /** Set when the headings came from a file that passed looksLikeTemplate. */
  checked?: boolean;
  /** The uploaded file, base64. Templates saved before this was kept have headings only. */
  fileName?: string;
  fileData?: string;
}

const isChapter = (value: unknown): value is TemplateChapter => {
  const chapter = value as TemplateChapter | null;
  return !!chapter && typeof chapter.title === 'string' && Array.isArray(chapter.sections) && chapter.sections.every(section => typeof section === 'string');
};

/** The saved template, or null when there is none or it cannot be read. */
export function readSavedTemplate(storage: Pick<Storage, 'getItem'>): SavedTemplate | null {
  try {
    const saved = JSON.parse(storage.getItem(SAVED_TEMPLATE_KEY) ?? 'null') as SavedTemplate | null;
    return saved && Array.isArray(saved.chapters) && saved.chapters.every(isChapter) ? saved : null;
  } catch {
    return null;
  }
}

export async function fileToData(file: Blob): Promise<string> {
  let binary = '';
  for (const byte of new Uint8Array(await file.arrayBuffer())) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** The saved file again, or null for a template saved without one. */
export function savedFile(saved: SavedTemplate | null): File | null {
  if (!saved?.fileName || !saved.fileData) return null;
  try {
    return new File([Uint8Array.from(atob(saved.fileData), character => character.charCodeAt(0))], saved.fileName);
  } catch {
    return null;
  }
}
