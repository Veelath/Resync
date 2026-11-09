// Finds the sentence a suggested new sentence goes next to. That sentence is highlighted in yellow in the shown manuscript, like every other finding.

export type Placement = 'start' | 'end';

const MARKER_CLASS = 'placement-marker';

/** The first or last sentence of a section's text, shortened, to show next to a suggestion ("right after: …"). */
export function edgeSentence(text: string | null | undefined, placement: Placement, max = 170): string {
  const sentences = (text ?? '').split(/(?<=[.!?])\s+|\n+/).map(item => item.trim()).filter(item => item.split(/\s+/).length >= 4);
  const sentence = (placement === 'end' ? sentences[sentences.length - 1] : sentences[0]) ?? '';
  return sentence.length > max ? (placement === 'end' ? `…${sentence.slice(-max).trimStart()}` : `${sentence.slice(0, max).trimEnd()}…`) : sentence;
}

/** Removes any note left by an older version of the page. */
export function clearPlacementMarker() {
  document.querySelectorAll(`.${MARKER_CLASS}`).forEach(element => element.remove());
}
