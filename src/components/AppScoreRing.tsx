import { useId } from 'react';

export function scoreBandTone(score: number, band = '') {
  return /strong|high/i.test(band) ? 'strong' : /solid|moderate|medium/i.test(band) ? 'moderate' : /weak|low|needs/i.test(band) ? 'weak' : score >= 80 ? 'strong' : score >= 60 ? 'moderate' : 'weak';
}

export function ScoreRing({ score, size = 112, band, showLabel = true, solidArc = false }: { score: number; size?: number; band?: string; showLabel?: boolean; solidArc?: boolean }) {
  const gradientId = useId();
  const r = 38; const circ = 2 * Math.PI * r;
  const tone = scoreBandTone(score, band);
  const label = band || (score >= 80 ? "Strong Coherence" : score >= 60 ? "Moderate Coherence" : "Needs Work");
  return (
    <div className="score-band flex flex-col items-center gap-1.5" data-band={tone} role="img" aria-label={`Coherence score: ${Math.round(score)} out of 100, ${label}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
          {!solidArc && <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="15%" stopColor="var(--band)" />
              <stop offset="100%" stopColor="var(--brand)" />
            </linearGradient>
          </defs>}
          <circle cx="50" cy="50" r={r} fill="var(--band-surface)" stroke="var(--band-surface)" strokeWidth="9" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={solidArc ? 'var(--brand)' : `url(#${gradientId})`} strokeWidth="9" strokeLinecap="round" className="score-ring-arc"
            strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * circ} ${circ}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${size >= 150 ? 'text-[44px]' : 'text-2xl'} font-bold mono leading-none tabular-nums`} style={{ color: 'var(--band)' }}>{Math.round(score)}</span>
          <span className="text-[10px] text-gray-400 mono tabular-nums">/100</span>
        </div>
      </div>
      {showLabel && <span className="text-xs font-semibold text-gray-600">{label}</span>}
    </div>
  );
}
