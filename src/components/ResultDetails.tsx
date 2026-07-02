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
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import ScoreRing from './ScoreRing.tsx';

interface ResultDetailsProps {
  scan: ScanResult;
  onRescan?: () => void;
}

export default function ResultDetails({ scan, onRescan }: ResultDetailsProps) {
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanned, setRescanned] = useState(false);

  // Check if it's a live Google Doc URL or an uploaded Word Document file
  const isGoogleDoc = scan.documentLink ? scan.documentLink.startsWith('https://docs.google.com') : true;

  // Coherence level tier helper
  const getCoherenceTier = (score: number) => {
    if (score >= 85) return { label: 'High coherence', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    if (score >= 70) return { label: 'Moderate coherence', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Low coherence', color: 'bg-rose-50 text-rose-800 border-rose-200' };
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
        onRescan();
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
              <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl animate-pulse animate-duration-1000"></div>
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative mx-auto" />
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
            
            {/* watermark badge */}
            <div className="absolute top-4 right-4 text-[9px] font-mono text-slate-350 uppercase tracking-widest">
              Resync Scan {rescanned ? "v2" : "v1"}
            </div>
            
            {/* 1. Title Block */}
            <div className="space-y-1">
              <span className="block text-[9px] font-sans font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                Title
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {scan.title || "Resync: An AI-Powered Research Manuscript Coherence and Inconsistency Detection System"}
              </p>
            </div>
            
            {/* 2. Rationale Block */}
            <div className="space-y-1">
              <span className="block text-[9px] font-sans font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                Rationale
              </span>
              <p className="text-slate-655 font-serif leading-6">
                This study addresses the challenge of manually validating research manuscripts, which are prone to structural and logical inconsistencies across sections. The volume of scholarly outputs demands automated diagnostic tools to audit coherence...
              </p>
            </div>

            {/* 3. Scope and Limitations Block (FLAG 1 - Amber/Green depending on Rescan state) */}
            {rescanned ? (
              <div className="space-y-2 border border-emerald-300 bg-emerald-50/15 p-5 rounded-2xl relative shadow-xs transition-all duration-500">
                <div className="flex justify-between items-center">
                  <span className="block text-[9px] font-sans font-extrabold text-emerald-700 uppercase tracking-widest font-mono">
                    Scope and Limitations
                  </span>
                  <span className="text-[8px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full font-sans uppercase">
                    ✓ Resolved
                  </span>
                </div>
                <p className="text-slate-700 font-serif leading-6 line-through decoration-slate-400/50">
                  This study covers the development and implementation of Resync, a web and mobile platform. Researchers submit documents as publicly shared Google Docs links and the system accepts text-based research manuscripts in a single-column format.
                </p>
                <p className="text-emerald-800 text-[11px] font-sans font-semibold mt-1">
                  ✓ Aligned: Objective 3 updated to match "single-column format" constraint.
                </p>
              </div>
            ) : (
              <div className="space-y-2 border border-amber-300 bg-amber-50/15 p-5 rounded-2xl relative shadow-xs transition-all duration-300">
                <div className="flex justify-between items-center">
                  <span className="block text-[9px] font-sans font-extrabold text-amber-700 uppercase tracking-widest font-mono">
                    Scope and Limitations
                  </span>
                  <span className="text-[8px] font-bold bg-amber-550 text-white px-2 py-0.5 rounded-full font-sans uppercase">
                    Flag 1
                  </span>
                </div>
                <p className="text-slate-700 font-serif leading-6">
                  This study covers the development and implementation of Resync, a web and mobile platform.{" "}
                  <span className="bg-amber-200/50 text-slate-950 font-semibold px-1 py-0.5 rounded">
                    Researchers submit documents as publicly shared Google Docs links and the system accepts text-based research manuscripts in a single-column format.
                  </span>{" "}
                  Resync correlates content across sections...
                </p>
              </div>
            )}

            {/* 4. Objectives of the Study Block (FLAG 2 - Rose) */}
            <div className="space-y-2 border border-rose-300 bg-rose-50/15 p-5 rounded-2xl relative shadow-xs">
              <div className="flex justify-between items-center">
                <span className="block text-[9px] font-sans font-extrabold text-rose-700 uppercase tracking-widest font-mono">
                  Objectives of the Study
                </span>
                <span className="text-[8px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full font-sans uppercase">
                  Flag 2
                </span>
              </div>
              <p className="text-slate-700 font-serif leading-6">
                1. To gather data on common logical inconsistencies... 2. To develop a multi-platform application... 3.{" "}
                <span className="bg-rose-200/50 text-slate-950 font-semibold px-1 py-0.5 rounded">
                  To implement document correlation across chapters within a manuscript
                </span>{" "}
                to detect contextual and logical inconsistencies...
              </p>
            </div>

            {/* 5. Significance of the Study Block */}
            <div className="space-y-1">
              <span className="block text-[9px] font-sans font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                Significance of the Study
              </span>
              <p className="text-slate-655 font-serif leading-6">
                The study brings multiple benefits to various stakeholders including student researchers, advisers, panelists, and academic institutions by enforcing logical rigor prior to final defense evaluations...
              </p>
            </div>

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
            <span className={`mt-3 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase font-sans ${tier.color}`}>
              {tier.label}
            </span>
          </div>

          {/* Section 2: Flags Detected List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Flags Detected
            </h4>
            
            <div className="space-y-3">
              {/* Flag 1 card (Resolved/Struck if rescanned) */}
              {rescanned ? (
                <div className="bg-emerald-50/15 border border-emerald-350 rounded-xl p-4 space-y-1.5 opacity-80 line-through decoration-emerald-600/35 transition-all">
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
                <div className="bg-amber-50/15 border border-amber-300 rounded-xl p-4 space-y-2 transition-all">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded font-sans uppercase">
                      Flag 1
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 font-sans">Scope</span>
                  </div>
                  <p className="text-xs text-slate-650 leading-relaxed font-sans">
                    Scope mentions "single-column format" but Objectives do not reference this constraint.
                  </p>
                </div>
              )}

              {/* Flag 2 card */}
              <div className="bg-rose-50/15 border border-rose-300 rounded-xl p-4 space-y-2">
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
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Suggested Actions
            </h4>
            
            <div className="space-y-2.5">
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
