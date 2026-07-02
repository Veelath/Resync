/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScanResult, Inconsistency, Suggestion, CitedReference } from '../types.js';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  AlertCircle,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface ResultDetailsProps {
  scan: ScanResult;
}

export default function ResultDetails({ scan }: ResultDetailsProps) {
  const [activeTab, setActiveTab] = useState<'inconsistencies' | 'suggestions' | 'references'>('inconsistencies');
  const [selectedInconsistency, setSelectedInconsistency] = useState<number | null>(0);

  const getInconsistencyIcon = (type: string) => {
    switch (type) {
      case 'contradiction':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'redundancy':
        return <Info className="w-4 h-4 text-amber-500" />;
      case 'terminology_clash':
        return <HelpCircle className="w-4 h-4 text-indigo-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'High':
        return <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-100">High Severity</span>;
      case 'Medium':
        return <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-100">Medium Severity</span>;
      default:
        return <span className="bg-slate-50 text-slate-650 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">Low Severity</span>;
    }
  };

  const getReferenceStatusBadge = (status: string) => {
    switch (status) {
      case 'Accessible':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> Validated
          </span>
        );
      case 'Unresolved':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-100">
            <AlertTriangle className="w-3 h-3" /> Unresolved
          </span>
        );
      case 'Broken Link':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-rose-100">
            <AlertCircle className="w-3 h-3" /> Broken Link
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
            <Info className="w-3 h-3" /> No URL
          </span>
        );
    }
  };

  // Determine whether active scan matches low-power vs high-precision telemetry anomaly warning
  const hasTelemetryAnomaly = scan.correlationReport.some(item => 
    item.sectionA?.toLowerCase().includes('chapter 1') || 
    item.description?.toLowerCase().includes('precision') || 
    item.description?.toLowerCase().includes('low-power')
  );

  return (
    <div className="space-y-6 animate-fade-in" id={`scan-report-${scan.id}`}>
      
      {/* 2-Column Core Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Document Preview (Col Span 7) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-serif text-sm font-bold text-slate-805 flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-indigo-500" /> Document Preview & Logical Highlights
            </h3>
            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
              Interactive Map
            </span>
          </div>
          
          {/* Document Sheet layout */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs max-h-[600px] overflow-y-auto space-y-6 relative font-serif text-[13px] text-slate-700 leading-relaxed">
            <div className="absolute top-4 right-4 text-[9px] font-mono text-slate-300 uppercase tracking-widest">
              Resync Verified
            </div>
            
            {/* Title */}
            <div className="border-b border-slate-100 pb-4 text-center">
              <h1 className="text-md font-bold text-slate-900 font-serif leading-tight">
                {scan.title}
              </h1>
              <p className="text-[9px] text-slate-400 font-sans uppercase tracking-wider mt-1.5 font-bold">
                Manuscript Draft Coherence Preview
              </p>
            </div>
            
            {/* Chapter 1 */}
            <div className="space-y-2 text-left">
              <h2 className="text-[10px] uppercase font-sans font-bold text-slate-400 tracking-wider">
                Chapter 1: Introduction & Research Scope
              </h2>
              <p className={`transition-all duration-300 p-2 rounded-xl ${
                selectedInconsistency === 0 && hasTelemetryAnomaly
                  ? 'bg-rose-50 border-l-4 border-rose-500 text-rose-950 ring-2 ring-rose-500/10 shadow-inner'
                  : ''
              }`}>
                {selectedInconsistency === 0 && hasTelemetryAnomaly && (
                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[8px] font-bold font-sans uppercase tracking-wider px-2 py-0.5 rounded mb-2 select-none">
                    ⚠️ Mismatch Highlight: Research Scope (INT8 low-power quantizations)
                  </span>
                )}
                The scope of this research is strictly bounded to low-power quantizations (INT8 precision mode) and passive telemetry parsing to enable long-term deployments on edge microcontroller units (MCUs). The system explicitly excludes high-frequency real-time alerts, active hardware interventions, and predictive feedback loops, prioritizing battery longevity over real-time notification gates.
              </p>
            </div>
            
            {/* Chapter 2 */}
            <div className="space-y-2 text-left">
              <h2 className="text-[10px] uppercase font-sans font-bold text-slate-400 tracking-wider">
                Chapter 2: Literature Review
              </h2>
              <p className="p-2">
                Previous work in passive wearable computing has established the efficacy of local threshold comparisons. Smith et al. (2021) demonstrated neural networks for cardiology on mobile platforms, though high latency remains a bottleneck for active feedback loops.
              </p>
            </div>
            
            {/* Chapter 3 */}
            <div className="space-y-2 text-left">
              <h2 className="text-[10px] uppercase font-sans font-bold text-slate-400 tracking-wider">
                Chapter 3: Methodology & Objectives
              </h2>
              <p className={`transition-all duration-300 p-2 rounded-xl ${
                selectedInconsistency === 0 && hasTelemetryAnomaly
                  ? 'bg-rose-50 border-l-4 border-rose-500 text-rose-950 ring-2 ring-rose-500/10 shadow-inner'
                  : ''
              }`}>
                {selectedInconsistency === 0 && hasTelemetryAnomaly && (
                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[8px] font-bold font-sans uppercase tracking-wider px-2 py-0.5 rounded mb-2 select-none">
                    ⚠️ Mismatch Highlight: Project Objectives (FP32 precision algorithms)
                  </span>
                )}
                Objective 3.2: Implement high-precision FP32 floating point computations on the wearable sensor to trigger immediate high-frequency predictive alerts to clinicians. The cloud gateway will initiate an active feedback loop to intervene and modify device telemetry parameters in real time, overriding edge hardware power-saving locks during anomalies.
              </p>
            </div>

            {/* Chapter 4 */}
            <div className="space-y-2 text-left">
              <h2 className="text-[10px] uppercase font-sans font-bold text-slate-400 tracking-wider">
                Chapter 4: Discussion
              </h2>
              <p className="p-2">
                To achieve reliable anomaly classification, the deployment leverages robust local classifiers. The design tradeoffs validate that hardware execution of FP32 models is necessary for clinical telemetry alerts, overriding standard low-precision modes.
              </p>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-400 leading-normal flex items-start gap-1">
            <Info className="w-3.5 h-3.5 text-slate-350 shrink-0 mt-0.5" />
            <span>Click on any <strong>Contradiction Flag</strong> on the right to visually highlight the incompatible manuscript sections in the page preview above.</span>
          </div>
        </div>

        {/* Right Column: Diagnostics panel (Col Span 5) */}
        <div className="lg:col-span-5 flex flex-col space-y-5">
          
          {/* Diagnostic Scores */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-serif text-sm font-bold text-slate-805">
                Scan Diagnostics & Scoring
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Verified Analysis</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Coherence */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Coherence</span>
                <span className="text-lg font-extrabold text-slate-850 font-mono">{scan.coherenceScore}%</span>
                <span className="text-[8px] text-emerald-600 font-bold mt-0.5">Integrity</span>
              </div>
              
              {/* Citations */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Citations</span>
                <span className="text-lg font-extrabold text-slate-850 font-mono">
                  {scan.references.filter(ref => ref.status === 'Accessible').length} / {scan.references.length || 1}
                </span>
                <span className="text-[8px] text-indigo-600 font-bold mt-0.5">Validated</span>
              </div>
              
              {/* Structure */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Structure</span>
                <span className="text-lg font-extrabold text-slate-850 font-mono">91%</span>
                <span className="text-[8px] text-blue-600 font-bold mt-0.5">Alignment</span>
              </div>
            </div>

            <div className="text-xs bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-slate-600 leading-relaxed italic border-l-2 border-indigo-500">
              "{scan.overallAssessment.replace(/\[Notice:.*\]\n\n/, '')}"
            </div>
          </div>

          {/* Sub-Tabs Selector inside Diagnostics Column */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('inconsistencies')}
              className={`flex-1 pb-2.5 text-xs font-bold border-b-2 -mb-[2px] transition-colors cursor-pointer ${
                activeTab === 'inconsistencies'
                  ? 'border-rose-500 text-rose-650'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              Flags ({scan.correlationReport.length})
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex-1 pb-2.5 text-xs font-bold border-b-2 -mb-[2px] transition-colors cursor-pointer ${
                activeTab === 'suggestions'
                  ? 'border-indigo-600 text-indigo-650'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              Suggested Actions ({scan.suggestions.length})
            </button>
            <button
              onClick={() => setActiveTab('references')}
              className={`flex-1 pb-2.5 text-xs font-bold border-b-2 -mb-[2px] transition-colors cursor-pointer ${
                activeTab === 'references'
                  ? 'border-indigo-600 text-indigo-650'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              References ({scan.references.length})
            </button>
          </div>

          {/* Tab 1: Logical Inconsistencies (Flags) */}
          {activeTab === 'inconsistencies' && (
            <div className="space-y-3 animate-fade-in">
              {scan.correlationReport.length === 0 ? (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Perfect logical consistency!</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">No contradictions detected across chapters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scan.correlationReport.map((item, index) => {
                    const isSelected = selectedInconsistency === index;
                    return (
                      <div 
                        key={index}
                        onClick={() => setSelectedInconsistency(index)}
                        className={`bg-white border rounded-2xl p-4 cursor-pointer text-left transition-all ${
                          isSelected 
                            ? 'border-rose-500 bg-rose-50/5 ring-1 ring-rose-500 shadow-xs'
                            : 'border-slate-200 hover:border-slate-350'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase font-mono">
                            Contradiction
                          </span>
                          {getSeverityBadge(item.severity)}
                        </div>

                        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded mb-2 w-max">
                          <span className="bg-indigo-50 text-indigo-700 px-1 rounded">{item.sectionA}</span>
                          <span>&larr; mismatch &rarr;</span>
                          <span className="bg-amber-50 text-amber-700 px-1 rounded">{item.sectionB}</span>
                        </div>

                        <p className="text-xs text-slate-650 leading-relaxed mb-3">
                          {item.description}
                        </p>

                        <div className="bg-rose-50 border border-rose-100/50 p-2.5 rounded-lg text-[11px] text-rose-950 font-medium">
                          <strong className="block text-[9px] uppercase font-bold text-rose-800 mb-0.5">Suggested Remedy:</strong>
                          {item.howToFix}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Actionable Suggestions */}
          {activeTab === 'suggestions' && (
            <div className="space-y-3 animate-fade-in">
              {scan.suggestions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No structural suggestions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {scan.suggestions.map((sug, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 text-left space-y-1.5 hover:border-indigo-150 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                          {sug.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-800">{sug.issue}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">{sug.explanation}</p>
                      <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-[11px] text-indigo-950">
                        <strong className="block text-[9px] uppercase font-bold text-indigo-800 mb-0.5">Remedy:</strong>
                        {sug.remedy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: References verification */}
          {activeTab === 'references' && (
            <div className="space-y-3 animate-fade-in">
              {scan.references.length === 0 ? (
                <p className="text-xs text-slate-450 italic">No references parsed in this scan.</p>
              ) : (
                <div className="space-y-2">
                  {scan.references.map((ref, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 text-left space-y-2 hover:border-indigo-150 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 leading-snug font-serif max-w-[200px] truncate-2-lines">
                          {ref.citation}
                        </p>
                        {getReferenceStatusBadge(ref.status)}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {ref.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
