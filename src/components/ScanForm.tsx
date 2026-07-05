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
  isRescan?: boolean;
  initialUploadType?: 'chapter' | 'manuscript' | null;
  initialChaptersString?: string;
  initialDocumentLink?: string;
  prevScanTimestamp?: string;
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

export default function ScanForm({ 
  email, 
  onScanSuccess,
  isRescan = false,
  initialUploadType = null,
  initialChaptersString = '',
  initialDocumentLink = '',
  prevScanTimestamp = ''
}: ScanFormProps) {
  
  const parseChapters = (chapterStr?: string): number[] => {
    if (!chapterStr) return [];
    const match = chapterStr.match(/\d+/g);
    if (match) {
      return match.map(Number);
    }
    return [];
  };

  // Navigation Steps: 1 = Choose type, 2 = Select chapters, 3 = Upload docs
  const [step, setStep] = useState(isRescan ? 3 : 1);
  const [uploadType, setUploadType] = useState<'chapter' | 'manuscript' | null>(isRescan ? (initialUploadType || 'manuscript') : null);
  const [selectedChapters, setSelectedChapters] = useState<number[]>(isRescan ? parseChapters(initialChaptersString) : []);
  const [uploadSource, setUploadSource] = useState<'link' | 'file'>(isRescan ? 'file' : 'link');
  const [success, setSuccess] = useState(false);
  const [showRescanConfirmModal, setShowRescanConfirmModal] = useState(false);

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
  
  // Fields
  const [documentLink, setDocumentLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const [supportingSource, setSupportingSource] = useState<'link' | 'file'>('link');
  const [supportingLink, setSupportingLink] = useState('');
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportingFileInputRef = useRef<HTMLInputElement>(null);

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

    let linkToSend = documentLink;
    if (uploadSource === 'file') {
      if (uploadedFile) {
        linkToSend = 'file://' + uploadedFile.name;
      }
    }

    // Format section category based on step selection
    let formattedCategory = 'Full Manuscript';
    if (uploadType === 'chapter') {
      formattedCategory = `Chapters: ${selectedChapters.join(', ')}`;
    }

    // Set topic to research topic, or default to uploaded file name if using file path
    const resolvedTopic = customTopic.trim() || (uploadSource === 'file' ? uploadedFile?.name : undefined);

    const supportingDocVal = supportingSource === 'file' 
      ? (supportingFile ? 'file://' + supportingFile.name : '') 
      : supportingLink;

    try {
      const response = await fetch('/api/scans/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          documentLink: linkToSend,
          chapterType: formattedCategory,
          customTopic: resolvedTopic,
          supportingDoc: supportingDocVal
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan manuscript.');
      }

      onScanSuccess(data.scan);
      setSuccess(true);
      setStep(1);
      setUploadType(null);
      setSelectedChapters([]);
      setDocumentLink('');
      setUploadedFile(null);
      setCustomTopic('');
      setSupportingLink('');
      setSupportingFile(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during scanning.');
    } finally {
      setLoading(false);
    }
  };


  // Helper to load sample credentials instantly
  const loadDemoSample = () => {
    setSuccess(false);
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
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm animate-fade-in space-y-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4 text-left">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-650">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-805">Manuscript Coherence Scan Engine</h2>
            <p className="text-xs sm:text-sm text-slate-450 mt-1">Fetch, analyze, and diagnose logical flow in seconds.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDemoSample}
          className="text-xs sm:text-sm text-indigo-600 font-bold hover:underline bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl transition-all self-start cursor-pointer hover:scale-102 active:scale-98 duration-100"
        >
          Load Interactive Demo Link
        </button>
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
          {/* Segmented Progress Bar */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-350 ${currentDisplayStep >= 1 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              {uploadType === 'chapter' && (
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-350 ${currentDisplayStep >= 2 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              )}
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-350 ${currentDisplayStep >= totalSteps ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 font-mono font-bold">
              <span className="text-indigo-600 uppercase tracking-wider">
                {currentDisplayStep === 1 && "1. Choose upload type"}
                {currentDisplayStep === 2 && uploadType === 'chapter' && "2. Select chapters"}
                {currentDisplayStep === totalSteps && `${totalSteps}. Upload document`}
              </span>
              <span className="text-slate-400">Step {currentDisplayStep} of {totalSteps}</span>
            </div>
          </div>

          {success && (
            <div className="flex items-start gap-3 bg-emerald-50 text-emerald-800 text-sm p-4 rounded-xl border border-emerald-100 animate-fade-in relative">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 pr-6 text-left">
                <span className="font-semibold block font-serif">Scan Completed Successfully</span>
                <p className="text-xs leading-relaxed text-slate-650">
                  Your manuscript has been successfully analyzed. You can view the report in the Dashboard or Results Archive.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setSuccess(false)}
                className="absolute top-4 right-4 text-emerald-650 hover:text-emerald-850 cursor-pointer"
                title="Close Notice"
              >
                <X className="w-4.5 h-4.5" />
              </button>
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

          {/* STEP 1: Choose upload type */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center md:text-left space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-805 font-serif">How would you like to upload your manuscript?</h3>
                <p className="text-sm sm:text-base text-slate-450">Select whether you want to scan individual sections or the entire draft.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => {
                    setUploadType('chapter');
                    setStep(2);
                  }}
                  className="bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-250/70 hover:border-indigo-500 hover:shadow-lg rounded-3xl p-8 text-center md:text-left cursor-pointer transition-all flex flex-col justify-between space-y-5 hover:scale-[1.02] duration-200"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-55 bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                    <Layers className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-850 font-serif">Per chapter</h4>
                    <p className="text-base text-slate-450 mt-2">Upload and scan one or more chapters</p>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    setUploadType('manuscript');
                    setStep(3);
                  }}
                  className="bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-255/70 hover:border-indigo-500 hover:shadow-lg rounded-3xl p-8 text-center md:text-left cursor-pointer transition-all flex flex-col justify-between space-y-5 hover:scale-[1.02] duration-200"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-55 bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-850 font-serif">Whole manuscript</h4>
                    <p className="text-base text-slate-450 mt-2">Upload and scan the full draft at once</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Chapters (Only for 'chapter' uploadType) */}
          {step === 2 && uploadType === 'chapter' && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center md:text-left space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-855 font-serif">Which chapters are you uploading?</h3>
                <p className="text-sm sm:text-base text-slate-450">Select one or more chapters to analyze compatibility.</p>
              </div>

              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = selectedChapters.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleChapter(num)}
                      className={`px-8 py-4 rounded-2xl border-2 text-base font-bold transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 duration-150 ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'bg-white border-slate-200 text-slate-650 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      {isSelected && <Check className="w-5 h-5" />}
                      Chapter {num}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-base font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-8 py-4 rounded-xl transition-all cursor-pointer hover:scale-102 active:scale-98 duration-100 text-left"
                >
                  &larr; Back
                </button>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-455 font-mono">
                    {selectedChapters.length} {selectedChapters.length === 1 ? 'chapter' : 'chapters'} selected
                  </span>
                  <button
                    type="button"
                    disabled={selectedChapters.length === 0}
                    onClick={() => setStep(3)}
                    className="text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-9 py-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98 duration-100 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* STEP 3: Upload Document */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-sm font-bold text-indigo-650 uppercase tracking-wide block font-mono">
                    Uploading
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-855 font-serif">
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
                  className={`flex items-center gap-2 px-6 py-4 text-base font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${
                    uploadSource === 'link'
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
                  className={`flex items-center gap-2 px-6 py-4 text-base font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${
                    uploadSource === 'file'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Word document</span>
                </button>
              </div>

              {/* Inputs section */}
              {uploadSource === 'link' ? (
                <div className="space-y-3 text-left">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Google Docs URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-5 h-5" />
                    </div>
                    <input
                      type="url"
                      required
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
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
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
                      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 ${
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

              {/* Supporting Documents tabbed inputs */}
              <div className="space-y-4 pt-5 border-t border-slate-100 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Supporting Documents (Optional)
                  </label>
                  
                  {/* Selector tabs for supporting doc source */}
                  <div className="flex bg-slate-100 rounded-xl p-0.5 self-start sm:self-auto border border-slate-200/40">
                    <button
                      type="button"
                      onClick={() => setSupportingSource('link')}
                      className={`px-4.5 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        supportingSource === 'link'
                          ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/30'
                          : 'text-slate-400 hover:text-slate-655'
                      }`}
                    >
                      Docs Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupportingSource('file')}
                      className={`px-4.5 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        supportingSource === 'file'
                          ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/30'
                          : 'text-slate-400 hover:text-slate-655'
                      }`}
                    >
                      Upload File
                    </button>
                  </div>
                </div>

                {supportingSource === 'link' ? (
                  <div className="relative animate-fade-in">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-5 h-5" />
                    </div>
                    <input
                      type="url"
                      value={supportingLink}
                      onChange={(e) => setSupportingLink(e.target.value)}
                      placeholder="https://drive.google.com/file/... or survey URL"
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-3 py-4 text-base text-slate-855 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    {supportingFile ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 flex items-center justify-between border-dashed">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-base font-bold text-slate-800 truncate font-serif">{supportingFile.name}</p>
                            <p className="text-xs text-slate-405">{(supportingFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSupportingFile(null)}
                          className="p-2 rounded-lg text-slate-450 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => supportingFileInputRef.current?.click()}
                        className="border border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/5 rounded-xl py-5 px-8 text-center cursor-pointer transition-all flex items-center justify-center gap-2.5"
                      >
                        <input
                          ref={supportingFileInputRef}
                          type="file"
                          accept=".docx,.pdf,.xlsx,.csv,.txt"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSupportingFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <Upload className="w-5 h-5 text-slate-450" />
                        <span className="text-sm font-bold text-slate-650">Select supporting file (survey, datasheet, PDF...)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3 Footer buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(uploadType === 'chapter' ? 2 : 1)}
                  className="text-base font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-8 py-4 rounded-xl transition-all cursor-pointer hover:scale-102 active:scale-98 duration-100 text-left"
                >
                  &larr; Back
                </button>
                
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base sm:text-lg px-9 py-4.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer group focus:outline-none shadow-md shadow-slate-900/10 hover:shadow-lg hover:scale-102 active:scale-98 duration-100"
                >
                  <span>Analyze manuscript</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>
          )}
          {/* Rescan Confirmation Modal */}
          {showRescanConfirmModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-w-md w-full p-6 relative space-y-6 text-left">
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
                    className={`text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer ${
                      modStatus.isModified 
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
