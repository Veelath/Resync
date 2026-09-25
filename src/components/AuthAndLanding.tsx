import React from 'react';
import logoPng from '../assets/logo.png';
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, Layers, AlertTriangle, Check, Sparkles, ShieldCheck } from 'lucide-react';
import ScoreRing from './ScoreRing';
import { useState, useEffect } from 'react';

function Eye({ open }: { open: boolean }) {
  return open
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function Spinner({ cls = "w-4 h-4" }: { cls?: string }) {
  return <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/></svg>;
}
function Keyword() {
  const words = ["coherent.", "airtight.", "aligned.", "submission‑ready."];
  const [i, setI] = useState(0);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVis(false);
      setTimeout(() => { setI(x => (x+1)%words.length); setVis(true); }, 280);
    }, 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block" style={{ transition:"opacity .28s", opacity: vis ? 1 : 0 }}>
      <span className="relative z-10 px-2" style={{ color: B }}>{words[i]}</span>
      <span className="absolute inset-0 rounded-md border-2" style={{ borderColor: B, borderRadius: 7 }}/>
      <span className="ml-0.5 inline-block w-0.5 h-[0.85em] align-middle" style={{ background: B, animation:"blink 1s step-end infinite" }}/>
    </span>
  );
}
function PreviewCard({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`w-full max-w-sm mx-auto ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform duration-200 group' : ''}`}
      style={{ filter:"drop-shadow(0 24px 48px rgba(26,31,204,0.13))" }}
      title={onClick ? "Click to view full mock scan report" : undefined}
    >
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"/>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"/>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400"/>
          </div>
          <div className="text-xs text-gray-400 font-medium mono group-hover:text-[#1a1fcc] transition-colors flex items-center gap-1.5">
            <span>sample_manuscript.docx</span>
            <span className="text-[10px] bg-indigo-50 text-[#1a1fcc] px-1.5 py-0.5 rounded font-bold font-sans">Click to open</span>
          </div>
          <div style={{ width:48 }}/>
        </div>
        {/* score row */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
          <div className="flex flex-col items-center">
            <ScoreRing score={74} size={72}/>
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1.5 border border-amber-200">
              Moderate Coherence
            </span>
          </div>
          <div className="flex-1 space-y-1.5">
            {[
              { label:"Logic Gaps", n:2, c:"text-violet-600 bg-violet-50 border-violet-200" },
              { label:"Contradictions", n:2, c:"text-red-600 bg-red-50 border-red-200" },
              { label:"Redundancies", n:1, c:"text-amber-600 bg-amber-50 border-amber-200" },
            ].map(({ label, n, c }) => (
              <div key={label} className={`flex justify-between items-center text-xs px-2.5 py-1 rounded-lg border ${c}`}>
                <span className="font-medium">{label}</span>
                <span className="font-bold mono">{n}</span>
              </div>
            ))}
          </div>
        </div>
        {/* highlighted passage */}
        <div className="px-5 py-4 space-y-2">
          <div className="text-[10px] mono font-bold text-blue-500 uppercase tracking-widest">Chapter 1 — Statement of the Problem</div>
          <p className="text-xs text-gray-600 leading-relaxed">
            The study aims to{" "}
            <mark className="bg-violet-100 border border-violet-300 text-violet-800 rounded px-0.5 not-italic" style={{ background:undefined, textDecoration:"none" }}>
              measure student engagement using biometric data
            </mark>
            {" "}collected over one semester.
          </p>
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
            <div className="w-1 h-full min-h-[32px] rounded-full bg-violet-400 shrink-0"/>
            <div>
              <div className="text-[10px] font-bold text-violet-700 mb-0.5">Logic Gap — Objectives → Methodology</div>
              <p className="text-[10px] text-violet-600 leading-relaxed">Biometric collection is promised in Objectives but absent from Methodology.</p>
            </div>
          </div>
        </div>
        {/* citation row */}
        <div className="px-5 pb-4 flex gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[10px] font-semibold text-green-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M5 12l5 5L20 7"/></svg>
            4 live
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[10px] font-semibold text-red-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            2 dead
          </div>
          <div className="ml-auto text-[10px] text-gray-400 mono self-center">~2 min scan</div>
        </div>
      </div>
    </div>
  );
}
export function Logo({ className = "" }: { className?: string }) {
  return <img src={logoPng} alt="ReSync" className={`object-contain ${className}`} />;
}


