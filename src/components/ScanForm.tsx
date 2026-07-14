/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ScanResult } from '../types.js';
import {
  Compass,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Upload,
  FileText,
  X,
  Download,
  BookOpen
} from 'lucide-react';
import { downloadReport } from '../utils.js';

interface ScanFormProps {
  email: string;
  onScanSuccess: (scan: ScanResult) => void;
  isRescan?: boolean;
  initialDocumentLink?: string;
  prevScanTimestamp?: string;
  parentScanId?: string;
  initialUploadType?: 'chapter' | 'manuscript' | null;
  initialChaptersString?: string;
}

const ANALYSIS_STEPS = [
  "Securing file connection...",
  "Retrieving document layout and paragraphs...",
  "Analyzing terminology and semantic consistency...",
  "Mapping logic gates between adjacent sections...",
  "Cross-checking methodologies vs conclusions...",
  "Parsing bibliographical reference tags...",
  "Running accessibility check on citation URLs...",
  "Assembling final coherence report..."
];

export default function ScanForm({
  email,
  onScanSuccess,
  isRescan = false,
  initialDocumentLink = '',
  prevScanTimestamp = '',
  parentScanId = ''
}: ScanFormProps) {

  // Fields
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [styleGuideSource, setStyleGuideSource] = useState<'link' | 'file'>('link');
  const [styleGuideLink, setStyleGuideLink] = useState('');
  const [styleGuideFile, setStyleGuideFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleGuideFileInputRef = useRef<HTMLInputElement>(null);

  const uploadSource = 'file';
  const uploadType = 'manuscript';
  const [success, setSuccess] = useState(false);
  const [showRescanConfirmModal, setShowRescanConfirmModal] = useState(false);
  const [researchType, setResearchType] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [latestScanResult, setLatestScanResult] = useState<ScanResult | null>(null);

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1: E5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.5);

      // Note 2: A5 (played slightly later)
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
          gain2.gain.setValueAtTime(0, ctx.currentTime);
          gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
          gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.6);
        } catch (innerErr) {
          console.warn("Chime note 2 failed:", innerErr);
        }
      }, 120);
    } catch (e) {
      console.warn("AudioContext chime failed:", e);
    }
  };

  const handleDownload = (scan: ScanResult) => {
    downloadReport(scan);
  };

  // Check if file is modified
  const getFileModificationStatus = () => {
    if (!isRescan || !uploadedFile || !initialDocumentLink) {
      return { isModified: true, reason: '' };
    }

    const prevFileName = initialDocumentLink.replace('file://', '');
    const hasDifferentName = uploadedFile.name !== prevFileName;

    const prevScanTime = prevScanTimestamp ? new Date(prevScanTimestamp).getTime() : 0;
    const hasNewerModifiedTime = uploadedFile.lastModified > prevScanTime;

    if (hasDifferentName) {
      return {
        isModified: true,
        reason: `You uploaded a different file ("${uploadedFile.name}" instead of "${prevFileName}").`
      };
    }

    if (hasNewerModifiedTime) {
      return {
        isModified: true,
        reason: `The file has been modified since your last scan.`
      };
    }

    return {
      isModified: false,
      reason: `No changes detected. The file has the same name and has not been modified since your last scan.`
    };
  };

  const modStatus = getFileModificationStatus();
  const prevFileName = initialDocumentLink ? initialDocumentLink.replace('file://', '') : '';

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedFile) {
      setError('Please select or upload a Word document.');
      return;
    }

    if (isRescan) {
      setShowRescanConfirmModal(true);
    } else {
      executeScan();
    }
  };

  const executeScan = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    let linkToSend = '';
    if (uploadedFile) {
      linkToSend = 'file://' + uploadedFile.name;
    }

    // Format section category - always Full Manuscript now
    const formattedCategory = 'Full Manuscript';

    // Set topic to research topic, or default to uploaded file name
    const resolvedTopic = customTopic.trim() || uploadedFile?.name;

    const styleGuideVal = styleGuideSource === 'file'
      ? (styleGuideFile ? 'file://' + styleGuideFile.name : '')
      : styleGuideLink;

    try {
      const response = await fetch('/api/scans/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          documentLink: linkToSend,
          chapterType: formattedCategory,
          customTopic: resolvedTopic,
          supportingDoc: '',
          styleGuideLink: styleGuideVal || undefined,
          researchType,
          parentScanId: isRescan ? parentScanId : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan manuscript.');
      }

      // Play synthesized completion chime
      playSuccessChime();

      onScanSuccess(data.scan);
      setLatestScanResult(data.scan);
      setSuccess(true);
      setUploadedFile(null);
      setCustomTopic('');
      setStyleGuideLink('');
      setStyleGuideFile(null);
      setStyleGuideSource('link');
    } catch (err: any) {
      setError(err.message || 'An error occurred during scanning.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm animate-fade-in space-y-8">
      {/* Header bar */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5 text-left">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-655">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-855">Manuscript Coherence Scan Engine</h2>
          <p className="text-xs sm:text-sm text-slate-450 mt-1">Fetch, analyze, and diagnose logical flow in seconds.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100/50 rounded-full blur-2xl animate-pulse"></div>
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin relative" />
          </div>

          <div className="space-y-2.5 max-w-md">
            <h3 className="font-serif text-lg font-bold text-slate-850 animate-pulse">Analyzing Coherence...</h3>
            <p className="text-sm sm:text-base text-indigo-600 font-bold font-mono min-h-[35px] px-6 transition-all">
              {ANALYSIS_STEPS[stepIndex]}
            </p>
            <p className="text-xs sm:text-sm text-slate-450 leading-relaxed">
              Our AI is auditing logical consistency and citation maps. This may take up to 20 seconds.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {success && latestScanResult && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-50 text-emerald-800 text-sm p-5 rounded-xl border border-emerald-100 animate-fade-in relative">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 pr-6 text-left">
                  <span className="font-semibold block font-serif text-emerald-900">Scan Completed Successfully</span>
                  <p className="text-xs leading-relaxed text-slate-650">
                    Your manuscript has been successfully analyzed with Coherence Score: <strong className="text-emerald-800 font-bold">{latestScanResult.coherenceScore}/100</strong> and Duplication Rate: <strong className="text-emerald-800 font-bold">{latestScanResult.duplicationScore}%</strong>. You can download the report here or browse details.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 self-start sm:self-auto pl-8 sm:pl-0">
                <button
                  type="button"
                  onClick={() => handleDownload(latestScanResult)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap hover:scale-102 active:scale-98 duration-100"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Audited Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setLatestScanResult(null);
                  }}
                  className="p-1.5 text-emerald-650 hover:text-emerald-850 hover:bg-emerald-100/50 rounded-lg cursor-pointer transition-all"
                  title="Close Notice"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-rose-50 text-rose-800 text-sm p-4 rounded-xl border border-rose-100 animate-fade-in text-left">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block font-serif">Scan Notice</span>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-sm font-bold text-indigo-650 uppercase tracking-wide block font-mono">
                  Uploading
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-855 font-serif">
                  Full manuscript draft
                </h3>
              </div>
            </div>

            {/* Custom Topic field */}
            <div className="space-y-3 text-left">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                Research Project Title or Topic
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Edge Heart Wearable anomaly detection (Optional)"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-4 text-base text-slate-855 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* Research Paradigm Selector */}
            <div className="space-y-4 text-left p-5 bg-indigo-50/15 border border-indigo-100/50 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Research Methodology Paradigm
                  </label>
                  <p className="text-xs text-slate-455 mt-0.5">Select your primary design paradigm to calibrate scanning parameters</p>
                </div>

                <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => setResearchType('quantitative')}
                    className={`px-4.5 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${researchType === 'quantitative'
                        ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/30'
                        : 'text-slate-400 hover:text-slate-655'
                      }`}
                  >
                    Quantitative
                  </button>
                  <button
                    type="button"
                    onClick={() => setResearchType('qualitative')}
                    className={`px-4.5 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${researchType === 'qualitative'
                        ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/30'
                        : 'text-slate-400 hover:text-slate-655'
                      }`}
                  >
                    Qualitative
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-505 font-sans italic leading-relaxed">
                {researchType === 'quantitative'
                  ? "★ Calibrated for statistical significance tests, data matrices, validation surveys, and empirical logic gates."
                  : "★ Calibrated for interview scripts, thematic analysis codes, conceptual schemas, and literature matrices."
                }
              </p>
            </div>

            {/* Word Document Upload Input */}
            <div className="space-y-3 text-left">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Upload Word Document (.docx)
                </label>
                {isRescan && prevFileName && (
                  <span className="text-sm text-indigo-650 font-semibold">
                    Previous file: {prevFileName}
                  </span>
                )}
              </div>

              {uploadedFile ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-base font-bold text-slate-800 truncate font-serif">{uploadedFile.name}</p>
                      <p className="text-sm text-slate-405">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 ${dragActive
                      ? 'border-indigo-500 bg-indigo-50/10'
                      : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/30'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-450">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-705 font-serif">Drag your .docx here or click to browse</p>
                    <p className="text-sm text-slate-450 mt-1.5 font-mono">Word documents only, up to 25 MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Department Style Guide Reference */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-655">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Department Style Guide
                  </h4>
                </div>

                {/* Selector tabs for style guide source */}
                <div className="flex bg-slate-100 rounded-xl p-0.5 self-start sm:self-auto border border-slate-200/40">
                  <button
                    type="button"
                    onClick={() => setStyleGuideSource('link')}
                    className={`px-4.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${styleGuideSource === 'link'
                        ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/30'
                        : 'text-slate-400 hover:text-slate-655'
                      }`}
                  >
                    Docs Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleGuideSource('file')}
                    className={`px-4.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${styleGuideSource === 'file'
                        ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/30'
                        : 'text-slate-400 hover:text-slate-655'
                      }`}
                  >
                    Upload File
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Optional. {styleGuideSource === 'link' ? "Paste a public Google Docs or GDrive link containing your department's specific formatting or structural guidelines." : "Upload a PDF, Word document, or text file containing your department's formatting guidelines."}
              </p>

              {styleGuideSource === 'link' ? (
                <div className="relative animate-fade-in">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={styleGuideLink}
                    onChange={(e) => setStyleGuideLink(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-3 py-4 text-base text-slate-855 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
                  />
                </div>
              ) : (
                <div className="animate-fade-in">
                  {styleGuideFile ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 flex items-center justify-between border-dashed">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-base font-bold text-slate-800 truncate font-serif">{styleGuideFile.name}</p>
                          <p className="text-xs text-slate-405">{(styleGuideFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStyleGuideFile(null)}
                        className="p-2 rounded-lg text-slate-450 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => styleGuideFileInputRef.current?.click()}
                      className="border border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/5 rounded-xl py-5 px-8 text-center cursor-pointer transition-all flex items-center justify-center gap-2.5"
                    >
                      <input
                        ref={styleGuideFileInputRef}
                        type="file"
                        accept=".docx,.pdf,.txt"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setStyleGuideFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-slate-450" />
                      <span className="text-sm font-bold text-slate-655">Select style guide file (PDF, DOCX, TXT...)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base sm:text-lg px-9 py-4.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer group focus:outline-none shadow-md shadow-slate-900/10 hover:shadow-lg hover:scale-102 active:scale-98 duration-100"
              >
                <span>Analyze manuscript</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </form>
          
          {/* Rescan Confirmation Modal */}
          {showRescanConfirmModal && (
            <div className="fixed inset-0 bg-indigo-950/20 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white/95 rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden max-w-md w-full p-6 relative space-y-6 text-left">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${modStatus.isModified ? 'bg-indigo-50 text-indigo-650' : 'bg-amber-50 text-amber-605'}`}>
                    {modStatus.isModified ? <Sparkles className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif text-base font-bold text-slate-900">
                      {modStatus.isModified ? "Confirm Rescan" : "No Changes Detected"}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {modStatus.isModified
                        ? `Are you sure you want to rescan this manuscript? ${modStatus.reason}`
                        : `It looks like "${uploadedFile?.name}" has not been modified since your last scan. Are you sure you want to scan it again?`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRescanConfirmModal(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRescanConfirmModal(false);
                      executeScan();
                    }}
                    className={`text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer ${modStatus.isModified
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                  >
                    {modStatus.isModified ? "Yes, Rescan" : "Rescan Anyway"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
