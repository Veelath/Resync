export function previewParagraphs(paragraphs: string[]): string[] {
  let remaining = 40000;
  return paragraphs.slice(0, 60).flatMap(paragraph => {
    if (remaining <= 0) return [];
    const part = paragraph.slice(0, remaining);
    remaining -= part.length;
    return [part];
  });
}
