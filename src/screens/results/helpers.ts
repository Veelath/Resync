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
export const STRENGTH_THRESHOLD = 70;
export const FAIR_THRESHOLD = 50;
export const DIMENSION_LABELS = {
  objectives_alignment: 'Context alignment',
  methodology_fit: 'Operational alignment',
  numeric_consistency: 'Evidence consistency',
  claim_support: 'Logical support',
} as const;

export function plainText(value: string | null | undefined): string {
  return (value || '').replace(/\b(objectives_alignment|methodology_fit|numeric_consistency|claim_support)\b/g,
    key => DIMENSION_LABELS[key as keyof typeof DIMENSION_LABELS])
    .replace(/\*\*|`|\*/g, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/\s+/g, ' ').trim();
}
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

const ROMAN_NUMERAL = /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)$/i;
const FRONT_MATTER = /^(?:table of contents|a\s+(?:capstone|thesis|research|project|dissertation)\b|presented to\b|in partial fulfil+ment|submitted (?:to|in)\b|by\b)/i;
const LOWERCASE_CONNECTOR = /^(?:a|an|and|as|at|by|for|from|in|of|on|or|the|to|with)$/;
const SECTION_HEADING = /^(?:abstract|introduction|acknowledg\w*|dedication|approval sheet|chapter\s)/i;

// A line can carry a title only when it is not a page number, roman numeral, fragment or front-matter phrase.
function isMeaningfulTitleLine(line: string): boolean {
  const text = line.trim();
  if ((text.match(/\p{L}/gu) ?? []).length < 4) return false;
  if (/^\d+$/.test(text) || ROMAN_NUMERAL.test(text)) return false;
  return !FRONT_MATTER.test(text);
}

function isMostlyUppercase(line: string): boolean {
  const letters = line.match(/\p{L}/gu) ?? [];
  const upper = letters.filter(letter => letter === letter.toUpperCase()).length;
  return letters.length > 0 && upper / letters.length >= 0.8;
}

function isTitleCase(line: string): boolean {
  return line.split(/\s+/).every(word => !/^\p{L}/u.test(word) || /^\p{Lu}/u.test(word) || LOWERCASE_CONNECTOR.test(word));
}

// Joins the second meaningful line only when it reads as the rest of the same title, not a new section.
function continuesTitle(previous: string, next: string): boolean {
  if (isMostlyUppercase(previous) && isMostlyUppercase(next)) return true;
  return !/[.!?:;,]$/.test(previous) && next.split(/\s+/).length <= 12 && isTitleCase(next) && !SECTION_HEADING.test(next);
}

export function extractDisplayTitle(text: string | null) {
  if (!text) return null;
  const [first, second] = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(isMeaningfulTitleLine);
  if (!first) return null;
  const title = second && continuesTitle(first, second) ? `${first} ${second}` : first;
  return title.slice(0, 160).trim();
}

// A stored or supplied title is only used when it passes the same test as a line taken from the manuscript text.
export function usableTitle(value: string | null | undefined): string | null {
  const title = value?.trim();
  if (!title || /^https?:\/\/docs\.google\.com\//i.test(title) || !isMeaningfulTitleLine(title)) return null;
  return title;
}

export function normalizeManuscriptPreview(text: string) {
  // Google Docs plain-text exports can start with a Roman-numeral page marker.
  return text.replace(/^\uFEFF?(?:(?:[ \t]*\r?\n)*[ \t]*(?:\d+|[ivxlcdm]+)[ \t]*(?:\r?\n)+)/i, '');
}
