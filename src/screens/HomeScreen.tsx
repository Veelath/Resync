import { Logo, BackToTop } from '../components/AppPrimitives';
import { ScoreRing } from '../components/AppScoreRing';
import type { Screen } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';
import spacyLogo from "@/assets/technology/spacy.png";
import geminiLogo from "@/assets/technology/gemini.svg";

function PreviewCard() {
  return (
    <div className="w-full max-w-md mx-auto" style={{ filter: "drop-shadow(0 24px 48px rgba(26,31,204,0.13))" }}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5" aria-hidden="true">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
          </div>
          <div className="text-xs text-gray-400 font-medium mono">resync_report.pdf</div>
          <div style={{ width: 48 }} />
        </div>
        {/* score row */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
          <ScoreRing score={74} size={72} />
          <div className="flex-1 space-y-1.5">
            {[
              { label: "Logic Gaps", n: 2, c: "text-violet-600 bg-violet-50 border-violet-200" },
              { label: "Contradictions", n: 2, c: "text-red-700 bg-red-50 border-red-200" },
              { label: "Redundancies", n: 1, c: "text-amber-800 bg-amber-50 border-amber-200" },
            ].map(({ label, n, c }) => (
              <div key={label} className={`flex justify-between items-center text-xs px-2.5 py-1 rounded-lg border ${c}`}>
                <span className="font-medium">{label}</span>
                <span className="font-bold mono tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </div>
        {/* highlighted passage */}
        <div className="px-5 py-4 space-y-2">
          <div className="text-[10px] mono font-bold text-blue-700 uppercase tracking-widest">Chapter 1 — Statement of the Problem</div>
          <p className="text-xs text-gray-600 leading-relaxed">
            The study aims to{" "}
            <mark className="bg-violet-100 border border-violet-300 text-violet-800 rounded px-0.5 not-italic" style={{ background: undefined, textDecoration: "none" }}>
              measure student engagement using biometric data
            </mark>
            {" "}collected over one semester.
          </p>
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
            <div className="w-1 h-full min-h-[32px] rounded-full bg-violet-400 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-[10px] font-bold text-violet-700 mb-0.5">Logic Gap — Objectives → Methodology</div>
              <p className="text-[10px] text-violet-600 leading-relaxed">Biometric collection is promised in Objectives but absent from Methodology.</p>
            </div>
          </div>
        </div>
        {/* citation row */}
        <div className="px-5 pb-4 flex gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[10px] font-semibold text-green-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
            <span className="tabular-nums">4</span> live
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[10px] font-semibold text-red-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            <span className="tabular-nums">2</span> dead
          </div>
          <div className="ml-auto text-[10px] text-gray-400 mono self-center tabular-nums">~2 min scan</div>
        </div>
      </div>
    </div>
  );
}

export function HomeScreen({ onNavigate }: { onNavigate: (s: Screen, asSample?: boolean) => void }) {
  return (
    <div className="min-h-full bg-white">
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 h-16 flex items-center justify-between">
          <Logo header className="h-8 sm:h-10" />
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Overview", id: "section-overview" },
              { label: "Capabilities", id: "section-capabilities" },
              { label: "About", id: "section-about" },
            ].map(l => (
              <button key={l.id} onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })} className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 active:scale-[0.98]">{l.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate("login")} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 active:scale-[0.98]">Log in</button>
            <button onClick={() => onNavigate("signup")} className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-[0.98] shadow-sm" style={{ background: B }}>Sign up free</button>
          </div>
        </div>
      </nav>

      <main>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* background grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "56px 56px" }} />
        {/* top glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-96 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${BL} 0%, transparent 70%)` }} />

        <div className="relative w-full px-6 md:px-10 lg:px-16 xl:px-20 pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-7" style={{ borderColor: `${B}30`, background: `${B}08`, color: B }}>
                Manuscript coherence checker
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-[1.08] mb-6">
                Check your manuscript<br />
                <span style={{ color: B }}>for coherence.</span>
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                Resync reviews research papers for logic gaps, contradictions, repeated content, and inaccessible citations. Receive a clear report that helps you focus your revisions.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={() => onNavigate("signup")}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${B}, ${BH})`, boxShadow: `0 8px 24px ${B}30` }}>
                  Get started free
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => onNavigate("results", true)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors duration-150">
                  View sample report
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-gray-400 font-medium">
                {["Free to start", "Results in ~2 min", "No credit card needed"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {/* right — product preview */}
            <div className="hidden lg:block" style={{ animation: "float 5s ease-in-out infinite" }}>
              <PreviewCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-gray-100 bg-gray-50/60">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-5 flex flex-wrap justify-center md:justify-between gap-6">
          {[
            ["6", "Coherence dimensions"],
            ["~2 min", "Per full thesis"],
            [".docx + GDocs", "Accepted formats"],
            ["3 models", "Support the analysis"],
          ].map(([val, label]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xl font-bold mono" style={{ color: B }}>{val}</span>
              <span className="text-sm text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── System overview ── */}
      <section id="section-overview" className="bg-white border-t border-gray-100">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-24">

          {/* Section header */}
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-5 mono uppercase tracking-widest" style={{ background: `${B}08`, color: B }}>
              System overview
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">From manuscript<br />to focused revisions</h2>
          </div>

          {/* Overview */}
          <div className="space-y-28">

            {/* ── Upload: text left, visual right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background: `${B}08`, color: B }}>Upload</div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Upload your manuscript</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  Add a <span className="font-semibold text-gray-700">.docx file</span> or paste a <span className="font-semibold text-gray-700">Google Docs link</span>. Resync identifies the document's chapters and can compare them with an uploaded school template.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {["Chapter mapping", "Template support", "Chapter-aware matching"].map(t => (
                    <span key={t} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500 shrink-0"><path d="M5 12l5 5L20 7" /></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual: drag-drop card */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
                <div className="relative p-8">
                  {/* Drop zone card */}
                  <div className="bg-white rounded-2xl border-2 border-dashed p-8 text-center shadow-sm" style={{ borderColor: `${B}30` }}>
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: BL }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7" style={{ color: B }} aria-hidden="true"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-1">Drop your thesis here</p>
                    <p className="text-xs text-gray-400">.docx or Google Docs link · max 25&nbsp;MB</p>
                    <div className="mt-5 flex items-center justify-center gap-2">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-600 font-medium">or</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <button className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all duration-150 hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2" style={{ background: `linear-gradient(135deg,${B},${BH})` }}>Browse file</button>
                  </div>
                  {/* Detected sections chip */}
                  <div className="absolute -bottom-4 -right-2 bg-white rounded-2xl border border-gray-100 p-3.5 shadow-lg flex items-start gap-3" style={{ minWidth: 220 }}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f0fdf4" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-green-600" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-2">Detected Sections</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["Introduction", "RRL", "Methodology", "Results", "Conclusion"].map(s => (
                          <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: BL, color: B }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Analysis: visual left, text right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              {/* Visual: paragraph scan with glowing connector */}
              <div className="relative order-2 lg:order-1">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
                <div className="relative p-8 space-y-3">
                  {/* Para A */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest mb-2" style={{ color: B }}>Chapter 1 — Objectives</p>
                    <p className="text-xs text-gray-600 leading-relaxed">The study will <mark className="bg-violet-100 border border-violet-200 text-violet-800 rounded px-0.5 not-italic" style={{ textDecoration: "none" }}>measure engagement using biometric data</mark> collected over one semester.</p>
                  </div>
                  {/* SVG connector */}
                  <div className="flex justify-center py-1">
                    <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
                      <path d="M24 2 C 8 2, 8 34, 24 34" stroke={B} strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.5" />
                      <circle cx="24" cy="2" r="3" fill={B} opacity="0.6" />
                      <circle cx="24" cy="34" r="3" fill={B} opacity="0.6" />
                      <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                    </svg>
                  </div>
                  {/* Para B */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest mb-2" style={{ color: B }}>Chapter 3 — Methodology</p>
                    <p className="text-xs text-gray-600 leading-relaxed">Data were collected using the <span className="font-semibold text-gray-800">Maslach Burnout Inventory</span> and the AWS survey instrument only.</p>
                  </div>
                  {/* Warning badge */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white rounded-2xl border border-red-200 shadow-lg px-3.5 py-2.5 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-red-500"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-red-700">Contradiction Detected</p>
                      <p className="text-[9px] text-gray-400">Objectives ↔ Methodology</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background: `${B}08`, color: B }}>Analysis</div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Review connections across chapters</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  Resync compares claims, objectives, methods, findings, and conclusions to identify gaps or conflicting information across the manuscript.
                </p>
                <div className="mt-7 space-y-3">
                  {[
                    "Maps document structure and chapter boundaries",
                    "Compares related passages across the manuscript",
                    "Flags findings that need the author's review",
                  ].map(item => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: B }} />
                      <p className="text-sm text-gray-500">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Results: text left, visual right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background: `${B}08`, color: B }}>Results</div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Review the report</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  See highlighted passages, explanations, and suggested revisions in one report. Use the findings as guidance while you review and update your paper.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {["Inline highlights", "Fix suggestions", "Coherence score", "Citation check"].map(t => (
                    <span key={t} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500 shrink-0"><path d="M5 12l5 5L20 7" /></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual: score ring + checklist card */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
                <div className="relative p-8">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-5 pb-5 mb-5 border-b border-gray-50">
                      <ScoreRing score={84} size={88} />
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Manuscript</p>
                        <p className="text-sm font-bold text-gray-800 leading-snug">Predictors of Academic Burnout Among STEM Undergraduates</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Score improved</span>
                          <span className="text-[10px] text-gray-400">↑ from 74</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-3">Revision Plan</p>
                    <div className="space-y-2">
                      {[
                        { done: true, text: "Align biometric data collection with Methodology chapter" },
                        { done: true, text: "Reconcile sample size n=120 vs n=108 in Chapter 4" },
                        { done: false, text: "Remove duplicate 'technology acceptance' definition" },
                        { done: false, text: "Revise Conclusions to reflect null tutoring result" },
                      ].map(({ done, text }, i) => (
                        <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${done ? "bg-green-50" : "bg-gray-50"}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${done ? "bg-green-500" : "border-2 border-gray-300"}`}>
                            {done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5"><path d="M5 12l5 5L20 7" /></svg>}
                          </div>
                          <p className={`text-xs leading-relaxed ${done ? "text-green-800 line-through decoration-green-400" : "text-gray-600"}`}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── AI technologies ── */}
      <section className="border-t border-gray-100 bg-gray-50/40">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-xs mono font-bold uppercase tracking-widest mb-3" style={{ color: B }}>AI technologies used</p>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Models that support the review</h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                Resync uses AI models to analyze manuscript structure and meaning, then generate findings and revision recommendations. The output is AI-generated and is not fully human-verified. Review each suggestion with your adviser before making changes.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="min-h-28 rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-center shadow-sm">
                <img src={spacyLogo} alt="spaCy" className="h-14 w-14 object-contain" />
              </div>
              <div className="min-h-28 rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-center shadow-sm">
                <span className="text-lg font-semibold tracking-tight text-gray-800 whitespace-nowrap">MiniLM-L6-V2</span>
              </div>
              <div className="min-h-28 rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-center shadow-sm">
                <img src={geminiLogo} alt="Gemini" className="h-10 w-auto max-w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 checks ── */}
      <section id="section-capabilities" className="border-t border-gray-100 bg-gray-50/40">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs mono font-bold uppercase tracking-widest text-gray-400 mb-3">Key capabilities</p>
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight">What Resync checks</h2>
            </div>
            <button onClick={() => onNavigate("results", true)} className="text-sm font-semibold hover:underline self-start md:self-auto rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors" style={{ color: B }}>
              View sample report →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {[
              ["01", "Title ↔ Objectives", "Does the title accurately represent what the objectives promise?"],
              ["02", "Objectives ↔ Methodology", "Every objective must map to a concrete data collection method."],
              ["03", "Framework ↔ Findings", "Findings must be grounded in the RRL's theoretical framework."],
              ["04", "Findings ↔ Conclusions", "Conclusions must logically follow from the data shown."],
              ["05", "Terminology Consistency", "Key terms must be defined once and used uniformly across chapters."],
              ["06", "Citation Accessibility", "Every cited URL and DOI is pinged to confirm public reachability."],
            ].map(([num, label, desc]) => (
              <div key={num} className="group flex items-start gap-4 p-5 rounded-2xl border border-transparent hover:border-gray-200 hover:bg-white transition-colors duration-200 cursor-default">
                <span className="text-2xl font-black mono text-gray-100 group-hover:text-blue-100 transition-colors select-none shrink-0 w-9 leading-none mt-0.5">{num}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800 mono mb-1">{label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="section-about" className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-16">
        <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center" style={{ background: `linear-gradient(160deg, #0d1147, ${B} 55%, ${BH})` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,.1) 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(129,140,248,.3) 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <Logo className="h-10 w-auto mx-auto mb-7 brightness-0 invert" />
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Review your manuscript with Resync</h2>
            <p className="text-blue-200 mb-8 text-sm leading-relaxed max-w-sm mx-auto">Create an account to upload your paper and receive a coherence report.</p>
            <button onClick={() => onNavigate("signup")} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white font-bold text-sm hover:bg-blue-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 transition-all duration-150 shadow-xl" style={{ color: B }}>
              Get started
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8 max-w-md mx-auto leading-relaxed">
          Resync is a decision-support tool. Final judgment on your manuscript always rests with your adviser and panel.
        </p>
      </section>
      </main>
      <BackToTop />
    </div>
  );
}