const B = "#1a1fcc";
const BH = "#2d35e8";
const BL = "#eef0ff";

function GIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
}


export function AuthLayout({ children, onNavigate, quote }: { children: React.ReactNode; onNavigate: (s: string) => void; quote?: string }) {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white">
      {/* left */}
      <div className="flex flex-col w-full lg:w-[52%] h-full">
        <div className="shrink-0 px-10 py-8 flex items-center justify-between">
          <button onClick={() => onNavigate("home")} className="cursor-pointer" title="Go to Home">
            <Logo className="h-9 w-auto"/>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to landing page</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-8 overflow-y-auto py-6">{children}</div>
        <div className="shrink-0 px-10 py-6 text-xs text-gray-300 text-center">© {new Date().getFullYear()} ReSync · All rights reserved</div>
      </div>

      {/* right */}
      <div className="hidden lg:flex flex-col w-[48%] h-full relative overflow-hidden"
        style={{ background:"linear-gradient(160deg, #0b0f3d 0%, #151ac4 50%, #2a31f0 100%)" }}>
        {/* glows */}
        <div className="absolute -top-40 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background:"radial-gradient(circle, rgba(129,140,248,.4) 0%, transparent 65%)" }}/>
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full pointer-events-none" style={{ background:"radial-gradient(circle, rgba(79,70,229,.35) 0%, transparent 70%)" }}/>
        {/* dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:`radial-gradient(circle, rgba(255,255,255,.13) 1px, transparent 1px)`, backgroundSize:"30px 30px" }}/>

        <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-14 text-center">
          <div className="mb-10 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)" }}>
            <Logo className="w-10 h-10 brightness-0 invert"/>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight mb-5">
            Your thesis,<br/>
            <span style={{ color:"#a5b4fc" }}>coherent</span> from<br/>
            start to finish.
          </h2>
          <p className="text-sm leading-relaxed max-w-xs mb-10" style={{ color:"rgba(199,210,254,.75)" }}>
            Upload your manuscript and get a full coherence report — logic gaps, contradictions, redundancies, and dead citations — in minutes.
          </p>
          {/* features */}
          <div className="w-full max-w-xs space-y-2.5">
            {["6 coherence dimensions checked","Inline highlights on every issue","Specific fix recommendations","Citation accessibility scan"].map(f => (
              <div key={f} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-left"
                style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)" }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background:"rgba(74,222,128,.2)", border:"1px solid rgba(74,222,128,.4)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-2.5 h-2.5 text-green-400"><path d="M5 12l5 5L20 7"/></svg>
                </div>
                <span className="text-xs font-medium" style={{ color:"rgba(255,255,255,.85)" }}>{f}</span>
              </div>
            ))}
          </div>

          {/* quote */}
          {quote && (
            <div className="mt-10 p-4 rounded-xl text-left max-w-xs" style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)" }}>
              <p className="text-xs italic leading-relaxed" style={{ color:"rgba(199,210,254,.7)" }}>"{quote}"</p>
              <p className="text-xs font-semibold mt-2" style={{ color:"rgba(165,180,252,.9)" }}>— BSCS student, DLSU Manila</p>
            </div>
          )}
        </div>

        <div className="relative z-10 shrink-0 px-14 pb-8 text-center">
          <p className="text-xs" style={{ color:"rgba(129,140,248,.5)" }}>Used by students across Philippine universities</p>
        </div>
      </div>
    </div>
  );
}


