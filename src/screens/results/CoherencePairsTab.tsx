import type React from 'react';
import type { DisplayScan } from '../../lib/appTypes';
import { formatRoleLabel, PAR_SCORE } from '../../utils.js';
import { pairHasMissingSection, type EnrichedPair, type MobileResultsPane } from './helpers';

export function CoherencePairsTab({ visiblePairs, pairsCount, activePairKey, setActivePairKey, setActiveSectionRole, setMobilePane, setShowPairingModal, isDesktop, isSample, scan }: {
  visiblePairs: EnrichedPair[]; pairsCount: number; activePairKey: string | null;
  setActivePairKey: React.Dispatch<React.SetStateAction<string | null>>; setActiveSectionRole: (value: string | null) => void;
  setMobilePane: (value: MobileResultsPane) => void; setShowPairingModal: (value: boolean) => void;
  isDesktop: () => boolean; isSample?: boolean; scan?: DisplayScan | null;
}) {
  return (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                  <p className="text-xs mono font-bold uppercase tracking-wider text-gray-500">
                    Coherence pairs ({visiblePairs.length}) · target = {PAR_SCORE}
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setShowPairingModal(true)} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">How pairing works</button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 px-1">How well each section matches the one it should.</p>

                {visiblePairs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                    <p className="text-sm font-bold text-gray-800 mb-1">No role pairs to show</p>
                    <p className="text-xs text-gray-500">
                      {pairsCount === 0
                        ? 'No coherence pairs were evaluated for this scan. Required sections may be missing.'
                        : `No pairs meet the target score of ${PAR_SCORE}.`}
                    </p>
                  </div>
                ) : (
                  visiblePairs.map((p, idx) => {
                    const key = `${p.role_a}__${p.role_b}`;
                    const isSelected = activePairKey === key;
                    const score = p.score ?? 0;
                    const strong = score >= PAR_SCORE;
                    const sectionMissing = !isSample && pairHasMissingSection(p, scan?.sections_analyzed || []);
                    const hasScore = !sectionMissing && p.included !== false && p.score != null;
                    return (
                      <div
                        key={`${p.role_a}|${p.role_b}|${idx}`}
                        onClick={() => {
                          setActivePairKey(prev => prev === key ? null : key);
                          setActiveSectionRole(null);
                          if (!isDesktop()) setMobilePane("xai");
                        }}
                        className={`bg-white rounded-2xl border p-5 space-y-3 cursor-pointer transition-all hover:border-indigo-300 ${
                          isSelected ? 'border-indigo-400 ring-2 ring-indigo-300 shadow-sm' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-gray-900">{formatRoleLabel(p.role_a)} ↔ {formatRoleLabel(p.role_b)}</p>
                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${strong ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            {sectionMissing ? "Can't compare — section missing" : hasScore ? `${strong ? 'Strong' : 'Needs work'} · ${Math.round(score)}` : 'Not checked yet'}
                          </span>
                        </div>
                        {hasScore && <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${strong ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                        </div>}
                        <p className="text-[11px] text-gray-500">Counts for {Math.round(p.weight * 100)}% of the overall score</p>
                        {p.verification && (
                          <p className={`text-xs leading-relaxed rounded-xl border px-3 py-2 ${
                            p.verification.alignment === 'superficial' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}>
                            <span className="font-bold capitalize">{p.verification.alignment} alignment.</span> {p.verification.note}
                          </p>
                        )}
                        {p.included && !sectionMissing && p.dismissalReason && (
                          <p className="text-xs leading-relaxed rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                            <span className="font-bold">No material inconsistency found.</span> {p.dismissalReason.replaceAll('embedding-similarity score', 'text-similarity score')}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
  );
}
