export interface HighlightTarget {
  id: string; // The issue/inconsistency ID
  quote: string; // evidence_a or evidence_b
  severity: 'high' | 'medium' | 'low';
}

export type HighlightedNode =
  | { type: 'text'; content: string }
  | { type: 'highlight'; content: string; targetId: string; severity: string };

function normalizeText(text: string): string {
  // Lowercase, collapse whitespace, strip leading/trailing punctuation
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/^[\W_]+|[\W_]+$/g, '');
}

export function generateHighlightedText(rawText: string, targets: HighlightTarget[]): HighlightedNode[] {
  // To avoid fuzzy-match risks and >1 occurrences, we will first find the exact raw substring
  // for targets that appear EXACTLY once after normalization.
  
  // Since targets might not match character-for-character due to minor whitespace changes,
  // we could use a regex that allows variable whitespace, but the requirement is "0 or >1 matches = no highlight".
  // Let's implement a robust search by splitting the raw text into words or using a regex for each quote.
  
  const validTargets: { targetId: string; severity: string; regex: RegExp; start: number; end: number; content: string }[] = [];
  
  for (const t of targets) {
    if (!t.quote || t.quote.trim() === '') continue;
    
    // Create a regex that collapses whitespace and ignores punctuation
    const words = t.quote.trim().split(/\s+/).map(w => w.replace(/^[\W_]+|[\W_]+$/g, ''));
    if (words.length === 0) continue;
    
    // Build regex that matches these words with arbitrary punctuation/whitespace between them
    const regexStr = words.map(w => {
      // Escape word for regex
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `(?:[\\W_]*${escaped}[\\W_]*)`;
    }).join('\\s+');
    
    const regex = new RegExp(`(?<=\\b|\\W|^)${regexStr}(?=\\b|\\W|$)`, 'gi');
    
    // Find occurrences
    const matches = [...rawText.matchAll(regex)];
    
    if (matches.length === 1) {
      const match = matches[0];
      validTargets.push({
        targetId: t.id,
        severity: t.severity,
        regex,
        start: match.index!,
        end: match.index! + match[0].length,
        content: match[0]
      });
    }
  }
  
  // Resolve overlaps - if two highlights overlap, drop the smaller one (or just keep the first one found)
  validTargets.sort((a, b) => a.start - b.start);
  const nonOverlapping: typeof validTargets = [];
  
  for (const vt of validTargets) {
    if (nonOverlapping.length === 0) {
      nonOverlapping.push(vt);
    } else {
      const last = nonOverlapping[nonOverlapping.length - 1];
      if (vt.start < last.end) {
        // Overlap! Keep the longer one
        if (vt.end - vt.start > last.end - last.start) {
          nonOverlapping[nonOverlapping.length - 1] = vt;
        }
      } else {
        nonOverlapping.push(vt);
      }
    }
  }
  
  // Now build the nodes
  const nodes: HighlightedNode[] = [];
  let currentIndex = 0;
  
  for (const vt of nonOverlapping) {
    if (vt.start > currentIndex) {
      nodes.push({ type: 'text', content: rawText.substring(currentIndex, vt.start) });
    }
    nodes.push({ type: 'highlight', content: vt.content, targetId: vt.targetId, severity: vt.severity });
    currentIndex = vt.end;
  }
  
  if (currentIndex < rawText.length) {
    nodes.push({ type: 'text', content: rawText.substring(currentIndex) });
  }
  
  return nodes;
}
