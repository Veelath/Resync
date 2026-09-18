/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ScanResult } from '../types.js';
import { executeManuscriptScan, mapScanResponseToScanResult, InsufficientCreditsError } from '../services/api.js';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Upload,
  FileText,
  X,
  Download,
  Link,
  ChevronLeft,
  Plus,
  Check
} from 'lucide-react';
import { downloadReport } from '../utils.js';
import logoPng from '../assets/logo.png';

interface ScanFormProps {
  email: string;
  userId?: string;
  onScanSuccess: (scan: ScanResult) => void;
  initialUploadType?: 'chapter' | 'manuscript' | null;
  initialChaptersString?: string;
  scanCredits: number;
  setScanCredits: React.Dispatch<React.SetStateAction<number>>;
  setShowTopUpModal: React.Dispatch<React.SetStateAction<boolean>>;
  onScanningChange?: (isScanning: boolean) => void;
  onBack?: () => void;
}

const ANALYSIS_STEPS = [
  "Downloading document…",
  "Analyzing sections…",
  "Generating report…"
];

const ANALYSIS_STEP_INTERVAL_MS = 9000;

export default function ScanForm({
  email,
  userId,
  onScanSuccess,
  scanCredits,
  setScanCredits,
  setShowTopUpModal,
  onScanningChange,
  onBack
}: ScanFormProps) {

  const [documentLink, setDocumentLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [customTemplate, setCustomTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [styleGuideFile, setStyleGuideFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleGuideFileInputRef = useRef<HTMLInputElement>(null);

  const [uploadSource, setUploadSource] = useState<'file' | 'link'>('file');
  const [success, setSuccess] = useState(false);
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

  // Rotate loading messages while analyzing
  useEffect(() => {
    let interval: any;
    if (loading) {
      setStepIndex(0);
      interval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % ANALYSIS_STEPS.length);
      }, ANALYSIS_STEP_INTERVAL_MS);
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

    if (scanCredits < 1) {
      setShowTopUpModal(true);
      return;
    }

    if (uploadSource === 'file') {
      if (!uploadedFile) {
        setError('Please select or upload a Word document.');
        return;
      }
    } else {
      if (!documentLink.trim()) {
        setError('Please provide a Google Docs link.');
        return;
      }
    }

    executeScan();
  };

  const executeScan = async () => {
    setLoading(true);
    if (onScanningChange) onScanningChange(true);
    setError('');
    setSuccess(false);

    let linkToSend = documentLink;
    if (uploadSource === 'file') {
      if (uploadedFile) {
        linkToSend = 'file://' + uploadedFile.name;
      }
    }

    const formattedCategory = 'Full Manuscript';
    const resolvedTopic = customTopic.trim() || (uploadSource === 'file' ? uploadedFile?.name : undefined);
    const styleGuideVal = styleGuideFile ? 'file://' + styleGuideFile.name : '';

    try {
      const activeUserId = userId;
      if (!activeUserId) {
        setError('Authentication error: no user ID available. Please log out and log in again.');
        setLoading(false);
        return;
      }

<<<<<<< HEAD
      // No manuscript_id sent: the backend creates a fresh manuscript row
=======
>>>>>>> main
      const rawResponse = await executeManuscriptScan({
        user_id: activeUserId,
        manuscript_title: resolvedTopic,
        doc_url: linkToSend,
        style_reference_url: styleGuideVal || undefined,
        template_toc: customTemplate.trim() ? customTemplate.split('\n').map(s => s.trim()).filter(Boolean) : undefined
      });

      const mappedScan = mapScanResponseToScanResult(rawResponse, {
        title: resolvedTopic,
        customTopic: resolvedTopic,
        chapterType: formattedCategory,
        styleGuideLink: styleGuideVal || undefined
      });

      playSuccessChime();

      if (typeof rawResponse.credits_remaining === 'number') {
        setScanCredits(rawResponse.credits_remaining);
      } else {
        setScanCredits(prev => Math.max(0, prev - 1));
      }

      onScanSuccess(mappedScan);
      setLatestScanResult(mappedScan);
      setSuccess(true);
      setUploadedFile(null);
      setDocumentLink('');
      setCustomTopic('');
      setStyleGuideFile(null);
    } catch (err: any) {
      if (err instanceof InsufficientCreditsError) {
        setScanCredits(err.balance);
        setShowTopUpModal(true);
      } else {
        setError(err.message || 'An error occurred during scanning.');
      }
    } finally {
      setLoading(false);
      if (onScanningChange) onScanningChange(false);
    }
  };

  const handleLoadDemo = () => {
    setUploadSource('link');
    setDocumentLink('https://docs.google.com/document/d/1XHPdreNeC2ivez4Zaqlr78-f9L3aa4bgX48QBiss-No/edit?usp=sharing');
    setCustomTopic('PAPAIA: An AI-Powered System for Papaya Disease Identification');
    setError('');
  };

  const hasValidInput = uploadSource === 'file' ? !!uploadedFile : !!documentLink.trim();

  return (
    <div className="w-full max-w-2xl mx-auto py-2 animate-fade-in text-left">
      {/* Top Bar: Back & Logo */}
      <div className="flex items-center justify-between pb-6">
        <button
          type="button"
          onClick={() => onBack ? onBack() : window.history.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={loading}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            title="Auto-fill sample data for instant test scan"
          >
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Try Demo</span>
          </button>
          <img src={logoPng} alt="Resync Logo" className="h-5 w-auto object-contain select-none" />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Scan your manuscript
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto">
          Upload your thesis and get a full coherence report in about 2 minutes.
        </p>
      </div>

      {/* Full-screen blocking loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-indigo-950/20 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white/95 rounded-2xl p-8 border border-slate-200/80 max-w-md w-full text-left space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-slate-850">Scanning Manuscript...</h3>
            <div className="space-y-4">
              {ANALYSIS_STEPS.map((step, idx) => (
                <div key={idx} className={`flex items-center gap-3 ${idx > stepIndex ? 'opacity-40' : 'opacity-100'}`}>
                  {idx < stepIndex ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : idx === stepIndex ? (
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${idx === stepIndex ? 'text-indigo-900 font-bold' : 'text-slate-600'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-450 leading-relaxed border-t border-slate-100 pt-4">
              Our AI is auditing logical consistency and citation maps. Larger manuscripts can take a couple of minutes — this won't get stuck.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {success && latestScanResult && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-50 text-emerald-800 text-sm p-4 rounded-xl border border-emerald-100 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block font-serif text-emerald-900">Scan Completed Successfully</span>
              <p className="text-xs leading-relaxed text-slate-650">
                Coherence Score: <strong className="text-emerald-800 font-bold">{latestScanResult.coherenceScore}/100</strong>.
              </p>
            </div>
          </div>

<<<<<<< HEAD
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
            {/* Read-Only Pre-Scan Standards (B2) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Evaluation Standards
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Resync will automatically evaluate your manuscript against these fixed criteria:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-medium text-slate-700">
                <div className="bg-white p-3 border border-slate-100 rounded-lg shadow-sm">
                  <span className="block text-indigo-700 font-bold mb-1">Structural (25%)</span>
                  Checks presence of required academic sections.
                </div>
                <div className="bg-white p-3 border border-slate-100 rounded-lg shadow-sm">
                  <span className="block text-indigo-700 font-bold mb-1">Coherence (50%)</span>
                  Analyzes logical alignment across 7 canonical section pairs.
                </div>
                <div className="bg-white p-3 border border-slate-100 rounded-lg shadow-sm">
                  <span className="block text-indigo-700 font-bold mb-1">Citations (25%)</span>
                  Verifies reference accessibility and in-text matching.
                </div>
              </div>
            </div>

            <div className="text-left font-serif font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
              Choose Source
            </div>
            {/* Tabs selector */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setUploadSource('link')}
                className={`flex items-center gap-2 px-6 py-4 text-base font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${uploadSource === 'link'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
              >
                <Link className="w-5 h-5" />
                <span>Google Docs link</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadSource('file')}
                className={`flex items-center gap-2 px-6 py-4 text-base font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${uploadSource === 'file'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-655'
                  }`}
              >
                <FileText className="w-5 h-5" />
                <span>Word document</span>
              </button>
            </div>

            {/* Inputs section */}
            {uploadSource === 'link' ? (
              <div className="space-y-3 text-left animate-fade-in">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Google Docs URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Link className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    required={uploadSource === 'link'}
                    value={documentLink}
                    onChange={(e) => setDocumentLink(e.target.value)}
                    placeholder="https://docs.google.com/document/d/.../edit?usp=sharing"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-3 py-4 text-base text-slate-855 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
                  />
                </div>
                <p className="text-sm text-slate-450 leading-relaxed">
                  Note: Make sure your document is set to <strong className="text-slate-500 font-semibold font-serif">"Anyone with the link can view"</strong> so our engine can fetch its text.
                </p>
              </div>
            ) : (
              /* Word Document Upload Input */
              <div className="space-y-3 text-left animate-fade-in">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Upload Word Document (.docx)
                  </label>
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
            )}

            {/* Advanced options — collapsed by default. */}
            <div className="text-left font-serif font-bold text-slate-800 mt-8 mb-2 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
              Configure (Optional)
            </div>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Advanced options</span>
                  <span className="hidden sm:inline text-xs font-normal normal-case text-slate-400">
                    Title, style guide
                  </span>
                </div>
                {showAdvanced ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
              </button>

              {showAdvanced && (
                <div className="p-5 sm:p-6 space-y-8 border-t border-slate-200 animate-fade-in">
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
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-655 flex items-center justify-center shrink-0">
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

                  {/* Custom Section Template (B3) */}
                  <div className="space-y-3 text-left border-t border-slate-100 pt-6">
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Section Template (Optional)
                    </label>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Leave blank to auto-detect your manuscript's structure. If your department requires specific headings, paste them here (one per line).
                    </p>
                    <textarea
                      value={customTemplate}
                      onChange={(e) => setCustomTemplate(e.target.value)}
                      placeholder="e.g.&#10;Introduction&#10;Objectives of the Study&#10;Methodology"
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-855 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner resize-none font-mono"
                    />
                  </div>
=======
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleDownload(latestScanResult)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setLatestScanResult(null);
              }}
              className="p-1 text-emerald-600 hover:text-emerald-900 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-rose-50 text-rose-800 text-sm p-4 rounded-xl border border-rose-100 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block font-serif">Notice</span>
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Scan Form Card */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. MANUSCRIPT SOURCE SELECTOR */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            MANUSCRIPT SOURCE
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Upload .docx Option */}
            <button
              type="button"
              onClick={() => {
                setUploadSource('file');
                setError('');
              }}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                uploadSource === 'file'
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${uploadSource === 'file' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Upload .docx</h4>
                  <p className="text-xs text-slate-400">.docx · max 25 MB</p>
                </div>
              </div>
              {uploadSource === 'file' && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
>>>>>>> main
                </div>
              )}
            </button>

            {/* Google Docs Option */}
            <button
              type="button"
              onClick={() => {
                setUploadSource('link');
                setError('');
              }}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                uploadSource === 'link'
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${uploadSource === 'link' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Link className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Google Docs</h4>
                  <p className="text-xs text-slate-400">Shared view link</p>
                </div>
              </div>
              {uploadSource === 'link' && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 2. DROPZONE / LINK INPUT */}
        {uploadSource === 'file' ? (
          <div>
            {uploadedFile ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate font-serif">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-400">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 bg-white ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/20'
                    : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Drop your .docx here</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">or click to browse · max 25 MB</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Google Docs Share Link
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Link className="w-4 h-4" />
              </div>
              <input
                type="url"
                required={uploadSource === 'link'}
                value={documentLink}
                onChange={(e) => setDocumentLink(e.target.value)}
                placeholder="https://docs.google.com/document/d/.../edit?usp=sharing"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
<<<<<<< HEAD

            <div className="text-left font-serif font-bold text-slate-800 mt-8 mb-2 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
              Analyze
            </div>
            {/* Big, obvious primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-lg sm:text-xl px-9 py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all cursor-pointer group focus:outline-none shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:scale-101 active:scale-99 duration-150"
            >
              <Zap className="w-5 h-5" />
              <span>Scan Now</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
      </div>
=======
            <p className="text-xs text-slate-400 leading-relaxed">
              Ensure permissions are set to <strong className="text-slate-600">"Anyone with the link can view"</strong>.
            </p>
          </div>
        )}

        {/* 3. DOCUMENT TEMPLATE (OPTIONAL) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📁</span>
              <span className="text-sm font-bold text-slate-800">Document Template</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 border border-slate-200 rounded-full px-2.5 py-0.5">
              Optional
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Upload your school's chapter template so Resync maps your chapter labels accurately.
          </p>

          {styleGuideFile ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{styleGuideFile.name}</p>
                  <p className="text-[10px] text-slate-400">{(styleGuideFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStyleGuideFile(null)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => styleGuideFileInputRef.current?.click()}
              className="border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl py-3 px-4 text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600"
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
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Attach template file</span>
            </div>
          )}
        </div>

        {/* 4. PRIMARY SUBMIT CTA */}
        <button
          type="submit"
          disabled={loading || !hasValidInput}
          className={`w-full font-bold text-sm sm:text-base py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            hasValidInput && !loading
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-[0.99]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <span>{hasValidInput ? 'Start Scan (1 credit)' : 'Add a manuscript source above'}</span>
          {hasValidInput && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
>>>>>>> main
    </div>
  );
}
