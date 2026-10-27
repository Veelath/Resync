import { B, BL } from '../../lib/brand';
import guidanceArtwork from "@/assets/guidance-reference.webp";
import { Info } from "lucide-react";
import type { Session } from '@supabase/supabase-js';
import type { Screen } from '../../lib/appTypes';

const WHAT_GET = [
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>,
    label: "Coherence Score",
    desc: "A 0–100 integrity score with three sub-scores: logic, consistency, and citations.",
    color: B,
    bg: BL,
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 12h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>,
    label: "Annotated Manuscript",
    desc: "Full text with every flagged passage highlighted inline by issue type.",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    label: "Fix Recommendations",
    desc: "Concrete, actionable rewrites for each flagged issue, ready to apply.",
    color: "#059669",
    bg: "#f0fdf4",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
    label: "Verified Reference List",
    desc: "Public or private access status for every cited URL and DOI in your bibliography.",
    color: "#d97706",
    bg: "#fffbeb",
  },
];

const STEPS = [
  {
    num: 1,
    label: "Upload Manuscript",
    desc: "Upload your Word file or paste a Google Docs share link.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  },
  {
    num: 2,
    label: "Set Type & Template",
    desc: "Upload a manuscript and optionally attach a chapter template.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" /></svg>,
  },
  {
    num: 3,
    label: "Coherence Scan",
    desc: "AI cross-checks logic gaps, contradictions, redundancies, and inaccessible citations.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
  },
  {
    num: 4,
    label: "Export Report",
    desc: "Download your annotated report and fix recommendations as a PDF.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
  },
];

const BEST_PRACTICES = [
  { title: "Digital Manuscripts", desc: "DOCX, PDF, Google Docs", x: 200, y: 228 },
  { title: "Standard Structure", desc: "Chapter 1–5 & IMRaD", x: 690, y: 228 },
  { title: "Single-Column Flow", desc: "Sequential reading order", x: 1190, y: 228 },
  { title: "Direct Prose", desc: "Claims and conclusions", x: 220, y: 520 },
  { title: "Open References", desc: "Citations and DOI checks", x: 700, y: 520 },
  { title: "Method Focus", desc: "Qualitative or quantitative fit", x: 1190, y: 520 },
];

export function DashboardHome({ onNavigate, session, greeting }: { onNavigate: (s: Screen, asSample?: boolean) => void; session?: Session | null; greeting: "Good morning" | "Good afternoon" | "Good evening" }) {
  return (
    <>

        {/* ══ HERO BANNER ══ */}
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, #080c33 0%, ${B} 60%, #3b40e8 100%)` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,.09) 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
          <div className="absolute -top-24 right-40 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(165,180,252,.22) 0%, transparent 65%)" }} />

          <div className="relative z-10 w-full px-6 md:px-10 lg:px-16 xl:px-20 py-10 lg:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

              {/* Left: greeting + headline */}
              <div className="flex-1 min-w-0 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-3">
                  <span className="text-xs sm:text-sm font-semibold text-blue-100">
                    {greeting},{' '}
                    {session?.user?.user_metadata?.full_name?.split(' ')[0]
                      || session?.user?.email?.split('@')[0]
                      || 'there'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2.5">
                  Your manuscript, <span className="text-indigo-200">checked end-to-end.</span>
                </h1>
                <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
                  Detect logic gaps, cross-chapter contradictions, terminology drift, and inaccessible citations — all in under 2 minutes.
                </p>
              </div>

              {/* Right: CTA + secondary link */}
              <div className="flex flex-wrap items-center gap-3.5 shrink-0 pt-2 lg:pt-0">
                <button onClick={() => onNavigate("upload")}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-gray-950 bg-white hover:bg-blue-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-indigo-700" aria-hidden="true">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Start a Scan</span>
                </button>
                <button onClick={() => onNavigate("results", true)}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-white hover:bg-white/15 border-1.5 border-white/30 backdrop-blur-sm active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 cursor-pointer">
                  <span>Preview sample</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-white/15">
              <div className="flex items-center gap-4 text-xs sm:text-sm text-blue-100/80 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  AI-Powered Multi-Model Pipeline
                </span>
                <span className="hidden sm:inline text-white/30">•</span>
                <span className="hidden sm:inline">Quantitative & Qualitative Support</span>
                <span className="hidden sm:inline text-white/30">•</span>
                <span className="hidden sm:inline">Automatic Citation Verifier</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-blue-200 inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                <span>~2 min average scan</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Main body ── */}
        <main className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-8 space-y-6">

          {/* Process */}
          <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white px-6 py-10 sm:px-8 lg:px-10 lg:py-12" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div aria-hidden="true" className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-indigo-50/80" />
            <div aria-hidden="true" className="absolute right-12 top-10 hidden grid-cols-5 gap-3 opacity-60 lg:grid">
              {Array.from({ length: 20 }, (_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-indigo-100" />)}
            </div>

            <div className="relative z-10 mb-10 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em]" style={{ color: B }}>Process</p>
              <h2 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">How It Works</h2>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">Four simple steps from manuscript to coherence report.</p>
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:min-h-[310px] lg:grid-cols-4 lg:gap-14">
              <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 1200 310" preserveAspectRatio="none">
                <path d="M258 126 C278 126 292 174 314 174" stroke="#818cf8" strokeWidth="3" strokeDasharray="8 8" fill="none" strokeLinecap="round" />
                <path d="M572 174 C592 174 606 126 628 126" stroke="#818cf8" strokeWidth="3" strokeDasharray="8 8" fill="none" strokeLinecap="round" />
                <path d="M886 126 C906 126 920 174 942 174" stroke="#818cf8" strokeWidth="3" strokeDasharray="8 8" fill="none" strokeLinecap="round" />
                {[258, 314, 572, 628, 886, 942].map((x, index) => (
                  <g key={x}>
                    <circle cx={x} cy={index % 2 === 0 ? 126 : 174} r="10" fill="white" stroke="#e0e7ff" strokeWidth="4" />
                    <circle cx={x} cy={index % 2 === 0 ? 126 : 174} r="4" fill={B} />
                  </g>
                ))}
              </svg>

              {STEPS.map((step, index) => (
                <article key={step.num} className={`relative ${index % 2 === 1 ? "lg:mt-12" : ""}`}>
                  <span aria-hidden="true" className="absolute -top-10 left-4 text-7xl font-bold leading-none text-gray-500 sm:text-8xl">
                    {String(step.num).padStart(2, "0")}
                  </span>
                  <div className="relative flex min-h-[220px] h-full flex-col items-center rounded-3xl border border-indigo-100 bg-white/95 p-6 text-center shadow-[0_14px_36px_rgba(26,31,204,0.08)]">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg shadow-indigo-200" style={{ background: `linear-gradient(145deg, ${B}, #3b40e8)` }}>
                      {step.icon}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: B }}>Step {step.num}</p>
                    <h3 className="mt-2 text-lg font-bold leading-tight text-gray-950">{step.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Outputs */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="mb-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">Outputs</p>
              <h2 className="text-xl font-bold tracking-tight text-foreground">What You Get</h2>
              <p className="mt-1 text-sm text-muted-foreground">Four deliverables, every scan, automatically.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {WHAT_GET.map(({ icon, label, desc, color, bg }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: bg, color }}>
                    {icon}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-sm font-bold leading-tight text-foreground">{label}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══════════════════════════════════════════
            ROW 2: Recommended Scope / Best Results With
        ═══════════════════════════════════════════ */}
          <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8" style={{ boxShadow: "0 4px 24px rgba(26,31,204,.05)" }}>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1 text-primary">Guidance</p>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Best Results With</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">ReSync delivers the most accurate cross-chapter analysis when manuscripts align with these recommended standards.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
              {BEST_PRACTICES.map(({ title, desc, x, y }) => (
                <div key={title} className="flex flex-col items-center text-center">
                  <div className="relative w-56 h-[132px] overflow-hidden mb-3" aria-hidden="true" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)", maskComposite: "intersect" }}>
                    <img src={guidanceArtwork} alt="" loading="lazy" className="absolute max-w-none mix-blend-multiply" style={{ width: 1170.4, height: 658.7, left: -x * 0.7, top: -y * 0.7 }} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground leading-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{desc}</p>
                </div>
              ))}
            </div>

            {/* Advisory card */}
            <div className="mt-8 p-4 rounded-2xl bg-muted border border-border flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 text-primary">
                <Info className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">When inconsistencies may appear.</strong> Review flagged findings in the Findings tab.</p>
              </div>
            </div>
          </section>

          <div className="h-4" />
        </main>
    </>
  );
}
