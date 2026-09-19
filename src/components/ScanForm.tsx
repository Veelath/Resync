/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ScanResult } from '../types.js';
import { executeManuscriptScan, mapScanResponseToScanResult, InsufficientCreditsError } from '../services/api.js';
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  X,
  Download,
  Link as LinkIcon,
  ChevronLeft,
  Plus,
  Check,
  PenLine,
  LayoutGrid,
  Info,
  ArrowRight
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

const PIPELINE_CHECKS = [
  {
    id: 1,
    title: "Parsing manuscript structure",
    tech: "spaCy",
    threshold: 25
  },
  {
    id: 2,
    title: "Computing semantic embeddings",
    tech: "all-mpnet-base-v2",
    threshold: 55
  },
  {
    id: 3,
    title: "Deep reasoning & alignment checks",
    tech: "Google Gemini 2.5 Pro",
    threshold: 85
  },
  {
    id: 4,
    title: "Citation accessibility scan",
    tech: "Async HTTP checker",
    threshold: 100
  }
];

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

  // Fields
  const [documentLink, setDocumentLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [styleGuideFile, setStyleGuideFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleGuideFileInputRef = useRef<HTMLInputElement>(null);

  const [uploadSource, setUploadSource] = useState<'file' | 'link'>('file');
  const [success, setSuccess] = useState(false);
  const [latestScanResult, setLatestScanResult] = useState<ScanResult | null>(null);

  // Audio Context Ref for guaranteed playback
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn("AudioContext init notice:", e);
    }
  };

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Celebratory ascending chime: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz) -> E6 (1318Hz)
      const notes = [
        { freq: 659.25, time: 0, dur: 0.35, gain: 0.18 },
        { freq: 830.61, time: 0.1, dur: 0.35, gain: 0.2 },
        { freq: 987.77, time: 0.2, dur: 0.4, gain: 0.22 },
        { freq: 1318.51, time: 0.32, dur: 0.7, gain: 0.25 }
      ];

      notes.forEach(({ freq, time, dur, gain: targetGain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + time);
        gainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + time + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      });
    } catch (e) {
      console.warn("AudioContext chime failed:", e);
    }
  };

  const handleDownload = (scan: ScanResult) => {
    downloadReport(scan);
  };

  // Smooth realistic progress animation during scan
  useEffect(() => {
    let progressTimer: any;

    if (loading) {
      setProgress(8);

      // Increment progress smoothly through the 4 stages
      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev < 24) return prev + Math.floor(Math.random() * 3 + 2);
          if (prev < 54) return prev + Math.floor(Math.random() * 3 + 2);
          if (prev < 84) return prev + Math.floor(Math.random() * 2 + 1);
          if (prev < 95) return prev + 1;
          return prev;
        });
      }, 700);
    } else {
      setProgress(0);
    }

    return () => {
      clearInterval(progressTimer);
    };
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

    initAudio();

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

      const rawResponse = await executeManuscriptScan({
        user_id: activeUserId,
        manuscript_title: resolvedTopic,
        doc_url: linkToSend,
        style_reference_url: styleGuideVal || undefined
      });

      const mappedScan = mapScanResponseToScanResult(rawResponse, {
        title: resolvedTopic,
        customTopic: resolvedTopic,
        chapterType: formattedCategory,
        styleGuideLink: styleGuideVal || undefined
      });

      // Complete progress & play success chime
      setProgress(100);
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
    initAudio();
    setUploadSource('link');
    setDocumentLink('https://docs.google.com/document/d/1XHPdreNeC2ivez4Zaqlr78-f9L3aa4bgX48QBiss-No/edit?usp=sharing');
    setCustomTopic('PAPAIA: An AI-Powered System for Papaya Disease Identification');
    setError('');
  };

  const hasValidInput = uploadSource === 'file' ? !!uploadedFile : !!documentLink.trim();

  // Helper to determine status for each of the 4 checks
  const getCheckStatus = (index: number) => {
    if (progress >= PIPELINE_CHECKS[index].threshold) {
      return 'done';
    }
    const prevThreshold = index === 0 ? 0 : PIPELINE_CHECKS[index - 1].threshold;
    if (progress >= prevThreshold) {
      return 'running';
    }
    return 'pending';
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2 animate-fade-in text-left">
      {/* Top Header Bar: Back & Logo / Demo */}
      <div className="flex items-center justify-between pb-6">
        <button
          type="button"
          onClick={() => {
            if (onBack) {
              onBack();
            } else {
              window.history.back();
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
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

      {/* Main Title Section */}
      <div className="space-y-1 mb-8">
        <span className="text-[11px] font-bold text-[#131bb4] uppercase tracking-wider font-mono">
          NEW SCAN
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Scan your manuscript
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Upload your thesis and get a coherence report in about 2 minutes.
        </p>
      </div>

      {/* FULL SCREEN MAXIMIZED SCANNING INTERFACE */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 overflow-y-auto min-h-screen animate-fade-in">
          <div className="max-w-xl w-full mx-auto flex flex-col items-center text-center space-y-6">
            
            {/* Top Logo Badge with soft glow */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-indigo-50/70 border border-indigo-100/90 flex items-center justify-center p-3 shadow-xs">
                <img src={logoPng} alt="Resync Logo" className="w-10 h-auto object-contain select-none" />
              </div>
            </div>

            {/* Header Heading */}
            <div className="space-y-2">
              <h2 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Analyzing your manuscript
              </h2>
              <p className="text-sm sm:text-base text-slate-500 font-normal">
                Running 4 coherence checks across all chapters
              </p>
            </div>

            {/* Progress Bar & Percentage */}
            <div className="w-full space-y-2 pt-4 text-left">
              <div className="flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-slate-400">Progress</span>
                <span className="text-[#131bb4] font-bold">{progress}%</span>
              </div>

              {/* Smooth Progress Track */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#131bb4] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                />
              </div>
            </div>

            {/* 4 Diagnostic Pipeline Checks Cards */}
            <div className="w-full space-y-3 pt-2 text-left">
              {PIPELINE_CHECKS.map((check, idx) => {
                const status = getCheckStatus(idx);

                if (status === 'done') {
                  return (
                    <div
                      key={check.id}
                      className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-7 h-7 rounded-full bg-[#22c55e] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#14532d]">{check.title}</h4>
                          <p className="text-xs font-mono text-[#15803d]/80 mt-0.5">{check.tech}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#16a34a] font-sans">
                        Done
                      </span>
                    </div>
                  );
                }

                if (status === 'running') {
                  return (
                    <div
                      key={check.id}
                      className="bg-[#eff6ff] border-2 border-[#131bb4] rounded-2xl p-4 flex items-center justify-between transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-7 h-7 rounded-full bg-[#131bb4] text-white flex items-center justify-center shrink-0 shadow-xs relative">
                          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping absolute" />
                          <span className="w-2.5 h-2.5 rounded-full bg-white relative" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{check.title}</h4>
                          <p className="text-xs font-mono text-[#131bb4] mt-0.5">{check.tech}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#131bb4] font-mono animate-pulse">
                        Running…
                      </span>
                    </div>
                  );
                }

                // Pending state
                return (
                  <div
                    key={check.id}
                    className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between opacity-40 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {check.id}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-500">{check.title}</h4>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{check.tech}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Note */}
            <p className="text-xs text-slate-400 pt-3">
              Typically 2–3 minutes · do not close this tab
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
              <p className="text-xs leading-relaxed text-slate-600">
                Coherence Score: <strong className="text-emerald-800 font-bold">{latestScanResult.coherenceScore}/100</strong>.
              </p>
            </div>
          </div>

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

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 xl:col-span-7 space-y-5">
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
                className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  uploadSource === 'file'
                    ? 'border-[#131bb4] bg-white ring-1 ring-[#131bb4]/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${uploadSource === 'file' ? 'bg-indigo-50 text-[#131bb4]' : 'bg-slate-100 text-slate-400'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Upload .docx</h4>
                    <p className="text-xs text-slate-400">.docx · max 25 MB</p>
                  </div>
                </div>
                {uploadSource === 'file' && (
                  <div className="w-5 h-5 rounded-full bg-[#131bb4] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
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
                className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  uploadSource === 'link'
                    ? 'border-[#131bb4] bg-white ring-1 ring-[#131bb4]/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${uploadSource === 'link' ? 'bg-indigo-50 text-[#131bb4]' : 'bg-slate-100 text-slate-400'}`}>
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Google Docs</h4>
                    <p className="text-xs text-slate-400">Shared view link</p>
                  </div>
                </div>
                {uploadSource === 'link' && (
                  <div className="w-5 h-5 rounded-full bg-[#131bb4] text-white flex items-center justify-center shrink-0">
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
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-indigo-400/80 bg-indigo-50/20 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px] transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 text-[#131bb4] flex items-center justify-center shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{uploadedFile.name}</p>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer mt-0.5 transition-colors underline"
                    >
                      Click to remove
                    </button>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ready to scan</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 bg-white min-h-[200px] ${
                    dragActive
                      ? 'border-[#131bb4] bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
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
                    <p className="text-sm font-bold text-slate-800">Drop your .docx here</p>
                    <p className="text-xs text-slate-400 mt-0.5">or click to browse · max 25 MB</p>
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
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  required={uploadSource === 'link'}
                  value={documentLink}
                  onChange={(e) => setDocumentLink(e.target.value)}
                  placeholder="https://docs.google.com/document/d/.../edit?usp=sharing"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm text-slate-800 focus:bg-white focus:border-[#131bb4] focus:outline-none transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ensure permissions are set to <strong className="text-slate-600">"Anyone with the link can view"</strong>.
              </p>
            </div>
          )}

          {/* 3. DOCUMENT TEMPLATE (OPTIONAL) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
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
                  <FileText className="w-4 h-4 text-[#131bb4] shrink-0" />
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
                className="border border-dashed border-slate-200 hover:border-[#131bb4] hover:bg-indigo-50/20 rounded-xl py-3 px-4 text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-[#131bb4]"
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
            className={`w-full font-bold text-sm sm:text-base py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all ${
              hasValidInput && !loading
                ? 'bg-[#131bb4] hover:bg-[#0e148e] text-white shadow-lg shadow-indigo-900/15 active:scale-[0.99] cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <span>{hasValidInput ? 'Start Scan' : 'Add a manuscript source above'}</span>
            {hasValidInput && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Right Column: "Before You Scan" & Steps Guide */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          {/* Top Banner Card */}
          <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-2xl p-5 text-left space-y-1">
            <span className="text-[10px] font-bold text-[#131bb4] uppercase tracking-wider font-mono">
              BEFORE YOU SCAN
            </span>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              A quick prep takes 60 seconds and avoids most scan errors.
            </p>
          </div>

          {/* Step 1: Prep your document */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left flex items-start gap-4 shadow-xs">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#131bb4] text-white font-bold text-xs flex items-center justify-center">
                1
              </div>
              <PenLine className="w-4 h-4 text-[#131bb4] mt-2.5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Prep your document</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ensure your chapter headings (e.g., "Chapter 1: Introduction") are clearly labeled so the engine can parse them correctly.
              </p>
            </div>
          </div>

          {/* Step 2: Check file limits */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left flex items-start gap-4 shadow-xs">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#131bb4] text-white font-bold text-xs flex items-center justify-center">
                2
              </div>
              <FileText className="w-4 h-4 text-[#131bb4] mt-2.5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Check file limits</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload a .docx file under 25 MB, or ensure your Google Docs link is set to "Anyone with the link can view".
              </p>
            </div>
          </div>

          {/* Step 3: Attach a template */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left flex items-start gap-4 shadow-xs">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#131bb4] text-white font-bold text-xs flex items-center justify-center">
                3
              </div>
              <LayoutGrid className="w-4 h-4 text-[#131bb4] mt-2.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Attach a template</h4>
                <span className="text-[10px] font-bold text-[#131bb4] bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 font-mono uppercase">
                  OPTIONAL
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                If your university uses a specific format, upload it below to improve AI chapter mapping accuracy.
              </p>
            </div>
          </div>

          {/* Bottom Disclaimer */}
          <div className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed pt-1 text-left">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p>
              Resync is a decision-support tool. Final judgment rests with your adviser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
