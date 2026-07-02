/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ScanResult } from '../types.js';
import { 
  Layers, 
  BookOpen,
  Link, 
  Compass, 
  HelpCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  AlertCircle,
  Check,
  Upload,
  FileText,
  X
} from 'lucide-react';

interface ScanFormProps {
  email: string;
  onScanSuccess: (scan: ScanResult) => void;
}

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
  // Navigation Steps: 1 = Choose type, 2 = Select chapters, 3 = Upload docs
  const [step, setStep] = useState(1);
  const [uploadType, setUploadType] = useState<'chapter' | 'manuscript' | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [uploadSource, setUploadSource] = useState<'link' | 'file'>('link');
  
  // Fields
  const [documentLink, setDocumentLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleChapter = (chapterNum: number) => {
    if (selectedChapters.includes(chapterNum)) {
      setSelectedChapters(selectedChapters.filter(n => n !== chapterNum));
    } else {
      setSelectedChapters([...selectedChapters, chapterNum].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let linkToSend = documentLink;
    if (uploadSource === 'file') {
      if (!uploadedFile) {
        setError('Please select or upload a Word document.');
        return;
      }
      // Store file protocol so results details can distinguish it from a live Google Doc URL
      linkToSend = 'file://' + uploadedFile.name;
    } else {
      if (!documentLink) {
        setError('Please provide a Google Docs link.');
        return;
      }
    }

    setLoading(true);
    setError('');

    // Format section category based on step selection
    let formattedCategory = 'Full Manuscript';
    if (uploadType === 'chapter') {
      formattedCategory = `Chapters: ${selectedChapters.join(', ')}`;
    }

    // Set topic to research topic, or default to uploaded file name if using file path
    const resolvedTopic = customTopic.trim() || (uploadSource === 'file' ? uploadedFile?.name : undefined);

    try {
      const response = await fetch('/api/scans/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          documentLink: linkToSend,
          chapterType: formattedCategory,
          customTopic: resolvedTopic
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
    setUploadType('chapter');
    setSelectedChapters([1, 3, 4]);
    setUploadSource('link');
    setDocumentLink('https://docs.google.com/document/d/1B_8_DemoAcademicManuscriptEdgeWearables/edit?usp=sharing');
    setCustomTopic('Edge Heart Wearable anomaly detection');
    setStep(3);
  };

  // Steps counts
  const totalSteps = uploadType === 'chapter' ? 3 : 2;
  const currentDisplayStep = uploadType === 'chapter' 
    ? step 
    : (step === 3 ? 2 : step);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm animate-fade-in space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-650">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-slate-805">Manuscript Coherence Scan Engine</h2>
            <p className="text-[11px] text-slate-400">Fetch, analyze, and diagnose logical flow in seconds.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDemoSample}
          className="text-xs text-indigo-600 font-semibold hover:underline bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg transition-all self-start cursor-pointer"
        >
          Load Interactive Demo Link
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100/50 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative" />
          </div>
          
          <div className="space-y-1.5 max-w-sm">
            <h3 className="font-serif text-base font-bold text-slate-850 animate-pulse">Analyzing Coherence...</h3>
            <p className="text-xs text-indigo-600 font-medium font-mono min-h-[30px] px-4 transition-all">
              {ANALYSIS_STEPS[stepIndex]}
            </p>
            <p className="text-[10px] text-slate-400">
              Our AI is auditing logical consistency and citation maps. This may take up to 20 seconds.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Segmented Progress Bar */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className={`h-1 flex-1 rounded-full transition-all duration-350 ${currentDisplayStep >= 1 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              {uploadType === 'chapter' && (
                <div className={`h-1 flex-1 rounded-full transition-all duration-350 ${currentDisplayStep >= 2 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              )}
              <div className={`h-1 flex-1 rounded-full transition-all duration-350 ${currentDisplayStep >= totalSteps ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-450 font-mono">
              <span className="font-bold text-indigo-600 uppercase">
                {currentDisplayStep === 1 && "1. Choose upload type"}
                {currentDisplayStep === 2 && uploadType === 'chapter' && "2. Select chapters"}
                {currentDisplayStep === totalSteps && `${totalSteps}. Upload document`}
              </span>
              <span className="text-slate-400">Step {currentDisplayStep} of {totalSteps}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 text-rose-800 text-xs p-3.5 rounded-lg border border-rose-100 animate-fade-in">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Scan Notice</span>
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Choose upload type */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center md:text-left space-y-1">
                <h3 className="text-sm font-bold text-slate-800">How would you like to upload your manuscript?</h3>
                <p className="text-xs text-slate-400">Select whether you want to scan individual sections or the entire draft.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => {
                    setUploadType('chapter');
                    setStep(2);
                  }}
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 hover:border-indigo-500 hover:shadow-md rounded-2xl p-6 text-center md:text-left cursor-pointer transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Per chapter</h4>
                    <p className="text-xs text-slate-400 mt-1">Upload and scan one or more chapters</p>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    setUploadType('manuscript');
                    setStep(3);
                  }}
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 hover:border-indigo-500 hover:shadow-md rounded-2xl p-6 text-center md:text-left cursor-pointer transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Whole manuscript</h4>
                    <p className="text-xs text-slate-400 mt-1">Upload and scan the full draft at once</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Chapters (Only for 'chapter' uploadType) */}
          {step === 2 && uploadType === 'chapter' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center md:text-left space-y-1">
                <h3 className="text-sm font-bold text-slate-800 font-serif">Which chapters are you uploading?</h3>
                <p className="text-xs text-slate-400">Select one or more chapters to analyze compatibility.</p>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = selectedChapters.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleChapter(num)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                          : 'bg-white border-slate-200 text-slate-650 hover:border-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      Chapter {num}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  &larr; Back
                </button>
                
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-slate-450 font-mono">
                    {selectedChapters.length} {selectedChapters.length === 1 ? 'chapter' : 'chapters'} selected
                  </span>
                  <button
                    type="button"
                    disabled={selectedChapters.length === 0}
                    onClick={() => setStep(3)}
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Upload Document */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide block font-mono">
                    Uploading
                  </span>
                  <h3 className="text-sm font-bold text-slate-805">
                    {uploadType === 'chapter' 
                      ? `Chapters ${selectedChapters.join(', ')}`
                      : 'Full manuscript draft'}
                  </h3>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setUploadSource('link')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${
                    uploadSource === 'link'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Google Docs link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadSource('file')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${
                    uploadSource === 'file'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Word document</span>
                </button>
              </div>

              {/* Inputs section */}
              {uploadSource === 'link' ? (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Google Docs URL
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
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-850 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Note: Make sure your document is set to <strong className="text-slate-500 font-semibold">"Anyone with the link can view"</strong> so our engine can fetch its text.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Upload Word Document (.docx)
                  </label>
                  
                  {uploadedFile ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold text-slate-800 truncate">{uploadedFile.name}</p>
                          <p className="text-[10px] text-slate-405">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-all cursor-pointer"
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
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                        dragActive 
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
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Drag your .docx here or click to browse</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Word documents only, up to 25 MB</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Research theme description field */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Research Theme or Focus (Optional)
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Edge intelligence for wearable telemetry and healthcare monitoring"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
                />
              </div>

              {/* Step 3 Footer buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(uploadType === 'chapter' ? 2 : 1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  &larr; Back
                </button>
                
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer group focus:outline-none"
                >
                  <span>Analyze manuscript</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
