export function scoreBandTone(score: number, band = '') {
  return /strong|high/i.test(band) ? 'strong' : /solid|moderate|medium/i.test(band) ? 'moderate' : /weak|low|needs/i.test(band) ? 'weak' : score >= 80 ? 'strong' : score >= 60 ? 'moderate' : 'weak';
}

export function ScoreRing({ score, size = 112, band, showLabel = true }: { score: number; size?: number; band?: string; showLabel?: boolean; solidArc?: boolean }) {
  const r = 38; const circ = 2 * Math.PI * r;
  const tone = scoreBandTone(score, band);
  const label = band || (score >= 80 ? "Strong Coherence" : score >= 60 ? "Moderate Coherence" : "Needs Work");
  const displayedScore = Math.round(score);
  return (
    <div className="score-band flex flex-col items-center gap-1.5" data-band={tone} role="img" aria-label={`Coherence score: ${displayedScore} out of 100, ${label}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="white" stroke="#e5e7eb" strokeWidth="11" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1a1fcc" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * circ} ${circ}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${size >= 150 ? 'text-[44px]' : 'text-2xl'} font-bold leading-none tabular-nums text-[#0b0f3d]`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{displayedScore}</span>
          <span className="text-[10px] text-gray-500 tabular-nums">/100</span>
        </div>
      </div>
      {showLabel && <span className="text-xs font-semibold text-gray-600">{label}</span>}
    </div>
  );
}
