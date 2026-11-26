// How the backend starts its sentence for a file it cannot read (services/paper_check.py): another language, two
// columns, a scan, handwriting, or any combination. A school template cannot make such a file readable.
export const isUnreadableDocument = (problem?: string | null): boolean =>
  /^Could not read this document because /.test(problem ?? '');

/** The pop-up title for a document the outline refused. The message under it is the server's own wording. */
export function paperProblemTitle(problem: string): string {
  if (isUnreadableDocument(problem)) return 'Document not supported';
  // The two older sentences are still sent by a backend that has not been redeployed.
  if (/looks like a scan/i.test(problem)) return 'This looks like a scanned document';
  if (/two-column/i.test(problem)) return 'Two columns are not supported';
  return 'This does not look like a research paper';
}
