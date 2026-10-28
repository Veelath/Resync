import type React from 'react';
import type { V7Inconsistency } from '../../services/v7Result';

export function FindingsTab({ findings, expandedIssueIds, toggleIssueExpanded, allExpanded, toggleAllExpanded, renderFeedback }: {
  findings: V7Inconsistency[];
  expandedIssueIds: Set<string>;
  toggleIssueExpanded: (id: string) => void;
  allExpanded: boolean;
  toggleAllExpanded: () => void;
  renderFeedback: (item: V7Inconsistency) => React.ReactNode;
}) {
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">All Findings ({findings.length})</p>
      {findings.length > 0 && <button type="button" onClick={toggleAllExpanded} className="text-xs font-semibold text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg">{allExpanded ? 'Collapse All' : 'Expand All'}</button>}
    </div>
    {findings.length === 0 && <p className="text-sm text-gray-500">No highlighted inconsistencies were returned for this scan.</p>}
    {findings.map((item, index) => {
      const expanded = expandedIssueIds.has(item.inconsistency_id);
      return <article key={item.inconsistency_id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <button type="button" aria-expanded={expanded} aria-controls={`finding-${item.inconsistency_id}`} onClick={() => toggleIssueExpanded(item.inconsistency_id)}
          className="w-full text-left px-4 py-4 space-y-2 hover:bg-gray-50">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-rose-700">{item.section_a} → {item.section_b} · Pair {item.pair_order}</span><span className="text-xs mono text-gray-400">#{index + 1}</span></div>
          <h3 className="text-sm font-bold text-gray-900">{item.explanation_what}</h3>
        </button>
        {expanded && <div id={`finding-${item.inconsistency_id}`} className="px-4 pb-4 space-y-3 text-xs text-gray-700 border-t border-gray-100">
          <div className="pt-3"><p className="font-bold uppercase tracking-wider text-gray-500 mb-1">Why it matters</p><p>{item.explanation_why}</p></div>
          {item.evidence_verified && item.evidence_quotes.length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2"><p className="font-bold text-rose-800">Verified evidence</p>
            {item.evidence_quotes.map((quote, quoteIndex) => <p key={quoteIndex}><strong>{quote.section}:</strong> “{quote.text}”</p>)}
          </div>}
          <div className="rounded-xl bg-indigo-50 p-3"><p className="font-bold text-indigo-800 mb-1">Suggested fix</p><p>{item.suggested_fix}</p></div>
          {renderFeedback(item)}
        </div>}
      </article>;
    })}
  </div>;
}
