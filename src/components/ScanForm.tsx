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
  ArrowRight,
  Sparkles
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
  const [styleGuideDragActive, setStyleGuideDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

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

  const handleStyleGuideDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setStyleGuideDragActive(true);
    } else if (e.type === "dragleave") {
      setStyleGuideDragActive(false);
    }
  };

  const handleStyleGuideDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStyleGuideDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setStyleGuideFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleProceedToStep2 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (uploadSource === 'file') {
      if (!uploadedFile) {
        setError('Please select or upload a Word document (.docx).');
        return;
      }
    } else {
      if (!documentLink.trim()) {
        setError('Please provide a Google Docs link.');
        return;
      }
    }
    setError('');
    setCurrentStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    initAudio();

    if (scanCredits < 1) {
      setShowTopUpModal(true);
      return;
    }

    if (uploadSource === 'file') {
      if (!uploadedFile) {
        setError('Please select or upload a Word document.');
        setCurrentStep(1);
        return;
      }
    } else {
      if (!documentLink.trim()) {
        setError('Please provide a Google Docs link.');
        setCurrentStep(1);
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

    const isFile = uploadSource === 'file' && !!uploadedFile;
    const formattedCategory = 'Full Manuscript';
    const resolvedTopic = customTopic.trim() || (isFile ? uploadedFile?.name : undefined);
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
        doc_url: isFile ? undefined : documentLink.trim(),
        file: isFile ? uploadedFile! : undefined,
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

      {/* 2-Step Progress Indicator */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentStep === 1
              ? 'bg-[#131bb4] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            currentStep === 1 ? 'bg-white text-[#131bb4]' : (hasValidInput ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600')
          }`}>
            {hasValidInput && currentStep === 2 ? '✓' : '1'}
          </span>
          <span>Upload Manuscript</span>
        </button>

        <div className="w-6 h-[2px] bg-slate-200" />

        <button
          type="button"
          onClick={() => {
            if (hasValidInput) setCurrentStep(2);
            else setError('Please upload or connect a manuscript before proceeding.');
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentStep === 2
              ? 'bg-[#131bb4] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            currentStep === 2 ? 'bg-white text-[#131bb4]' : (styleGuideFile ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500')
          }`}>
            {styleGuideFile ? '✓' : '2'}
          </span>
          <span>Document Template</span>
          <span className="text-[10px] font-normal opacity-75">(Optional)</span>
        </button>
      </div>

      {/* Main Title Section (Dynamic per step) */}
      <div className="space-y-1 mb-8">
        <span className="text-[11px] font-bold text-[#131bb4] uppercase tracking-wider font-mono">
          {currentStep === 1 ? 'STEP 1 OF 2 · MANUSCRIPT INTAKE' : 'STEP 2 OF 2 · DOCUMENT TEMPLATE (OPTIONAL)'}
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {currentStep === 1 ? 'Upload your manuscript' : 'Attach document template'}
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          {currentStep === 1
            ? 'Upload your thesis document in Word (.docx) format or connect a Google Docs link.'
            : 'Optional: Upload your university guidelines so Resync can calibrate section mappings.'}
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

      {/* STEP 1: UPLOAD MANUSCRIPT */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Left Column: Form Controls */}
          <form onSubmit={handleProceedToStep2} className="lg:col-span-7 xl:col-span-7 space-y-5">
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
                        <span>Ready to proceed</span>
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

            {/* Optional Topic / Title Override */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Manuscript Title <span className="font-normal lowercase text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Predictors of Academic Burnout Among STEM Undergraduates"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:border-[#131bb4] focus:outline-none"
              />
            </div>

            {/* STEP 1 NAVIGATION BUTTONS */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={!hasValidInput}
                className={`w-full font-bold text-sm sm:text-base py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  hasValidInput
                    ? 'bg-[#131bb4] hover:bg-[#0e148e] text-white shadow-lg shadow-indigo-900/15 active:scale-[0.99] cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                <span>Continue to Document Template</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {hasValidInput && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-[#131bb4] py-1.5 transition-colors cursor-pointer text-center"
                >
                  Or skip template and start scan now (1 credit) →
                </button>
              )}
            </div>
          </form>

          {/* Right Column: Steps & Guidance */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4">
            <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-2xl p-5 text-left space-y-1">
              <span className="text-[10px] font-bold text-[#131bb4] uppercase tracking-wider font-mono">
                BEFORE YOU SCAN
              </span>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                A quick prep takes 60 seconds and avoids most scan errors.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left flex items-start gap-4 shadow-2xs">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-6 h-6 rounded-full bg-[#131bb4] text-white font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <PenLine className="w-4 h-4 text-[#131bb4] mt-2.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Prep your document</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ensure chapter headings (e.g. "Chapter 1: Introduction") are labeled clearly so the engine maps sections accurately.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left flex items-start gap-4 shadow-2xs">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-6 h-6 rounded-full bg-[#131bb4] text-white font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <FileText className="w-4 h-4 text-[#131bb4] mt-2.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Check file limits</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a .docx file under 25 MB, or ensure Google Docs permission is "Anyone with the link can view".
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed pt-1 text-left">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p>
                Resync is a decision-support tool. Final judgment rests with your thesis adviser.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DOCUMENT TEMPLATE (OPTIONAL) */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Left Column: Dedicated Template Dropzone & Actions */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#131bb4] font-bold">
                    STEP 2 · ATTACH TEMPLATE
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 border border-slate-200 rounded-full px-2.5 py-0.5">
                    Optional
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                  Institutional Thesis Guideline
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Upload your school's official chapter template (.docx, .pdf, .txt) so Resync maps custom chapter structures and terminology accurately.
                </p>
              </div>

              {/* Template Dropzone */}
              {styleGuideFile ? (
                <div className="bg-slate-50 border border-indigo-200 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#131bb4] flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{styleGuideFile.name}</p>
                      <p className="text-xs text-slate-400">{(styleGuideFile.size / 1024).toFixed(1)} KB · Template attached</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStyleGuideFile(null)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-white transition-colors cursor-pointer shrink-0"
                    title="Remove template"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleStyleGuideDrag}
                  onDragOver={handleStyleGuideDrag}
                  onDragLeave={handleStyleGuideDrag}
                  onDrop={handleStyleGuideDrop}
                  onClick={() => styleGuideFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 bg-white min-h-[180px] ${
                    styleGuideDragActive
                      ? 'border-[#131bb4] bg-indigo-50/20'
                      : 'border-slate-200 hover:border-[#131bb4] hover:bg-indigo-50/10'
                  }`}
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
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#131bb4] flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Drop template file here</p>
                    <p className="text-xs text-slate-400 mt-0.5">.docx, .pdf, or .txt · max 20 MB</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#131bb4]">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Browse template</span>
                  </span>
                </div>
              )}

              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  No template? That's completely fine. Skip this step and Resync will automatically apply standard academic thesis standards (IMRAD / 5-Chapter structure).
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full font-bold text-sm sm:text-base py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 bg-[#131bb4] hover:bg-[#0e148e] text-white shadow-lg shadow-indigo-900/15 cursor-pointer active:scale-[0.99] transition-all"
              >
                <span>{styleGuideFile ? 'Start Scan with Template (1 Credit)' : 'Skip & Start Scan (1 Credit)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-2 transition-colors cursor-pointer text-center"
              >
                ← Back to Manuscript Upload
              </button>
            </div>
          </div>

          {/* Right Column: Selected Document & Template Benefits */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4">
            {/* Selected Manuscript Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                  SELECTED MANUSCRIPT
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-[#131bb4] hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {uploadSource === 'file' ? (uploadedFile?.name || 'Uploaded File') : 'Google Docs Manuscript'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {uploadSource === 'file' && uploadedFile
                      ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB · .docx`
                      : 'Remote Google Document'}
                  </p>
                </div>
              </div>
            </div>

            {/* Why attach a template card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left space-y-3.5 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900">Why attach a template?</h4>
              
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Calibrates chapter structures:</strong>
                    <p className="text-slate-500 mt-0.5">Handles 3-chapter capstone or 5-chapter thesis formats without false warnings.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Custom section nomenclature:</strong>
                    <p className="text-slate-500 mt-0.5">Maps university-specific headings to standard academic sections.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Higher precision correlation:</strong>
                    <p className="text-slate-500 mt-0.5">Aligns specific institutional rubric expectations with conclusion claims.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed pt-1 text-left">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p>
                Credits are only deducted once the scan initiates successfully.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
