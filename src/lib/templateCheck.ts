// Is an uploaded file really a manuscript template, a list of the chapter and section headings a paper must have?
// A template also relaxes the research-paper check, so any other document must not pass as one.

export const NOT_A_TEMPLATE_MESSAGE = 'Could not read this template because it is not a manuscript template. A template lists your school\'s chapter and section headings, including Methodology and at least two others, for example Introduction, Related Literature, Results or Conclusion. No template will be sent.';

// A heading counts when it starts with the research term, so "Findings, evidence and rules" in a manual is only one kind.
const KINDS: [string, RegExp][] = [
  ['abstract', /^abstract\b/],
  ['introduction', /^(introduction|background\b|rationale\b|statement of the problem|the problem\b|problem and (its )?(background|setting))/],
  ['objectives', /^((general |specific |research )?objectives?\b|objectives? of the study|research questions?\b|purpose of the study)/],
  ['literature', /^((review of )?(the )?related (literature|studies|works?)|review of (the )?(related )?literature|literature review|(theoretical|conceptual) framework)/],
  ['methodology', /\bmethodology\b|^((research )?methods?\b|methods? of (research|the study)|materials and methods|research (design|locale|instrument|procedure)|data (gathering|collection))/],
  ['results', /^(results?\b|findings\b|discussion\b|(presentation|analysis|interpretation)\b.*\b(data|results?|findings))/],
  ['conclusion', /^(summary\b.*\b(findings|conclusions?|recommendations?)|conclusions?\b|recommendations\b)/],
  ['references', /^(references|bibliography|works cited|literature cited)\b/],
  ['study-scope', /^(scope\b|significance of|delimitations?\b|limitations? of the study|definition of terms)/],
];
const MIN_KINDS = 3;
const MAX_HEADING_WORDS = 12;
const MAX_QUESTION_SHARE = 0.15;   // as in the backend's research-paper check

const withoutNumbering = (line: string) => line.toLowerCase().trim()
  .replace(/^["'\s]+|["',:\s]+$/g, '')
  .replace(/^chapter\s+(\d+|[ivxl]+|one|two|three|four|five|six)\b[\s.:\-–—]*/, '')
  .replace(/^(\d+(\.\d+)*[.)]?|[ivxl]+[.)])\s+/, '');

const isHeadingLike = (line: string) => line.trim().split(/\s+/).length <= MAX_HEADING_WORDS && !/[.?!]$/.test(line.trim());

/** `lines` are the document's headings and other short lines; `mostlyHeadings` demands that nearly every line be one
 * (a text-file template is nothing but headings). */
export function looksLikeTemplate(lines: string[], mostlyHeadings = false): boolean {
  const filled = lines.map(line => line.trim()).filter(Boolean);
  if (filled.filter(line => line.endsWith('?')).length > filled.length * MAX_QUESTION_SHARE) return false;   // a questionnaire
  const headings = filled.filter(isHeadingLike);
  if (mostlyHeadings && headings.length < filled.length * 0.7) return false;
  const found = new Set<string>();
  for (const heading of headings.map(withoutNumbering)) {
    const kind = KINDS.find(([, pattern]) => pattern.test(heading));
    if (kind) found.add(kind[0]);
  }
  return found.has('methodology') && found.size >= MIN_KINDS;
}
