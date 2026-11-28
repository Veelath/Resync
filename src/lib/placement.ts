// Where a sentence to be added belongs in the shown manuscript: next to the first or last sentence of its section,
// never on the section's heading.
import { edgeSentence, type Placement } from './sectionNavigation';
import { contentsRange } from './contentsPage';

const squash = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const KEY_LENGTH = 60;

/**
 * `paragraphs` are the shown paragraphs in reading order. Returns the one the new sentence goes before (placement
 * "start") or after ("end"), or -1 when the section's edge cannot be found among them.
 */
export function placementParagraph(paragraphs: string[], section: string, sectionText: string | null | undefined, placement: Placement): number {
  const sentence = squash(edgeSentence(sectionText, placement, Number.MAX_SAFE_INTEGER));
  if (!sentence) return -1;
  // The first words of the opening sentence, or the last words of the closing one: a sentence can run over two paragraphs.
  const key = placement === 'start' ? sentence.slice(0, KEY_LENGTH) : sentence.slice(-KEY_LENGTH);
  const contents = contentsRange(paragraphs);
  // Contents lines are blanked, so neither a heading nor a sentence is found among them.
  const texts = paragraphs.map((text, index) => contents && index >= contents[0] && index <= contents[1] ? '' : squash(text));
  const name = squash(section);
  const heading = texts.findIndex(text => text === name || text.replace(/^(chapter)?[0-9ivx]+/, '') === name);
  const found = texts.findIndex((text, index) => index > heading && text.includes(key));
  return found >= 0 ? found : texts.findIndex(text => text.includes(key));
}
