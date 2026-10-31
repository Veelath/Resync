import { useState, useEffect, useRef } from "react";
import type React from 'react';
import type { Screen, DisplayScan } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';
import type { Session } from '@supabase/supabase-js';
import { executeManuscriptScan } from '../services/api';
import './upload-motion.css';
import { UploadTour, uploadTourSeen } from './UploadTour';

type UploadMode = "file" | "link";

interface TemplateChapter {
  id: string;
  title: string;
  sections: string[];
}

const WORD_EXT_RE = /\.docx?$/i;
const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_MANUSCRIPT_BYTES = 25 * 1024 * 1024;
const MAX_TEMPLATE_BYTES = 100 * 1024;
const WORD_ACCEPT = ".doc,.docx," + WORD_MIME_TYPES.join(",");
const TEMPLATE_ACCEPT = WORD_ACCEPT + ",.txt,text/plain";

// Word documents only (.doc / .docx): checks the extension and, when the browser reports one, the MIME type.
function isWordFile(file: File): boolean {
  if (!WORD_EXT_RE.test(file.name)) return false;
  return !file.type || WORD_MIME_TYPES.includes(file.type);
}

async function parseDocxTemplate(file: File): Promise<TemplateChapter[]> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = Array.from(doc.body.children);

  const chapters: TemplateChapter[] = [];
  let chapterIndex = 0;

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || '';
    if (!text) continue;

    const isParagraphHeader = tag === 'p' && 
      (text.toUpperCase().startsWith('CHAPTER') || /^\d+\.\s/.test(text));

    if (tag === 'h1' || isParagraphHeader) {
      chapterIndex = chapters.length;
      const cleanTitle = text.replace(/^["'\s]+|["',\s]+$/g, '').trim();
      chapters.push({ id: `c${chapterIndex + 1}`, title: cleanTitle || text, sections: [] });
    } else if ((tag === 'h2' || tag === 'h3') && chapters.length > 0) {
      const sanitized = text.replace(/^["'\s]+|["',\s]+$/g, '').trim();
      if (sanitized) chapters[chapters.length - 1].sections.push(sanitized);
    }
  }

  return chapters.length > 0 ? chapters : [];
}

async function parseTextTemplate(file: File): Promise<TemplateChapter[]> {
  const headings = (await file.text())
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  return headings.length > 0 ? [{ id: 'c1', title: 'Template headings', sections: headings }] : [];
}

function buildTemplateToc(chapters: TemplateChapter[]): string[] | undefined {
  const headings = chapters.flatMap(chapter => chapter.sections);
  if (!headings.length) return undefined;
  return headings.some(heading => /^references|bibliography/i.test(heading))
    ? headings
    : [...headings, 'References'];
}

let lastScanError: string | null = null;

export function UploadScreen({ onNavigate, onBack, session, onScanComplete, onScanStart, onScanFailed }: { onNavigate: (s: Screen) => void; onBack: () => void; session?: Session | null; onScanComplete?: (result: DisplayScan, sourceFile: File | null) => void; onScanStart?: () => void; onScanFailed?: (message: string) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tourOpen, setTourOpen] = useState(() => !uploadTourSeen());
  const [mode, setMode] = useState<UploadMode>("file");
  const [drag, setDrag] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [scanError, setScanError] = useState<string | null>(lastScanError);
  const [isScanning, setIsScanning] = useState(false);
  
  const [customTemplateFile, setCustomTemplateFile] = useState<File | null>(null);
  const [templateParseError, setTemplateParseError] = useState<string | null>(null);
  const customTemplateInputRef = useRef<HTMLInputElement>(null);

  const [templateChapters, setTemplateChapters] = useState<TemplateChapter[]>([]);
  const [editingSection, setEditingSection] = useState<{ cIdx: number; sIdx: number } | null>(null);
  const [newSectionText, setNewSectionText] = useState("");
  const [addingToChapter, setAddingToChapter] = useState<number | null>(null);

  // Saved template state & notification
  const [hasSavedTemplate, setHasSavedTemplate] = useState<boolean>(false);
  const [templateNotification, setTemplateNotification] = useState<string | null>(null);
  const templateToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateToc = buildTemplateToc(templateChapters);

  // Check localStorage on mount / when returning to the template step
  useEffect(() => {
    try {
      const saved = localStorage.getItem("resync_saved_template");
      setHasSavedTemplate(Boolean(saved));
    } catch {
      setHasSavedTemplate(false);
    }
  }, [step]);

  // Clean up notification timer on unmount
  useEffect(() => {
    return () => {
      if (templateToastTimerRef.current) {
        clearTimeout(templateToastTimerRef.current);
      }
    };
  }, []);

  function showTemplateToast(msg: string) {
    if (templateToastTimerRef.current) {
      clearTimeout(templateToastTimerRef.current);
    }
    setTemplateNotification(msg);
    templateToastTimerRef.current = setTimeout(() => {
      setTemplateNotification(null);
    }, 2000);
  }

  function handleSaveTemplate() {
    if (!templateChapters.some(chapter => chapter.sections.length)) return;
    try {
      const existing = localStorage.getItem("resync_saved_template");
      if (existing) {
        const confirmed = window.confirm("Overwrite saved template?");
        if (!confirmed) return;
      }
      const dataToSave = {
        chapters: templateChapters,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("resync_saved_template", JSON.stringify(dataToSave));
      setHasSavedTemplate(true);
      showTemplateToast("Template saved.");
    } catch (e) {
      console.error("Failed to save template to localStorage:", e);
    }
  }

  function handleUseSavedTemplate() {
    try {
      const raw = localStorage.getItem("resync_saved_template");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object" || !Array.isArray(saved.chapters)) {
        return;
      }
      setTemplateChapters(saved.chapters);
      showTemplateToast("Saved template loaded.");
    } catch (e) {
      console.error("Failed to load saved template from localStorage:", e);
    }
  }

  function handleRemoveAllSections() {
    const ok = window.confirm("Remove all sections from all chapters? This cannot be undone.");
    if (!ok) return;
    setTemplateChapters(prev => prev.map(ch => ({ ...ch, sections: [] })));
    showTemplateToast("All sections removed.");
  }

  async function handleTemplateFileChange(file: File) {
    const isTextTemplate = /\.txt$/i.test(file.name);
    if (!isWordFile(file) && !isTextTemplate) {
      setCustomTemplateFile(null);
      setTemplateChapters([]);
      setTemplateParseError('Unsupported template file. Please upload a Word document (.doc or .docx) or a text file (.txt).');
      return;
    }
    if (file.size > MAX_TEMPLATE_BYTES) {
      setCustomTemplateFile(null);
      setTemplateChapters([]);
      setTemplateParseError('This template is larger than 100 KB. Please upload a smaller file.');
      return;
    }
    setCustomTemplateFile(file);
    setTemplateParseError(null);
    try {
      const parsed = isTextTemplate ? await parseTextTemplate(file) : await parseDocxTemplate(file);
      if (parsed.length === 0) {
        setTemplateParseError('No headings found in the template. No template will be sent.');
        setTemplateChapters([]);
      } else {
        setTemplateChapters(parsed);
      }
    } catch {
      setTemplateParseError('Could not parse the template file. No template will be sent.');
      setTemplateChapters([]);
    }
  }

  function acceptManuscriptFile(file: File) {
    lastScanError = null;
    if (!isWordFile(file)) {
      setUploadedFile(null);
      setScanError("Unsupported file type. Please upload a Word document (.doc or .docx) or paste a Google Docs link.");
      return;
    }
    if (file.size > MAX_MANUSCRIPT_BYTES) {
      setUploadedFile(null);
      setScanError("This file is larger than 25 MB. Please upload a smaller Word document.");
      return;
    }
    setScanError(null);
    setUploadedFile(file);
  }

  function handleResetTemplate() {
    setTemplateChapters([]);
    setCustomTemplateFile(null);
    setTemplateParseError(null);
    if (customTemplateInputRef.current) customTemplateInputRef.current.value = '';
  }

  async function handleScan() {
    if (!session?.user) { onNavigate("login"); return; }
    lastScanError = null;
    setScanError(null);
    setIsScanning(true);
    let navigatedToProcessing = false;
    try {
      if (mode === "file") {
        if (!uploadedFile) {
          throw new Error("Please select a manuscript file to upload.");
        }
        if (uploadedFile.size === 0) {
          throw new Error("The uploaded document appears to be empty or contains no extractable text.");
        }
        if (!isWordFile(uploadedFile)) {
          throw new Error("Unsupported file type. Please upload a Word document (.doc or .docx) or paste a Google Docs link.");
        }
        if (uploadedFile.size > MAX_MANUSCRIPT_BYTES) {
          throw new Error("This file is larger than 25 MB. Please upload a smaller Word document.");
        }
      } else if (mode === "link") {
        if (!link.trim() || !link.includes("docs.google.com")) {
          throw new Error("Please provide a valid Google Docs link.");
        }
      }

      onScanStart?.();
      onNavigate("processing");
      navigatedToProcessing = true;

      const result = await executeManuscriptScan({
        user_id: session.user.id,
        file: uploadedFile ?? undefined,
        doc_url: mode === "link" ? link : undefined,
        template_toc: templateToc,
        manuscript_title: (mode === 'file' && uploadedFile) ? uploadedFile.name.replace(/\.[^/.]+$/, '') : undefined,
      });
      if (onScanComplete) onScanComplete({ ...result, template_toc: templateToc }, mode === 'file' ? uploadedFile : null);
    } catch (e: any) {
      if (navigatedToProcessing) console.error(e);
      const errMsg = e?.message || "The scan could not be completed.";
      onScanFailed?.(errMsg);
      lastScanError = errMsg;
      setScanError(errMsg);
      setIsScanning(false);
      if (navigatedToProcessing) {
        onNavigate("upload");
      }
    }
  }

  function handleRemoveSection(cIdx: number, sIdx: number) {
    setTemplateChapters(prev => prev.map((ch, i) => i === cIdx ? { ...ch, sections: ch.sections.filter((_, si) => si !== sIdx) } : ch));
  }

  function handleAddSectionSubmit(cIdx: number) {
    if (!newSectionText.trim()) { setAddingToChapter(null); return; }
    setTemplateChapters(prev => prev.map((ch, i) => i === cIdx ? { ...ch, sections: [...ch.sections, newSectionText.trim()] } : ch));
    setNewSectionText("");
    setAddingToChapter(null);
  }

  function handleUpdateSection(cIdx: number, sIdx: number, val: string) {
    setTemplateChapters(prev => prev.map((ch, i) => i === cIdx ? { ...ch, sections: ch.sections.map((s, si) => si === sIdx ? val : s) } : ch));
  }

  return (
    <div className="min-h-full bg-white upload-motion" style={{ ["--um-brand" as string]: B }}>
      <UploadTour open={tourOpen} onStepChange={setStep} onClose={() => setTourOpen(false)} />
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => step === 2 ? setStep(1) : onBack()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              {step === 2 ? "Back to Step 1" : "Back"}
            </button>

          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="ut-replay" onClick={() => setTourOpen(true)}>Replay tour</button>
            <span className="text-xs font-semibold px-3 py-1 rounded-full tabular-nums" style={{ background: BL, color: B }}>
              Step {step} of 2: {step === 1 ? "Chapter Template" : "Manuscript"}
            </span>
          </div>
        </div>
      </nav>

      {/* page body */}
      <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20 py-10">

        {/* Step Progress Bar */}
        <div data-tour="progress" className="mb-8 p-3 sm:p-4 rounded-2xl border border-gray-100 bg-gray-50/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div role="button" tabIndex={0} aria-label="Go to Step 1: Chapter Template" className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer rounded-xl p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={() => setStep(1)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStep(1); } }}>
            <div key={`b1-${step}`} className={`um-badge is-active w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all shadow-sm`}
              style={{ background: step === 1 ? B : "#16a34a" }}>
              {step > 1 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
              ) : "1"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900">1. Chapter Template (Optional)</p>
              <p className="text-[11px] text-gray-400">Attach, edit or use saved headings</p>
            </div>
          </div>
          <div className={`um-line hidden sm:block flex-1 h-0.5 max-w-[80px] ${step >= 2 ? "is-done" : ""}`} />
          <div role="button" tabIndex={0} aria-label="Go to Step 2: Upload Manuscript" className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer rounded-xl p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={() => setStep(2)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStep(2); } }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm"
              style={{ background: step === 2 ? B : "#f3f4f6", color: step === 2 ? "white" : "#9ca3af" }}>
              2
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold" style={{ color: step === 2 ? "#111827" : "#6b7280" }}>2. Upload Manuscript</p>
              <p className="text-[11px] text-gray-400">Upload .doc/.docx or add Google Docs link</p>
            </div>
          </div>
          <div className="um-line hidden sm:block flex-1 h-0.5 max-w-[80px]" />
          <div className="flex items-center gap-2 sm:gap-3 opacity-60">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-400">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600">3. Coherence Scan</p>
              <p className="text-[11px] text-gray-400">Then review your report</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            STEP 2: MANUSCRIPT INTAKE
        ════════════════════════════════════════════════════════════════ */}
        {step === 2 ? (
          <div key="step2" className="um-panel">
            <div className="mb-8">
              <p className="text-xs mono font-bold uppercase tracking-widest mb-1.5" style={{ color: B }}>Step 2 · Manuscript Intake</p>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Upload manuscript</h1>
              <p className="text-gray-500 text-sm">Upload a Word document or add a Google Docs link. ReSync uses your template headings if you chose them in Step 1; otherwise it detects sections.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
              <div className="space-y-7">

                {/* Manuscript Source */}
                <div data-tour="source">
                  <label className="text-xs mono font-bold uppercase tracking-widest text-gray-500 block mb-3">Manuscript Source</label>
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    {([
                      [
                        "file",
                        <svg key="file-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
                        "Upload Word file",
                        ".doc, .docx  max 25\u00A0MB"
                      ],
                      [
                        "link",
                        <svg key="link-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
                        "Google Docs",
                        "Shared view link"
                      ]
                    ] as [UploadMode, React.ReactNode, string, string][]).map(([m, icon, label, sub]) => (
                      <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); lastScanError = null; setScanError(null); }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-colors duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${mode === m ? "bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                        style={{ borderColor: mode === m ? B : undefined }}>
                        <span className="shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold" style={{ color: mode === m ? B : "#1f2937" }}>{label}</div>
                          <div className="text-xs text-gray-400">{sub}</div>
                        </div>
                        {mode === m && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: B }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Input Dropzone */}
                  {mode === "file" ? (
                    <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) acceptManuscriptFile(f); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`um-drop ${drag ? "is-drag" : ""} ${uploadedFile ? "has-file" : ""} flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all bg-gray-50/40 hover:bg-gray-50`}
                      style={{ borderColor: drag || uploadedFile ? B : "#e5e7eb", background: drag || uploadedFile ? BL : undefined }}>
                      <input ref={fileInputRef} type="file" accept={WORD_ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) acceptManuscriptFile(f); e.target.value = ""; }} />
                      {uploadedFile ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: BL, border: `1px solid ${B}20` }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" style={{ color: B }}><path d="M9 12h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-800">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Click to remove or replace file</p>
                          </div>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-3 py-1 rounded-full">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M5 12l5 5L20 7" /></svg>Manuscript attached
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="um-float w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-700">Drop your .doc or .docx file here</p>
                            <p className="text-xs text-gray-400 mt-1">or click to browse from device · max 25 MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                        </div>
                        <input type="url" value={link} onChange={e => { setLink(e.target.value); lastScanError = null; setScanError(null); }} placeholder="https://docs.google.com/document/d/..."
                          className="w-full h-12 pl-11 pr-4 rounded-xl border-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none transition-all"
                          style={{ borderColor: link ? B : "#e5e7eb" }}
                          onFocus={e => (e.target.style.borderColor = B)} onBlur={e => (e.target.style.borderColor = link ? B : "#e5e7eb")} />
                      </div>
                      <p className="text-xs text-gray-400">Must be set to <span className="font-semibold text-gray-600">"Anyone with the link can view"</span></p>
                    </div>
                  )}
                </div>

                {/* Scan button */}
                <div data-tour="run" className="space-y-3">
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={handleScan}
                    className="um-cta w-full h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 text-white"
                    style={{
                      background: isScanning ? "#9ca3af" : `linear-gradient(135deg, ${B}, ${BH})`,
                      cursor: isScanning ? "not-allowed" : "pointer",
                      boxShadow: isScanning ? "none" : `0 8px 24px ${B}30`
                    }}
                  >
                    {isScanning ? "Scanning manuscript…" : "Run Coherence Scan (1 Credit) →"}
                  </button>
                  {scanError && (
                    <div role="alert" className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <p className="flex-1 leading-snug font-medium">{scanError}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Prep guide */}
              <div className="um-stagger lg:sticky lg:top-24 space-y-3">
                <div className="rounded-2xl p-5" style={{ background: BL, border: `1px solid ${B}18` }}>
                  <p className="text-[10px] mono font-bold uppercase tracking-widest mb-1" style={{ color: `${B}99` }}>Scan preparation</p>
                  <p className="text-sm font-bold text-gray-800 leading-snug">Clear chapter headings help ReSync check cross-chapter coherence.</p>
                </div>

                {[
                  {
                    n: "1",
                    title: "Chapter template (optional)",
                    body: "In Step 1, attach, edit or load saved headings. You can skip to use detected headings.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
                  },
                  {
                    n: "2",
                    title: "Upload manuscript",
                    body: ".doc or .docx under 25 MB, or Google Docs set to 'Anyone with the link can view'.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>,
                  },
                  {
                    n: "3",
                    title: "Run coherence scan",
                    body: "Start the scan, then review your report when it is ready.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
                  },
                ].map(({ n, title, body, icon }) => (
                  <div key={n} className="bg-white rounded-2xl p-4 flex gap-3.5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-white" style={{ background: `linear-gradient(135deg, ${B}, #4f55f5)` }}>
                        {n}
                      </div>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BL, color: B }}>
                        {icon}
                      </div>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[13px] font-bold text-gray-800">{title}</p>
                      <p className="text-[12px] text-gray-400 leading-relaxed mt-0.5">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
              STEP 1: OPTIONAL TEMPLATE
          ════════════════════════════════════════════════════════════════ */
          <div key="step1" className="um-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs mono font-bold uppercase tracking-widest" style={{ color: B }}>Step 1 · Chapter Template (Optional)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Optional chapter template</h1>
                <p className="text-gray-500 text-sm mt-1">Attach, edit or load a saved template if you need specific headings. Skip to use headings detected from your manuscript.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {templateNotification && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 animate-fade-in">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-emerald-600">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {templateNotification}
                  </span>
                )}
                {/* Button 1: Save Template */}
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!templateChapters.some(chapter => chapter.sections.length)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Template
                </button>

                {/* Button 2: Use Saved Template */}
                <button
                  type="button"
                  onClick={hasSavedTemplate ? handleUseSavedTemplate : undefined}
                  disabled={!hasSavedTemplate}
                  aria-disabled={!hasSavedTemplate}
                  title={!hasSavedTemplate ? "No saved template yet. Save one first." : undefined}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                    hasSavedTemplate
                      ? "border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                      : "cursor-not-allowed text-gray-300 border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                  Use Saved Template
                </button>

                {/* Button 3: Remove All Sections */}
                <button
                  type="button"
                  onClick={handleRemoveAllSections}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  Remove All Sections
                </button>

                {/* Button 4: Clear Template */}
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  Clear Template
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
              {/* Template chapters list */}
              <div className="space-y-4">
                {templateChapters.map((ch, cIdx) => (
                  <div key={ch.id} className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-gray-300 transition-all">
                    {/* Chapter header */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: B }}>
                          {cIdx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900">{ch.title}</h3>
                      </div>
                      <span className="text-[11px] font-medium text-gray-400 mono">
                        {ch.sections.length} sections
                      </span>
                    </div>

                    {/* Section pills / editable chips */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {ch.sections.map((sec, sIdx) => {
                        const isEditing = editingSection?.cIdx === cIdx && editingSection?.sIdx === sIdx;
                        return (
                          <div
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-gray-50/80 border-gray-200 text-gray-800 transition-colors hover:bg-gray-100/80"
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={sec}
                                onChange={e => handleUpdateSection(cIdx, sIdx, e.target.value)}
                                onBlur={() => setEditingSection(null)}
                                onKeyDown={e => { if (e.key === "Enter") setEditingSection(null); }}
                                className="bg-white border border-blue-400 rounded px-1.5 py-0.5 text-xs outline-none min-w-[120px]"
                              />
                            ) : (
                              <span
                                onClick={() => setEditingSection({ cIdx, sIdx })}
                                className="cursor-pointer hover:underline"
                                title="Click to edit heading"
                              >
                                {sec}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(cIdx, sIdx)}
                              className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                              title="Remove section"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                          </div>
                        );
                      })}

                      {/* Add section button / inline form */}
                      {addingToChapter === cIdx ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            autoFocus
                            placeholder="Section heading name…"
                            value={newSectionText}
                            onChange={e => setNewSectionText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleAddSectionSubmit(cIdx);
                              if (e.key === "Escape") setAddingToChapter(null);
                            }}
                            className="h-8 px-2.5 rounded-xl border border-blue-400 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSectionSubmit(cIdx)}
                            className="h-8 px-2.5 rounded-xl text-xs font-bold text-white"
                            style={{ background: B }}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingToChapter(null)}
                            className="h-8 px-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center justify-center"
                            aria-label="Cancel adding section"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setAddingToChapter(cIdx); setNewSectionText(""); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg>
                          Add section
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Optional institutional file override */}
                <div data-tour="template" className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">Have an institutional Word template file?</p>
                    <p className="text-gray-400 text-[11px]">You can optionally upload your school's syllabus or format document (.doc, .docx, or .txt).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => customTemplateInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors self-start sm:self-auto bg-white flex items-center gap-1.5"
                    style={{ borderColor: customTemplateFile ? B : "#d1d5db", color: customTemplateFile ? B : "#4b5563" }}
                  >
                    {customTemplateFile ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                        <span>{customTemplateFile.name}</span>
                      </>
                    ) : "+ Attach template (.doc, .docx, .txt) (Optional)"}
                  </button>
                  {templateParseError && (
                    <p className="text-[10px] text-amber-600 max-w-[200px] text-right">{templateParseError}</p>
                  )}
                  <input
                    ref={customTemplateInputRef}
                    type="file"
                    accept={TEMPLATE_ACCEPT}
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleTemplateFileChange(f);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Template navigation */}
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { handleResetTemplate(); setStep(2); }}
                    className="w-full sm:w-auto px-5 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Skip, use detected headings
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="um-cta w-full sm:flex-1 h-12 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${B}, ${BH})`,
                      boxShadow: `0 8px 24px ${B}30`
                    }}
                  >
                    Continue to Upload Manuscript (Step 2) →
                  </button>
                </div>
              </div>

              {/* Right column: Summary Card */}
              <div className="um-stagger lg:sticky lg:top-24 space-y-4">
                <div className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm space-y-4">
                  <div>
                    <p className="text-[10px] mono font-bold uppercase tracking-widest text-gray-400 mb-1">Scan Configuration</p>
                    <h4 className="text-sm font-bold text-gray-900">Template Summary</h4>
                  </div>
                  <div className="space-y-2.5 text-xs border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Template:</span>
                      <span className="font-bold" style={{ color: B }}>{templateChapters.length ? "Custom" : "Auto-detect"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Template headings:</span>
                      <span className="font-semibold text-gray-800">{templateToc?.length ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Credit Cost:</span>
                      <span className="font-bold text-emerald-600">1 Credit</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-4 bg-amber-50/70 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                  <p className="font-bold text-amber-900 mb-1">Template Customization Tip</p>
                  {templateChapters.length
                    ? "Click a heading pill to rename it. ReSync will compare your sections across the whole manuscript."
                    : "No template selected. ReSync will detect sections from the manuscript."}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
