import type { Citation } from '../../data/sampleReport';
import type { CitationReport } from '../../services/api';

// A citation is public only when its source could be reached without permission. Everything else
// (paywalled, login/bot-walled, broken or unresolvable, or no link at all) is treated as private.
export function citationAccess(c: CitationReport): Citation["status"] {
  if (c.citation_is_accessible === true) return "public";
  if (c.citation_is_accessible === false) return "private";
  const s = c.citation_status || "";
  if (["verified_doi", "verified_url", "verified_metadata", "metadata_mismatch", "accessible"].includes(s)) {
    return "public";
  }
  return "private";
}






export function citationText(value: string = ""): string {
  const text = document.createElement("textarea");
  text.innerHTML = value;
  return text.value.replace(/<\/?[a-z][^>]*>/gi, "").trim();
}


export const CITE_BADGE: Record<Citation["status"], { label: string; badge: string; row: string }> = {
  public:  { label: "Accessible (Public)",  badge: "bg-emerald-100 text-emerald-700", row: "border-emerald-200 bg-surface-success" },
  private: { label: "Inaccessible (Private)", badge: "bg-red-100 text-red-700",       row: "border-rose-200 bg-surface-error" },
};












// ─── Tokens ───────────────────────────────────────────────────────────────────

// ─── Primitives ───────────────────────────────────────────────────────────────







// ─── Animated keyword ─────────────────────────────────────────────────────────

// ─── Product preview card (hero visual) ──────────────────────────────────────

// ─── Home ─────────────────────────────────────────────────────────────────────

// ─── Research Types & Optional Templates ──────────────────────────────────────





// ─── Processing ───────────────────────────────────────────────────────────────

// ─── Results ──────────────────────────────────────────────────────────────────
// ─── Results ──────────────────────────────────────────────────────────────────

export const SECTION_STATUS = {
  Present: { icon: '✓', color: 'text-emerald-700' },
  Stub: { icon: '⚠', color: 'text-amber-800' },
  Unassessed: { icon: '—', color: 'text-gray-600' },
};
export type ReportSection = { key: string; name: string; role: string; text: string; status: keyof typeof SECTION_STATUS };

export function sectionRole(name: string): string {
  const heading = name.toLowerCase().replace(/_/g, ' ').replace(/^\s*(?:chapter\s+[\divxlc]+[.:\s-]*|\d+(?:\.\d+)*[.)]?\s+)/i, '').trim();
  const aliases: Record<string, string> = {
    'background of the study': 'introduction', 'introduction': 'introduction',
    'objectives of the study': 'objectives', 'research objectives': 'objectives',
    'research methodology': 'methodology', 'materials and methods': 'methodology',
    'conclusions': 'conclusion', 'conclusions and recommendations': 'conclusion',
    'review of related literature': 'literature review', 'bibliography': 'references',
  };
  return aliases[heading] || heading;
}

export function buildReportSections(detected: string[], text: string | null): ReportSection[] {
  const lines = (text || '').split(/\r?\n/);
  const roles = new Set(detected.map(sectionRole));
  const headings = lines.flatMap((line, index) => {
    const role = sectionRole(line);
    return line.trim() && roles.has(role) ? [{ role, index }] : [];
  });
  return detected.map((name, index) => {
    const role = sectionRole(name);
    const matching = headings.filter(heading => heading.role === role);
    const content = matching.map(heading => {
      const next = headings.find(other => other.index > heading.index);
      return lines.slice(heading.index + 1, next?.index ?? lines.length).join('\n').trim();
    }).join('\n\n');
    const wordCount = content ? content.split(/\s+/).length : 0;
    // shortcut: only explicit heading matches supply text; upgrade when the API returns section spans.
    const status = wordCount >= 40 ? 'Present' : wordCount > 0 ? 'Stub' : 'Unassessed';
    return { key: `${index}:${role}`, name, role, text: content, status };
  });
}

export function citationContains(reference: string, value: string | number | undefined) {
  const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return value != null && normalize(reference).includes(normalize(String(value)));
}

export function extractDisplayTitle(text: string | null) {
  if (!text) return null;
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim());
  const trivial = (line: string) => !line || /^(?:\d+|[ivxlcdm]+)$/i.test(line);
  const first = lines.findIndex(line => !trivial(line));
  if (first < 0) return null;
  const title = [lines[first]];
  const uppercase = lines[first] === lines[first].toUpperCase();
  for (const line of lines.slice(first + 1)) {
    if (trivial(line) || /^(?:a\s+(?:capstone|thesis|research|project)|submitted|presented|by\b)/i.test(line)) break;
    if (uppercase && line !== line.toUpperCase()) break;
    title.push(line);
  }
  return title.join(' ');
}

export function normalizeManuscriptPreview(text: string) {
  // Google Docs plain-text exports can start with a Roman-numeral page marker.
  return text.replace(/^\uFEFF?(?:(?:[ \t]*\r?\n)*[ \t]*(?:\d+|[ivxlcdm]+)[ \t]*(?:\r?\n)+)/i, '');
}
