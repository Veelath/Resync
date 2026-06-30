/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScanResult } from '../types.js';
import { 
  FileText, 
  Link, 
  Compass, 
  HelpCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface ScanFormProps {
  email: string;
  onScanSuccess: (scan: ScanResult) => void;
}

const MANUSCRIPT_TYPES = [
  { id: 'Full Manuscript', label: 'Full Manuscript Draft', desc: 'Checks alignment across all sections' },
  { id: 'Chapter 1: Introduction', label: 'Chapter 1: Introduction', desc: 'Checks foundational definitions' },
  { id: 'Chapter 2: Related Work', label: 'Chapter 2: Related Work', desc: 'Validates citation style' },
  { id: 'Chapter 3: Methodology', label: 'Chapter 3: Methodology', desc: 'Checks mathematical/methodological flows' },
  { id: 'Chapter 4: Results & Discussion', label: 'Chapter 4: Results & Discussion', desc: 'Audits empirical data alignment' },
];

const ANALYSIS_STEPS = [
  "Securing link connection...",
  "Retrieving document layout and paragraphs...",
  "Analyzing terminology and semantic consistency...",
  "Mapping logic gates between adjacent sections...",
  "Cross-checking methodologies vs conclusions...",
  "Parsing bibliographical reference tags...",
  "Running accessibility check on citation URLs...",
  "Assembling final coherence report..."
];

export default function ScanForm({ email, onScanSuccess }: ScanFormProps) {
  const [documentLink, setDocumentLink] = useState('');
  const [chapterType, setChapterType] = useState('Full Manuscript');
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);

  // Rotate loading messages while analyzing
  useEffect(() => {
    let interval: any;
    if (loading) {
      setStepIndex(0);
      interval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % ANALYSIS_STEPS.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentLink) {
      setError('Please provide a Google Docs link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/scans/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          documentLink,
          chapterType,
          customTopic: customTopic.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan manuscript.');
      }

      onScanSuccess(data.scan);
    } catch (err: any) {
      setError(err.message || 'An error occurred during scanning.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to load sample credentials instantly
  const loadDemoSample = () => {
    setDocumentLink('https://docs.google.com/document/d/1B_8_DemoAcademicManuscriptEdgeWearables/edit?usp=sharing');
    setChapterType('Full Manuscript');
    setCustomTopic('Edge Heart Wearable anomaly detection');
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-slate-800">Manuscript Coherence Scan Engine</h2>
            <p className="text-[11px] text-slate-400">Fetch, analyze, and diagnose logical flow in seconds.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDemoSample}
          className="text-xs text-indigo-600 font-semibold hover:underline bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg transition-all self-start"
        >
          Load Interactive Demo Link
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100/50 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative" />
          </div>
          
          <div className="space-y-1.5 max-w-sm">
            <h3 className="font-serif text-base font-bold text-slate-800 animate-pulse">Analyzing Coherence...</h3>
            <p className="text-xs text-indigo-600 font-medium font-mono min-h-[30px] px-4 transition-all">
              {ANALYSIS_STEPS[stepIndex]}
            </p>
            <p className="text-[10px] text-slate-400">
              Our AI is auditing logical consistency and citation maps. This may take up to 20 seconds.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 text-rose-800 text-xs p-3.5 rounded-lg border border-rose-100">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Scan Notice</span>
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Google Docs link input */}
            <div className="md:col-span-8 space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Public Google Docs URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Link className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  required
                  value={documentLink}
                  onChange={(e) => setDocumentLink(e.target.value)}
                  placeholder="https://docs.google.com/document/d/.../edit?usp=sharing"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-850 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Manuscript Section Category Select Dropdown */}
            <div className="md:col-span-4 space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Section Category
              </label>
              <select
                value={chapterType}
                onChange={(e) => setChapterType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
              >
                {MANUSCRIPT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic helper descriptor */}
            <div className="md:col-span-8 space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Research Theme or Focus (Optional)
                </label>
              </div>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Edge intelligence for wearable telemetry and healthcare monitoring"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-850 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* Submit button */}
            <div className="md:col-span-4 flex items-end">
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer group focus:outline-none"
              >
                <span>Analyze Manuscript</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Note: Make sure your document is set to <strong className="text-slate-500 font-semibold">"Anyone with the link can view"</strong> so our diagnostics engine can read it.
          </p>
        </form>
      )}
    </div>
  );
}
