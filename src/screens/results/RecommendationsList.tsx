import { useState } from 'react';
import type { ManuscriptFlowPair } from '../../services/v7Result';
import type { RecommendationCategory } from './categoryColors';
import { plainText } from './helpers';
import { alignmentOf } from './alignment';

export interface RecommendationItem {
  id: string;
  pair: number;
  pairLabel: string;
  section?: string;
  quote: string | null;
  issue?: string;
  revision: string;
  category?: RecommendationCategory;
}

const VISIBLE_FIXES = 2;

const clip = (text: string, max: number) => text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

// Only pairs with recommendations are listed, and those score below 0.85, so two honest labels are enough.
const levelOf = alignmentOf;

function problemOf(pair?: ManuscriptFlowPair) {
  const explanation = pair?.explanation;
  const text = explanation?.link_summary || explanation?.highlighted_inconsistencies.find(item => item.what)?.what;
  return text ? plainText(text) : 'These two sections do not connect clearly.';
}

// What each section says about the point of disagreement: Gemini's short phrase, else a clipped source line.
function saysOf(pair: ManuscriptFlowPair | undefined, side: 'a' | 'b') {
  if (!pair) return null;
  const name = side === 'a' ? pair.section_a : pair.section_b;
  const explanation = pair.explanation;
  const phrase = explanation?.comparison?.[side === 'a' ? 'a_says' : 'b_says'];
  if (phrase) return plainText(phrase);
  const quote = explanation?.highlighted_inconsistencies.find(item => item.section === name && item.quote)?.quote
    ?? explanation?.reference_list.find(item => item.section === name)?.sentence
    ?? pair.culprit_sentences[side === 'a' ? 'section_a' : 'section_b'][0]?.sentence;
  return quote ? `“${clip(plainText(quote), 110)}”` : null;
}

export function RecommendationsList({ items, pairs, linkedIds, onShowInManuscript, revealId }: {
  items: RecommendationItem[];
  pairs: ManuscriptFlowPair[];
  linkedIds: Set<string>;
  onShowInManuscript: (id: string) => void;
  revealId: string | null;
}) {
  const groups = items.reduce<{ pair: number; label: string; items: RecommendationItem[] }[]>((acc, item) => {
    const group = acc.find(entry => entry.pair === item.pair);
    if (group) group.items.push(item);
    else acc.push({ pair: item.pair, label: item.pairLabel, items: [item] });
    return acc;
  }, []);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  return <div className="space-y-4">
    {groups.map(group => {
      const pair = pairs.find(entry => entry.order === group.pair);
      const level = levelOf(pair);
      const saysA = saysOf(pair, 'a');
      const saysB = saysOf(pair, 'b');
      const open = expanded.has(group.pair) || group.items.slice(VISIBLE_FIXES).some(item => item.id === revealId);
      const hidden = group.items.length - VISIBLE_FIXES;
      return <section key={group.pair} aria-label={group.label} className={`rounded-xl border border-gray-200 border-l-4 ${level.bar} bg-white p-3 space-y-3`}>
        <h3 className="text-base font-bold leading-snug text-[#0b0f3d]">{pair ? <>Your <span className="capitalize">{pair.section_a}</span> and your <span className="capitalize">{pair.section_b}</span> {level.verdict}.</> : group.label}</h3>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-rose-700">Here’s why</p>
          <p className="text-sm leading-snug text-[#303746]">{problemOf(pair)}</p>
          {pair && (saysA || saysB) && <ul className="mt-1.5 space-y-1 text-sm leading-snug text-[#303746]">
            {saysA && <li className="flex gap-2"><span aria-hidden="true" className="text-gray-400">•</span><span><span className="font-semibold capitalize text-[#0b0f3d]">{pair.section_a}</span> says: {saysA}</span></li>}
            {saysB && <li className="flex gap-2"><span aria-hidden="true" className="text-gray-400">•</span><span><span className="font-semibold capitalize text-[#0b0f3d]">{pair.section_b}</span> says: {saysB}</span></li>}
          </ul>}
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#1a1fcc]">Suggested parts to edit</p>
          <ol className="space-y-2">
            {group.items.map((item, index) => <li key={item.id} id={`recommendation-${item.id}`} tabIndex={-1} hidden={index >= VISIBLE_FIXES && !open} className="scroll-mt-12 space-y-1 rounded-lg border border-[#dfe5f5] p-2.5 text-sm leading-snug text-[#303746]">
              <div className="flex flex-wrap items-center gap-2">
                {item.section && <span className="text-xs font-semibold capitalize text-gray-600">In {item.section}</span>}
              </div>
              {item.quote ? <p className="font-serif text-[13px] text-gray-700">“{clip(item.quote, 140)}”</p> : null}
              <p><span className="font-semibold text-[#1a1fcc]">Edit: </span>{plainText(item.revision)}</p>
              {linkedIds.has(item.id) && <button type="button" onClick={() => onShowInManuscript(item.id)} className="text-xs font-semibold text-[#1a1fcc] underline focus-visible:outline-2 focus-visible:outline-offset-2">Show in manuscript</button>}
            </li>)}
          </ol>
          {hidden > 0 && <button type="button" aria-expanded={open} onClick={() => setExpanded(new Set(open ? [...expanded].filter(id => id !== group.pair) : [...expanded, group.pair]))} className="mt-1.5 text-xs font-semibold text-[#1a1fcc] underline focus-visible:outline-2 focus-visible:outline-offset-2">{open ? 'Show fewer parts' : `Show ${hidden} more ${hidden === 1 ? 'part' : 'parts'} to edit`}</button>}
        </div>
      </section>;
    })}
    {!groups.length && <p className="text-sm text-gray-500">No recommendations for this scan.</p>}
  </div>;
}
