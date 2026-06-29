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
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-800">Scan Manuscript</h2>
            <p className="text-xs text-slate-400">Fetch, analyze, and diagnose logical flow in seconds.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDemoSample}
          className="text-xs text-indigo-600 font-medium hover:underline bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          Load Interactive Demo Link
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100/50 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin relative" />
          </div>
          
          <div className="space-y-2 max-w-sm">
            <h3 className="font-serif text-lg font-bold text-slate-800 animate-pulse">Analyzing Coherence...</h3>
            <p className="text-sm text-indigo-600 font-medium font-mono min-h-[40px] px-4 transition-all">
              {ANALYSIS_STEPS[stepIndex]}
            </p>
            <p className="text-xs text-slate-400">
              Our AI is auditing logical consistency and citation maps. This may take up to 20 seconds.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 text-rose-800 text-sm p-4 rounded-lg border border-rose-100">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Scan Notice</span>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Document Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Manuscript Section Category
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MANUSCRIPT_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`flex flex-col p-4 rounded-lg border text-left cursor-pointer transition-all ${
                    chapterType === type.id
                      ? 'border-indigo-600 bg-indigo-50/10 ring-2 ring-indigo-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="chapterType"
                    value={type.id}
                    checked={chapterType === type.id}
                    onChange={() => setChapterType(type.id)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-slate-800">{type.label}</span>
                  <span className="text-xs text-slate-400 mt-1">{type.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Google Docs link input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Make sure your document is set to <strong className="text-slate-500">"Anyone with the link can view"</strong> so our AI engine can retrieve and read the contents.
            </p>
          </div>

          {/* Topic helper descriptor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Research Theme or Focus (Optional)
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">AI Assistant Help</span>
            </div>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Edge intelligence for wearable telemetry and healthcare monitoring"
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              In case of document loading timeouts, our AI model uses this topic keyword to run highly accurate simulated academic models of edge wearables and show you complete scan reports instantly.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-6 py-3 rounded-lg flex items-center gap-2 transition-all group focus:outline-none"
            >
              Analyze Manuscript <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
