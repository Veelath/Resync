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
  Download,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import ScoreRing from './ScoreRing.tsx';

interface ResultDetailsProps {
  scan: ScanResult;
}

export default function ResultDetails({ scan }: ResultDetailsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'inconsistencies' | 'suggestions' | 'references'>('all');
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  const getInconsistencyIcon = (type: string) => {
    switch (type) {
      case 'contradiction':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'redundancy':
        return <Info className="w-5 h-5 text-amber-500" />;
      case 'terminology_clash':
        return <HelpCircle className="w-5 h-5 text-indigo-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'High':
        return <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded border border-rose-100">High Severity</span>;
      case 'Medium':
        return <span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-100">Medium Severity</span>;
      default:
        return <span className="bg-slate-50 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-100">Low Severity</span>;
    }
  };

  const getReferenceStatusBadge = (status: string) => {
    switch (status) {
      case 'Accessible':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> Validated
          </span>
        );
      case 'Unresolved':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-amber-100">
            <AlertTriangle className="w-3 h-3" /> Unresolved
          </span>
        );
      case 'Broken Link':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-rose-100">
            <AlertCircle className="w-3 h-3" /> Broken Link
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200">
            <Info className="w-3 h-3" /> No URL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id={`scan-report-${scan.id}`}>
      {/* Report Header Bento Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Manuscript Integrity</span>
          <ScoreRing score={scan.coherenceScore} size={130} />
          <p className="mt-4 text-xs text-slate-400 font-mono">
            Scanned on {new Date(scan.timestamp).toLocaleDateString()} at {new Date(scan.timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Overall Assessment Box */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" /> Executive Diagnosis
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-medium">
                {scan.chapterType}
              </span>
            </div>
            <div className="text-slate-600 leading-relaxed font-serif italic text-sm border-l-2 border-indigo-400 pl-4 py-1">
              {scan.overallAssessment}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 truncate max-w-xs">
              Source Doc: <a href={scan.documentLink} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline hover:text-indigo-600 font-mono inline-flex items-center gap-1">
                View Original Google Doc <ExternalLink className="w-3 h-3" />
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4" aria-label="Tabs">
          {[
            { id: 'all', label: 'All Scan Insights', count: scan.correlationReport.length + scan.suggestions.length + scan.references.length },
            { id: 'inconsistencies', label: 'Logical Inconsistencies', count: scan.correlationReport.length },
            { id: 'suggestions', label: 'Improvement Steps', count: scan.suggestions.length },
            { id: 'references', label: 'Cited References Audit', count: scan.references.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Contents */}

      {/* 1. Logical Inconsistencies */}
      {(activeTab === 'all' || activeTab === 'inconsistencies') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-md font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-slate-500" /> Correlation Report: Cross-Section Mismatches
            </h4>
            <span className="text-xs text-slate-400 font-mono">Explainable AI Mapping</span>
          </div>

          {scan.correlationReport.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No cross-section inconsistencies detected!</p>
              <p className="text-xs text-slate-400 mt-1">Excellent job on preserving argument alignment across your chapters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scan.correlationReport.map((item, index) => (
                <div key={index} className="bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {getInconsistencyIcon(item.inconsistencyType)}
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                          {item.inconsistencyType.replace('_', ' ')}
                        </span>
                      </div>
                      {getSeverityBadge(item.severity)}
                    </div>

                    {/* Section Mapping Visualizer */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded text-xs font-medium text-slate-700 mb-3 font-mono">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{item.sectionA}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{item.sectionB}</span>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-lg p-3 text-xs text-indigo-950">
                    <span className="font-bold block mb-1">Recommended Correction:</span>
                    {item.howToFix}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Suggestions / Improvement Steps */}
      {(activeTab === 'all' || activeTab === 'suggestions') && (
        <div className="space-y-4 pt-4">
          <h4 className="font-serif text-md font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-500" /> Actionable Manuscript Suggestions
          </h4>

          {scan.suggestions.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No structural suggestions recorded.</p>
          ) : (
            <div className="space-y-3">
              {scan.suggestions.map((sug, idx) => {
                const isOpen = expandedSuggestion === idx;
                return (
                  <div key={idx} className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
                    <button
                      onClick={() => setExpandedSuggestion(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                          sug.category === 'Methodology' ? 'bg-indigo-100 text-indigo-800' :
                          sug.category === 'Structure' ? 'bg-sky-100 text-sky-800' :
                          sug.category === 'Citation' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {sug.category}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">{sug.issue}</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isOpen && (
                      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 text-sm">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Diagnosis Rationale</span>
                          <p className="text-slate-600 leading-relaxed">{sug.explanation}</p>
                        </div>
                        <div className="bg-white rounded border border-slate-200 p-3">
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Improvement Remedy</span>
                          <p className="text-slate-700 leading-relaxed font-medium">{sug.remedy}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. References Audit */}
      {(activeTab === 'all' || activeTab === 'references') && (
        <div className="space-y-4 pt-4">
          <h4 className="font-serif text-md font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-slate-500" /> Reference Verification & Accessibility Audit
          </h4>

          {scan.references.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-500">No cited references found or parsed in this specific scan.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Citation & Reference details</th>
                      <th className="p-4 w-40">Status</th>
                      <th className="p-4">AI Audit Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {scan.references.map((ref, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-medium text-slate-800 font-serif max-w-sm">
                          {ref.citation}
                        </td>
                        <td className="p-4">
                          {getReferenceStatusBadge(ref.status)}
                        </td>
                        <td className="p-4 text-xs text-slate-500 leading-relaxed">
                          {ref.explanation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
