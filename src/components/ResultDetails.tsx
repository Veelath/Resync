/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScanResult } from '../types.js';
import { 
  FileText, 
  RefreshCw,
  Sparkles,
  Compass,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import ScoreRing from './ScoreRing.tsx';

interface ResultDetailsProps {
  scan: ScanResult;
  onRescan?: (scan: ScanResult) => void;
}

export default function ResultDetails({ scan, onRescan }: ResultDetailsProps) {
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanned, setRescanned] = useState(false);
  const [selectedInconsistency, setSelectedInconsistency] = useState<number | null>(0);

  // Check if it's a live Google Doc URL or an uploaded Word Document file
  const isGoogleDoc = scan.documentLink ? scan.documentLink.startsWith('https://docs.google.com') : true;

  // Coherence level tier helper
  const getCoherenceTier = (score: number) => {
    if (score >= 85) return { label: 'High coherence', color: 'bg-emerald-50 text-emerald-800 border-emerald-250' };
    if (score >= 70) return { label: 'Moderate coherence', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Low coherence', color: 'bg-rose-50 text-rose-800 border-rose-250' };
  };

  const handleRescanClick = () => {
    if (isGoogleDoc) {
      // Simulate live Google Doc re-fetch (Page 9 & 13)
      setIsRescanning(true);
      setTimeout(() => {
        setIsRescanning(false);
        setRescanned(true);
      }, 3000);
    } else {
      // Word document takes user back to scan tab to upload updated file (Page 8)
      if (onRescan) {
        onRescan(scan);
      }
    }
  };

  const displayScore = rescanned ? 89 : scan.coherenceScore;
  const tier = getCoherenceTier(displayScore);

  return (
    <div className="space-y-6 animate-fade-in text-left relative" id={`scan-report-${scan.id}`}>
      
      {/* Rescanning Overlay loader (Page 9 of PDF) */}
      {isRescanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 max-w-sm text-center space-y-4 shadow-2xl">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl animate-pulse"></div>
              <Loader2 className="w-10 h-10 text-indigo-650 animate-spin relative mx-auto" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-sm font-bold text-slate-805">Rescanning in progress</h3>
              <p className="text-xs text-slate-500 font-sans">Re-reading your Google Doc and updating the scan...</p>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Layout matching the mockup layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Middle Column: Scanned Document Preview (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* Document Section Sub-header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
                Scanned Document
              </span>
              <h3 className="font-serif text-sm font-bold text-slate-805 mt-0.5">
                {scan.chapterType || 'Chapter 1: Introduction'}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {rescanned && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200 animate-pulse font-sans">
                  Rescanned just now
                </span>
              )}
              <div className={`px-3.5 py-1.5 rounded-full border text-xs font-extrabold ${tier.color}`}>
                Score: {displayScore}/100
              </div>
            </div>
          </div>
          
          {/* Main Document Content Sheet */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs max-h-[700px] overflow-y-auto space-y-6 relative font-serif text-[13px] text-slate-700 leading-relaxed">
            
            {/* Title / Chapter Header block */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-100">
              <h2 className="text-xs uppercase font-sans font-bold text-slate-400 tracking-widest font-mono">
                CHAPTER I
              </h2>
              <h1 className="text-sm font-bold text-slate-900 font-sans tracking-wide">
                INTRODUCTION
              </h1>
            </div>

            {/* Paragraph 1 */}
            <p className="font-serif leading-6 text-slate-705 text-justify">
              Research writing shapes the research skills and academic readiness of student researchers throughout their degree programs, while also placing significant evaluative responsibility on advisers and panelists reviewing each manuscript's quality. However, research writing remains highly vulnerable to structural and logical inconsistencies, such as objectives drifting from the stated problem or conclusions left unsupported by survey and validation evidence, often going undetected until late in the drafting process (Xue, 2024).
            </p>

            {/* Paragraph 2 */}
            <p className="font-serif leading-6 text-slate-705 text-justify">
              For students, the core problem is the lack of an early-detection mechanism for these gaps: they usually discover their objectives no longer{" "}
              {rescanned ? (
                <span className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-semibold line-through decoration-emerald-600/40">
                  match their problem statement
                </span>
              ) : (
                <span 
                  onClick={() => setSelectedInconsistency(0)}
                  className={`transition-all duration-300 px-1 py-0.5 rounded font-semibold cursor-pointer border-b border-amber-400 select-none ${
                    selectedInconsistency === 0
                      ? 'bg-amber-300 text-slate-950 ring-2 ring-amber-500/20 font-bold border-b-2 border-amber-600'
                      : 'bg-amber-100/60 text-slate-800'
                  }`}
                  title="Flag 1: Scope Mismatch"
                >
                  match their problem statement
                </span>
              )}
              {rescanned && <span className="text-emerald-700 text-[10px] font-sans font-bold ml-1">✓ Resolved</span>}
              , or their conclusions lack data support, only during consultation or final defense, when fixing the manuscript is far more costly. For advisers and panelists, the burden is just as real: manual, section-by-section review is time-consuming and prone to oversight, especially under heavy advising loads and rising submission volumes that have been shown to compromise review quality (Thakkar et al., 2025), leaving them with limited capacity to catch every inconsistency before a manuscript reaches final defense.
            </p>

            {/* Paragraph 3 */}
            <p className="font-serif leading-6 text-slate-705 text-justify">
              To address these challenges, the research team proposes Resync, an AI-powered system that uses natural language processing to evaluate the coherence, consistency, and coherence of research manuscripts.{" "}
              <span 
                onClick={() => setSelectedInconsistency(1)}
                className={`transition-all duration-300 px-1 py-0.5 rounded font-semibold cursor-pointer border-b border-rose-450 select-none ${
                  selectedInconsistency === 1
                    ? 'bg-rose-300 text-slate-950 ring-2 ring-rose-500/20 font-bold border-b-2 border-rose-600'
                    : 'bg-rose-100/60 text-slate-800'
                }`}
                title="Flag 2: Objectives Mismatch"
              >
                The system checks a manuscript against
              </span>{" "}
              its supporting documents, including the Survey Analysis Result, to detect inconsistencies between them, generating a Coherence Score, an Overall Assessment, and Recommendations for correcting detected gaps. Unlike generic writing tools that focus only on grammar or originality, Resync is built specifically to validate the logical and evidentiary consistency of a research manuscript.
            </p>

            {/* Paragraph 4 */}
            <p className="font-serif leading-6 text-slate-705 text-justify">
              Resync is designed to benefit everyone involved in the research process. Student researchers gain a faster way to catch inconsistencies before submission, reducing revision cycles. Advisers spend less time on manual checking and more time on substantive guidance. Panelists get a clearer, more standardized view of a manuscript's consistency going into a defense. Together, these benefits support stronger, more defensible research outputs.
            </p>

          </div>
          
        </div>

        {/* Right Column: Diagnostics panel (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Section 1: Coherence Score Gauge */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono mb-2">
              Coherence Score
            </span>
            <div className="relative">
              <ScoreRing score={displayScore} size={110} strokeWidth={8} />
              {rescanned && (
                <div className="absolute -top-1 -right-4 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white animate-bounce shadow-xs font-sans">
                  +17 pts
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Flags Detected List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono text-left">
              Flags Detected
            </h4>
            
            <div className="space-y-3">
              {/* Flag 1 card (Resolved/Struck if rescanned) */}
              {rescanned ? (
                <div className="bg-emerald-50/15 border border-emerald-350 rounded-xl p-4 space-y-1.5 opacity-80 line-through decoration-emerald-600/35 transition-all text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded font-sans uppercase">
                      ✓ Resolved
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 font-sans">Scope Flag Resolved</span>
                  </div>
                  <p className="text-xs text-slate-450 leading-relaxed font-sans">
                    Scope mentions "single-column format" but Objectives do not reference this constraint.
                  </p>
                </div>
              ) : (
                <div 
                  onClick={() => setSelectedInconsistency(0)}
                  className={`bg-amber-50/15 border rounded-xl p-4 space-y-2 transition-all text-left cursor-pointer ${
                    selectedInconsistency === 0 
                      ? 'border-amber-500 bg-amber-50/30 shadow-xs' 
                      : 'border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded font-sans uppercase">
                      Flag 1
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 font-sans">Scope</span>
                  </div>
                  <p className="text-xs text-slate-655 leading-relaxed font-sans">
                    Scope mentions "single-column format" but Objectives do not reference this constraint.
                  </p>
                </div>
              )}

              {/* Flag 2 card */}
              <div 
                onClick={() => setSelectedInconsistency(1)}
                className={`bg-rose-50/15 border rounded-xl p-4 space-y-2 text-left cursor-pointer transition-all ${
                  selectedInconsistency === 1 
                    ? 'border-rose-500 bg-rose-50/30 shadow-xs' 
                    : 'border-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded font-sans uppercase">
                    Flag 2
                  </span>
                  <span className="text-[10px] font-bold text-rose-800 font-sans">Objectives</span>
                </div>
                <p className="text-xs text-slate-655 leading-relaxed font-sans">
                  Objective 3 says "across chapters" but Scope uses "across sections" — terminology inconsistency.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Suggested Actions List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono text-left">
              Suggested Actions
            </h4>
            
            <div className="space-y-2.5 text-left">
              {/* Action 1 */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Update Objective 3 to use "sections" instead of "chapters" to align with Scope and Limitations.
                </p>
              </div>

              {/* Action 2 */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Add the single-column format constraint to the Objectives or remove it from Scope if not a system requirement.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Rescan document button */}
          <button
            onClick={handleRescanClick}
            className="w-full bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRescanning ? 'animate-spin' : ''}`} />
            <span>Rescan document</span>
          </button>

        </div>

      </div>

    </div>
  );
}