function FieldInput({ label, type="text", value, onChange, placeholder, right }: {
  label: string; type?: string; value: string; onChange: (v:string)=>void; placeholder: string; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        {right}
      </div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        className="w-full h-11 px-4 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
        style={{ borderColor: focused ? B : "#e5e7eb", boxShadow: focused ? `0 0 0 3px ${B}12` : "none" }}/>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function LoginScreen({ onNavigate, onLogin, error, isLoading }: { onNavigate: (s: string) => void, onLogin?: (e: string, p: string) => void, error?: string, isLoading?: boolean }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const isLoad = isLoading !== undefined ? isLoading : loading;
  const canSubmit = !!email && !!pw && !isLoad;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if(!canSubmit) return;
    if (isLoading === undefined) setLoading(true);
      if(onLogin){ onLogin(email, pw); } else { setTimeout(()=>{ setLoading(false); onNavigate("dashboard"); }, 1200); }
  }

  return (
    <AuthLayout onNavigate={onNavigate} quote="Resync caught a contradiction between my Chapter 1 and Chapter 4 sample sizes. Saved me a major revision.">
      <div className="w-full max-w-[360px]">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1a1fcc] mb-5 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to landing page</span>
        </button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1.5">Welcome back</h1>
          <p className="text-sm text-gray-400">Log in to your Resync account.</p>
        </div>

        {/* Quick Demo Login Helper */}
        <div className="mb-5 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col gap-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#1a1fcc] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Account Credentials</span>
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded font-mono">1-Click</span>
          </div>
          <div className="text-xs text-slate-600 bg-white/80 p-2 rounded-lg border border-indigo-50 space-y-0.5">
            <div>Email: <strong className="font-mono text-slate-800 select-all">demo@resync.ai</strong></div>
            <div>Password: <strong className="font-mono text-slate-800 select-all">password123</strong></div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail("demo@resync.ai");
              setPw("password123");
              if (onLogin) onLogin("demo@resync.ai", "password123");
            }}
            className="w-full py-2 px-3 rounded-lg bg-[#1a1fcc] hover:bg-[#2d35e8] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span>Log in as Dr. Sarah Connor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-5 shadow-sm">
          <GIcon/>Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100"/><span className="text-xs text-gray-300 font-bold tracking-wider">OR</span><div className="flex-1 h-px bg-gray-100"/>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <FieldInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@university.edu"/>

          {/* password with eye + forgot */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
              <button type="button" className="text-xs font-semibold hover:underline" style={{ color:B }}>Forgot password?</button>
            </div>
            <div className="relative">
              <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Enter your password" required
                className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                style={{ borderColor:"#e5e7eb" }}
                onFocus={e=>{e.target.style.borderColor=B;e.target.style.boxShadow=`0 0 0 3px ${B}12`;}}
                onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}/>
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute inset-y-0 right-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors">
                <Eye open={showPw}/>
              </button>
            </div>
          </div>

          <button type="submit" disabled={!canSubmit}
            className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-1"
            style={{ background: canSubmit ? `linear-gradient(135deg, ${B}, ${BH})` : "#f3f4f6", color: canSubmit ? "white" : "#9ca3af", cursor: canSubmit?"pointer":"not-allowed", boxShadow: canSubmit?`0 6px 20px ${B}30`:"none" }}>
            {loading ? <><Spinner/>Logging in…</> : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{" "}
          <button onClick={()=>onNavigate("signup")} className="font-bold hover:underline" style={{ color:B }}>Sign up free</button>
        </p>
      </div>
    </AuthLayout>
  );
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export function SignupScreen({ onNavigate, onSignup, error, isLoading }: { onNavigate: (s: string) => void, onSignup?: (n: string, e: string, p: string, i: string, r: string) => void, error?: string, isLoading?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const str = pw.length===0?0:pw.length<8?1:pw.length<12?2:3;
  const strMeta = [
    { label:"",color:"",bar:"" },
    { label:"Weak",color:"#ef4444",bar:"#f87171" },
    { label:"Good",color:"#d97706",bar:"#fbbf24" },
    { label:"Strong",color:"#16a34a",bar:"#4ade80" },
  ][str];
  const isLoad = isLoading !== undefined ? isLoading : loading;
  const canSubmit = !!name && !!email && pw.length>=8 && agreed && !isLoad;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if(!canSubmit) return;
    if (isLoading === undefined) setLoading(true);
    if (onSignup) {
      onSignup(name, email, pw, "Academic Institution", "Researcher");
    } else {
      setTimeout(()=>{ setLoading(false); onNavigate("dashboard"); }, 1400);
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate}>
      <div className="w-full max-w-[360px]">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1a1fcc] mb-5 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to landing page</span>
        </button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1.5">Create your account</h1>
          <p className="text-sm text-gray-400">Free to use — no credit card required.</p>
        </div>

        <button className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-5 shadow-sm">
          <GIcon/>Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100"/><span className="text-xs text-gray-300 font-bold tracking-wider">OR</span><div className="flex-1 h-px bg-gray-100"/>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <FieldInput label="Full name" value={name} onChange={setName} placeholder="Maria Santos"/>
          <FieldInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@university.edu"/>

          {/* password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters" required
                className="w-full h-11 px-4 pr-11 rounded-xl border text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                style={{ borderColor:"#e5e7eb" }}
                onFocus={e=>{e.target.style.borderColor=B;e.target.style.boxShadow=`0 0 0 3px ${B}12`;}}
                onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}/>
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute inset-y-0 right-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors">
                <Eye open={showPw}/>
              </button>
            </div>
            {pw.length>0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex gap-1 flex-1">
                  {[1,2,3].map(n => <div key={n} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: str>=n ? strMeta.bar : "#e5e7eb" }}/>)}
                </div>
                <span className="text-xs font-bold" style={{ color: strMeta.color }}>{strMeta.label}</span>
              </div>
            )}
          </div>

          {/* terms */}
          <button type="button" onClick={()=>setAgreed(!agreed)} className="flex items-start gap-3 w-full text-left select-none">
            <div className="mt-0.5 w-[18px] h-[18px] min-w-[18px] rounded-md border-2 flex items-center justify-center transition-all shrink-0"
              style={{ background: agreed?B:"white", borderColor: agreed?B:"#d1d5db" }}>
              {agreed && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="w-2.5 h-2.5"><path d="M5 12l5 5L20 7"/></svg>}
            </div>
            <span className="text-xs text-gray-500 leading-relaxed">
              I agree to the <span className="font-bold hover:underline" style={{ color:B }}>Terms of Service</span> and <span className="font-bold hover:underline" style={{ color:B }}>Privacy Policy</span>
            </span>
          </button>

          <button type="submit" disabled={!canSubmit}
            className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: canSubmit?`linear-gradient(135deg, ${B}, ${BH})`:"#f3f4f6", color: canSubmit?"white":"#9ca3af", cursor:canSubmit?"pointer":"not-allowed", boxShadow:canSubmit?`0 6px 20px ${B}30`:"none" }}>
            {loading ? <><Spinner/>Creating account…</> : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <button onClick={()=>onNavigate("login")} className="font-bold hover:underline" style={{ color:B }}>Log in</button>
        </p>
      </div>
    </AuthLayout>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function HomeScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="min-h-full bg-white">
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo className="h-9 w-auto"/>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Features", id: "features" },
              { label: "Audit Pipeline", id: "how-it-works" },
              { label: "About", id: "about" }
            ].map(l => (
              <button
                key={l.id}
                onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("mock-scan")}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold text-[#1a1fcc] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1a1fcc]" />
              <span>Live Mock Report</span>
            </button>
            <button onClick={() => onNavigate("login")} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">Log in</button>
            <button onClick={() => onNavigate("signup")} className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all cursor-pointer" style={{ background:B }}>Sign up free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* background grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:`linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize:"56px 56px" }}/>
        {/* top glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-96 pointer-events-none" style={{ background:`radial-gradient(ellipse at center, ${BL} 0%, transparent 70%)` }}/>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-6" style={{ borderColor:`${B}30`, background:`${B}08`, color:B }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a1fcc] animate-pulse"/>
                Multi-layered manuscript check
              </div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-[1.08] mb-6">
                Check your<br/>
                manuscript<br/>
                <span style={{ color: B }}>for coherence.</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 leading-relaxed mb-8 max-w-lg font-sans">
                Resync scans your manuscript for logic gaps, contradictions, redundancies, and unverified citations. Get an objective report in about 2 minutes.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={() => onNavigate("signup")}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:shadow-xl cursor-pointer"
                  style={{ background:`linear-gradient(135deg, ${B}, ${BH})`, boxShadow:`0 8px 24px ${B}30` }}>
                  <span>Get started free</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button onClick={() => onNavigate("mock-scan")}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold border-2 border-slate-200 hover:border-[#1a1fcc] text-slate-700 hover:text-[#1a1fcc] bg-white transition-all shadow-xs hover:shadow-sm cursor-pointer">
                  <span>View sample report</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-gray-400 font-medium">
                {["Free to start","Results in ~2 min","No credit card needed"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500"><path d="M5 12l5 5L20 7"/></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {/* right — product preview */}
            <div className="hidden lg:block" style={{ animation:"float 5s ease-in-out infinite" }}>
              <PreviewCard onClick={() => onNavigate("mock-scan")}/>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap justify-center md:justify-between gap-6">
          {[
            ["6","Coherence dimensions"],
            ["~2 min","Per full thesis"],
            [".docx + GDocs","Accepted formats"],
            ["3 models","In pipeline"],
          ].map(([val, label]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xl font-bold mono" style={{ color:B }}>{val}</span>
              <span className="text-sm text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-24">

          {/* Section header */}
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-5 mono uppercase tracking-widest" style={{ background:`${B}08`, color:B }}>
              How it works
            </span>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              From manuscript<br/>to focused revisions
            </h2>
            <p className="text-base text-gray-500 mt-4 max-w-xl mx-auto font-sans">
              Three steps to ensure your research paper is logically airtight and defense-ready.
            </p>
          </div>

          {/* Zigzag pipeline phases */}
          <div className="space-y-28">

            {/* ── Step 1: text left, visual right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background:`${B}08`, color:B }}>Step 01</div>
                <h3 className="font-serif text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Upload your manuscript</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  Simply upload your <span className="font-semibold text-gray-700">.docx file</span> or paste a <span className="font-semibold text-gray-700">Google Docs link</span>. Our engine automatically detects your chapters — from the Introduction down to the Conclusion — and maps them to your school's template if you attach one.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {["Chapter mapping","Template support","Auto-detect sections"].map(t => (
                    <span key={t} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500 shrink-0"><path d="M5 12l5 5L20 7"/></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual: drag-drop card */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage:`linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize:"32px 32px" }}/>
                <div className="relative p-8">
                  {/* Drop zone card */}
                  <div className="bg-white rounded-2xl border-2 border-dashed p-8 text-center shadow-sm" style={{ borderColor:`${B}30` }}>
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background:BL }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7" style={{ color:B }}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-1">Drop your thesis here</p>
                    <p className="text-xs text-gray-400">.docx or Google Docs link · max 25 MB</p>
                    <div className="mt-5 flex items-center justify-center gap-2">
                      <div className="flex-1 h-px bg-gray-100"/>
                      <span className="text-xs text-gray-300 font-medium">or</span>
                      <div className="flex-1 h-px bg-gray-100"/>
                    </div>
                    <button className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer" style={{ background:`linear-gradient(135deg,${B},${BH})` }}>Browse file</button>
                  </div>
                  {/* Detected sections chip */}
                  <div className="absolute -bottom-4 -right-2 bg-white rounded-2xl border border-gray-100 p-3.5 shadow-lg flex items-start gap-3" style={{ minWidth:220 }}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background:"#f0fdf4" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-green-600"><path d="M5 12l5 5L20 7"/></svg>
                    </div>
                    <div>
                      <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-2">Detected Sections</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["Introduction","RRL","Methodology","Results","Conclusion"].map(s => (
                          <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:BL, color:B }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Step 2: visual left, text right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              {/* Visual: paragraph scan with glowing connector */}
              <div className="relative order-2 lg:order-1">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage:`linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize:"32px 32px" }}/>
                <div className="relative p-8 space-y-3">
                  {/* Para A */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest mb-2" style={{ color:B }}>Chapter 1 — Objectives</p>
                    <p className="text-xs text-gray-600 leading-relaxed">The study will <mark className="bg-violet-100 border border-violet-200 text-violet-800 rounded px-0.5 not-italic" style={{ textDecoration:"none" }}>measure engagement using biometric data</mark> collected over one semester.</p>
                  </div>
                  {/* SVG connector */}
                  <div className="flex justify-center py-1">
                    <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
                      <path d="M24 2 C 8 2, 8 34, 24 34" stroke={B} strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.5"/>
                      <circle cx="24" cy="2" r="3" fill={B} opacity="0.6"/>
                      <circle cx="24" cy="34" r="3" fill={B} opacity="0.6"/>
                      <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                    </svg>
                  </div>
                  {/* Para B */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-[10px] mono font-bold uppercase tracking-widest mb-2" style={{ color:B }}>Chapter 3 — Methodology</p>
                    <p className="text-xs text-gray-600 leading-relaxed">Data were collected using the <span className="font-semibold text-gray-800">Maslach Burnout Inventory</span> and the AWS survey instrument only.</p>
                  </div>
                  {/* Warning badge */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white rounded-2xl border border-red-200 shadow-lg px-3.5 py-2.5 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-red-500"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-red-700">Contradiction Detected</p>
                      <p className="text-[9px] text-gray-400">Objectives ↔ Methodology</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background:`${B}08`, color:B }}>Step 02</div>
                <h3 className="font-serif text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">AI-Powered Coherence Engine</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm mb-6">
                  We don't just check grammar. Resync reads the <span className="font-semibold text-gray-700">actual context</span> of your paper to find logical gaps, contradictions between chapters, and objectives that were never addressed in your findings.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-600 text-left">
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a1fcc] mt-1.5 shrink-0" />
                    <span><strong className="text-slate-900 font-mono">spaCy</strong> — Parses document structure & chapter boundaries</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a1fcc] mt-1.5 shrink-0" />
                    <span><strong className="text-slate-900 font-mono">all-mpnet-base-v2</strong> — Builds semantic embeddings across every paragraph</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a1fcc] mt-1.5 shrink-0" />
                    <span><strong className="text-slate-900 font-mono">Gemini 2.5 Pro</strong> — Deep reasoning across the full manuscript context</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ── Step 3: text left, visual right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mono mb-6" style={{ background:`${B}08`, color:B }}>Step 03</div>
                <h3 className="font-serif text-3xl font-bold text-gray-900 tracking-tight mb-4 leading-snug">Fix and Defend</h3>
                <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                  Get a detailed breakdown of exactly what went wrong and how to fix it. Review the generated <span className="font-semibold text-gray-700">Revision Plan</span> to boost your cross-chapter coherence score before your defense.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {["Inline highlights","Fix suggestions","Coherence score","Citation check"].map(t => (
                    <span key={t} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-green-500 shrink-0"><path d="M5 12l5 5L20 7"/></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual: score ring + checklist card */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ backgroundImage:`linear-gradient(rgba(26,31,204,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.04) 1px,transparent 1px)`, backgroundSize:"32px 32px" }}/>
                <div className="relative p-8">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-5 pb-5 mb-5 border-b border-gray-50">
                      <ScoreRing score={84} size={88}/>
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
                        { done:true,  text:"Align biometric data collection with Methodology chapter" },
                        { done:true,  text:"Reconcile sample size n=120 vs n=108 in Chapter 4" },
                        { done:false, text:"Remove duplicate 'technology acceptance' definition" },
                        { done:false, text:"Revise Conclusions to reflect null tutoring result" },
                      ].map(({ done, text }, i) => (
                        <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${done ? "bg-green-50" : "bg-gray-50"}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${done ? "bg-green-500" : "border-2 border-gray-300"}`}>
                            {done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5"><path d="M5 12l5 5L20 7"/></svg>}
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

      {/* ── CORE CAPABILITIES / FEATURES SECTION ── */}
      <section id="features" className="relative py-24 bg-slate-50/50 border-t border-slate-200/80 scroll-mt-16 overflow-hidden">
        {/* background grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(26,31,204,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(26,31,204,.035) 1px,transparent 1px)`, backgroundSize: "48px 48px" }}/>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#131bb4]">
              CORE CAPABILITIES
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Engineered for Thesis Defense Readiness
            </h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto font-sans">
              Resync pinpoints the exact logical slips panel members probe during oral examinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#131bb4] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Cross-Chapter Logic</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Catches gaps where Chapter 1 promises experiments that are mysteriously omitted in Chapter 3 or Chapter 4.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Contradiction Alerts</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Detects conflicting sample sizes, contradictory hardware parameters, or clashing statistical assumptions.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Live DOI & Citation Health</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatically verifies whether cited journal papers and web links are active or broken before submission.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Redundancy Trimmer</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Identifies repetitive literature recaps and verbatim paragraph overlaps across disparate dissertation sections.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section id="about" className="py-20 border-t border-slate-200/80 scroll-mt-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                <div className="lg:col-span-6 space-y-6 text-left">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#131bb4]">
                    ABOUT RESYNC
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Built by researchers, for researchers
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-sans">
                    Writing a master's thesis or doctoral dissertation involves months of revisions across dozens of pages. Small structural drifts and unaligned methodology claims are almost impossible to spot by eye alone.
                  </p>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-sans">
                    Resync serves as your 24/7 manuscript pre-defense panelist, providing objective, pinpoint feedback to make your research logically airtight.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-[#131bb4]" />
                      <span className="text-xs font-semibold text-slate-800">TLS 1.3 Security</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-[#131bb4]" />
                      <span className="text-xs font-semibold text-slate-800">Privacy-First Audit</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 space-y-6 shadow-xl relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-[#131bb4]/30 rounded-full blur-3xl pointer-events-none" />
                    <h3 className="font-serif text-2xl font-bold">Ready to audit your manuscript?</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Upload your Google Docs link or Word file now and get a full coherence diagnosis in ~2 minutes.
                    </p>
                    <button
                      onClick={() => {
                        onNavigate('signup');
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4 text-[#131bb4]" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </section>
    </div>
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────
