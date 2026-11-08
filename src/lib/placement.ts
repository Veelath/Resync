// Finds the exact spot in the shown manuscript where a suggested sentence belongs, and marks it.

export type Placement = 'start' | 'end';

const MARKER_CLASS = 'placement-marker';
const norm = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** The first or last sentence of a section's text, shortened, to show next to a suggestion ("right after: …"). */
export function edgeSentence(text: string | null | undefined, placement: Placement, max = 170): string {
  const sentences = (text ?? '').split(/(?<=[.!?])\s+|\n+/).map(item => item.trim()).filter(item => item.split(/\s+/).length >= 4);
  const sentence = (placement === 'end' ? sentences[sentences.length - 1] : sentences[0]) ?? '';
  return sentence.length > max ? (placement === 'end' ? `…${sentence.slice(-max).trimStart()}` : `${sentence.slice(0, max).trimEnd()}…`) : sentence;
}

export function clearPlacementMarker() {
  document.querySelectorAll(`.${MARKER_CLASS}`).forEach(element => element.remove());
}

/** The spot for a new sentence: a green dashed box with a "+ Add this sentence here" label and the sentence itself. */
function makeMarker(placement: Placement, sentence?: string) {
  const marker = document.createElement('div');
  marker.className = MARKER_CLASS;
  marker.tabIndex = -1;
  marker.setAttribute('role', 'note');
  marker.title = placement === 'end' ? 'Add this as the last sentence of this section' : 'Add this as the first sentence of this section';
  marker.style.cssText = 'margin:14px 0;padding:14px 16px;border:2px dashed #1fa84f;border-radius:16px;background:#eaf9ef;'
    + 'box-shadow:0 10px 24px -18px rgba(31,168,79,.7);text-align:left;zoom:1;';
  const label = document.createElement('span');
  label.textContent = '+ Add this sentence here';
  label.style.cssText = "display:inline-block;padding:4px 14px;border-radius:999px;background:#1fa84f;color:#fff;font:700 13px/1.4 'Plus Jakarta Sans',system-ui,sans-serif;";
  marker.appendChild(label);
  if (sentence) {
    const text = document.createElement('p');
    text.textContent = sentence;
    text.style.cssText = "margin:10px 0 0;color:#1f2937;font:400 15px/1.6 Georgia,'Times New Roman',serif;text-align:left;text-indent:0;";
    marker.appendChild(text);
  }
  return marker;
}

const hasText = (element: Element) => norm(element.textContent).length > 0;

/** A paragraph that is the heading of `name`: its text is the name, with at most a chapter or number prefix. */
function isHeadingFor(element: Element, name: string) {
  const text = norm(element.textContent);
  if (!text || text.length > name.length + 40) return false;
  const bare = text.replace(/^(?:chapter|part|section)\s+[\divxlcdm]+[\s:.\-–—]*/, '').replace(/^[\d.]+\s*/, '');
  return bare === name || text === name;
}

/**
 * Finds where `placement` is for the section at `index` in the Word copy, marks it with a visible note and returns the
 * note (or null when the section is not on the page, for example when it is locked). Headings are searched in reading
 * order, and a heading only counts when real text follows it, so the table of contents is skipped.
 */
export function markInDocx(root: HTMLElement, names: string[], index: number, placement: Placement, sentence?: string): HTMLElement | null {
  clearPlacementMarker();
  const paragraphs = Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, h6')).filter(element => !element.closest('table') && hasText(element));
  const positions: (number | null)[] = [];
  let from = 0;
  for (const name of names) {
    const wanted = norm(name);
    let found: number | null = null;
    for (let at = from; at < paragraphs.length; at++) {
      const next = paragraphs[at + 1];
      if (isHeadingFor(paragraphs[at], wanted) && next && norm(next.textContent).length >= 60) { found = at; break; }
    }
    positions.push(found);
    if (found !== null) from = found + 1;
  }
  const heading = positions[index];
  if (heading === null || heading === undefined) return null;
  const marker = makeMarker(placement, sentence);
  if (placement === 'start') {
    paragraphs[heading + 1].before(marker);
  } else {
    const nextHeading = positions.slice(index + 1).find((position): position is number => position !== null);
    const last = paragraphs[(nextHeading ?? paragraphs.length) - 1];
    if (!last || (nextHeading ?? paragraphs.length) - 1 <= heading) return null;
    last.after(marker);
  }
  return marker;
}

/** The same for the plain text view, where each section is its own element. */
export function markInSection(section: Element | null, placement: Placement, sentence?: string): HTMLElement | null {
  clearPlacementMarker();
  if (!section) return null;
  const blocks = Array.from(section.querySelectorAll('p, .manuscript-compact-block')).filter(hasText);
  if (!blocks.length) return null;
  const marker = makeMarker(placement, sentence);
  if (placement === 'start') blocks[0].before(marker); else blocks[blocks.length - 1].after(marker);
  return marker;
}
