import { useState, useEffect, useRef, Fragment } from "react";
import type React from 'react';
import type { Screen, DisplayScan } from '../lib/appTypes';
import { B, BH, BL } from '../lib/brand';
import type { Session } from '@supabase/supabase-js';
import { executeManuscriptScan, getCreditBalance, getManuscriptOutline, downloadGoogleDoc, type ManuscriptOutline } from '../services/api';
import './upload-motion.css';
import './upload-flow.css';
import { UploadTour, uploadTourSeen } from './UploadTour';
import { DocxManuscript } from './results/DocxManuscript';

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
import { isDocx, DOCX_MESSAGE } from '../lib/scanWait';
import { slimDocx } from '../lib/slimDocx';

const MAX_MANUSCRIPT_BYTES = 25 * 1024 * 1024;
const MAX_TEMPLATE_BYTES = 100 * 1024;
const WORD_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TEMPLATE_ACCEPT = ".doc,.docx," + WORD_MIME_TYPES.join(",") + ",.txt,text/plain";

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

interface DocInfo {
  title: string;
  excerpt: string[];
  words: number;
  pages: number;
  looksStructured: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// A quick look inside a Word file for the confirm step: what it starts with, how long it is, whether it has headings.
async function readDocInfo(file: File): Promise<DocInfo | null> {
  try {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const paragraphs = value.split(/\n+/).map(line => line.trim()).filter(Boolean);
    if (!paragraphs.length) return null;
    const words = value.split(/\s+/).filter(Boolean).length;
    const first = paragraphs[0];
    const hasTitle = first.length <= 90 && !/[.!?]$/.test(first);
    const body = hasTitle ? paragraphs.slice(1) : paragraphs;
    const excerpt: string[] = [];
    let used = 0;
    for (const paragraph of body) {
      if (paragraph.length < 40 && excerpt.length === 0) continue;
      const clipped = paragraph.length > 420 ? `${paragraph.slice(0, 420).trimEnd()}…` : paragraph;
      excerpt.push(clipped);
      used += clipped.length;
      if (used > 1100 || excerpt.length >= 6) break;
    }
    const headingLike = paragraphs.filter(line => line.length <= 80 && /^(chapter\s+\w+|\d+(\.\d+)*\.?\s+[A-Z]|introduction|related (literature|studies)|review of|methodology|methods|results|discussion|conclusion|references)/i.test(line)).length;
    return { title: hasTitle ? first : "", excerpt, words, pages: Math.max(1, Math.ceil(words / 275)), looksStructured: headingLike >= 3 };
  } catch {
    return null;
  }
}

let lastScanError: string | null = null;

export function UploadScreen({ onNavigate, onBack, session, onScanComplete, onScanStart, onScanStarted, onScanFailed }: { onNavigate: (s: Screen) => void; onBack: () => void; session?: Session | null; onScanComplete?: (result: DisplayScan, sourceFile: File | null) => void; onScanStart?: (words: number | null) => void; onScanStarted?: (analysisRunId: string) => void; onScanFailed?: (error: unknown) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const [docInfo, setDocInfo] = useState<DocInfo | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // The sections the scan will compare, read by the backend so they match what the scan sees.
  const [outline, setOutline] = useState<ManuscriptOutline | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  // A document with no research-paper structure is not scanned (a school template can supply its own headings, so it is let through).
  const notAPaper = outline?.looks_like_paper === false && !templateChapters.some(chapter => chapter.sections.length);
  const [pagesState, setPagesState] = useState<"idle" | "failed">("idle");
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [linkDraft, setLinkDraft] = useState("");
  useEffect(() => { setLinkDraft(link); }, [link, step]);

  // A Google Doc is downloaded as a Word file the moment a valid link is in, so a link then behaves exactly like an upload:
  // same preview, same sections, same scan, same highlighted report.
  const [linkFile, setLinkFile] = useState<File | null>(null);
  const [linkState, setLinkState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [linkProblem, setLinkProblem] = useState<string | null>(null);
  const downloads = useRef(new Map<string, Promise<File>>());
  const googleLink = (url: string) => /docs\.google\.com\/document\/d\/[\w-]{10,}/.test(url);
  useEffect(() => {
    setLinkFile(null);
    setLinkProblem(null);
    const url = link.trim();
    if (mode !== "link" || !session?.user || !googleLink(url)) { setLinkState("idle"); return; }
    let cancelled = false;
    setLinkState("loading");
    const timer = setTimeout(() => {
      let request = downloads.current.get(url);
      if (!request) {
        request = downloadGoogleDoc(url).then(slimDocx);
        request.catch(() => downloads.current.delete(url));
        downloads.current.set(url, request);
      }
      request.then(file => { if (!cancelled) { setLinkFile(file); setLinkState("ready"); } })
        .catch(error => { if (!cancelled) { setLinkState("failed"); setLinkProblem(error instanceof Error ? error.message : "We could not open this Google Doc."); } });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mode, link, session?.user]); // eslint-disable-line react-hooks/exhaustive-deps
  // Whichever document is in play: the uploaded Word file, or the Google Doc downloaded as one.
  const activeFile = mode === "file" ? uploadedFile : linkFile;

  // Seconds spent waiting for the document, so a slow Google reply does not look like a frozen page.
  const [outlineSeconds, setOutlineSeconds] = useState(0);
  useEffect(() => {
    if (!outlineLoading && linkState !== "loading") { setOutlineSeconds(0); return; }
    const timer = setInterval(() => setOutlineSeconds(seconds => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [outlineLoading, linkState]);

  useEffect(() => {
    if (mode === "link" && linkState === "loading") return;
    if (!activeFile && step !== 3) return;
    const source = activeFile ?? (mode === "link" ? link.trim() : null);
    if (!source) { setOutline(null); return; }
    let cancelled = false;
    setOutlineLoading(true);
    setOutlineError(null);
    getManuscriptOutline(activeFile ? { file: activeFile } : { docUrl: link.trim() })
      .then(result => { if (!cancelled) setOutline(result); })
      .catch(error => { if (!cancelled) { setOutline(null); setOutlineError(error instanceof Error ? error.message : "We could not read this document."); } })
      .finally(() => { if (!cancelled) setOutlineLoading(false); });
    return () => { cancelled = true; };
  }, [mode, activeFile, link, linkState]);

  // A new file gets a fresh try at drawing the pages (the results page's own viewer does the drawing).
  useEffect(() => { setPagesState('idle'); }, [activeFile]);

  // Credits left, for the "credits after scan" line on the confirm step.
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    getCreditBalance(session.user.id).then(result => { if (!cancelled) setCreditBalance(result.balance); }).catch(() => { if (!cancelled) setCreditBalance(null); });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Read the chosen Word file once the person reaches the confirm step.
  useEffect(() => {
    if (step !== 3 || !activeFile) { setDocInfo(null); return; }
    let cancelled = false;
    setDocLoading(true);
    readDocInfo(activeFile).then(info => { if (!cancelled) { setDocInfo(info); setDocLoading(false); } });
    return () => { cancelled = true; };
  }, [step, activeFile]);

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
    if (!isDocx(file.name)) {
      setUploadedFile(null);
      setScanError(DOCX_MESSAGE);
      return;
    }
    setScanError(null);
    // Pictures are taken out first (they are not read), so a Word file full of images is judged by its size without them.
    slimDocx(file).then(slim => {
      if (slim.size > MAX_MANUSCRIPT_BYTES) {
        setUploadedFile(null);
        setScanError("This file is larger than 25 MB even without its pictures. Please upload a smaller Word document.");
        return;
      }
      setUploadedFile(slim);
    });
  }

  function handleResetTemplate() {
    setTemplateChapters([]);
    setCustomTemplateFile(null);
    setTemplateParseError(null);
    if (customTemplateInputRef.current) customTemplateInputRef.current.value = '';
  }

  async function handleScan() {
    if (notAPaper) return;
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
        if (!isDocx(uploadedFile.name)) {
          throw new Error(DOCX_MESSAGE);
        }
        if (uploadedFile.size > MAX_MANUSCRIPT_BYTES) {
          throw new Error("This file is larger than 25 MB. Please upload a smaller Word document.");
        }
      } else if (mode === "link") {
        if (!link.trim() || !link.includes("docs.google.com")) {
          throw new Error("Please provide a valid Google Docs link.");
        }
      }

      onScanStart?.(outline?.words ?? docInfo?.words ?? null);
      onNavigate("processing");
      navigatedToProcessing = true;

      // A Google Doc that downloaded as Word is scanned like an upload; only if it could not be downloaded is the link read directly.
      const scanFile = mode === "file" ? uploadedFile : linkFile;
      const result = await executeManuscriptScan({
        user_id: session.user.id,
        file: scanFile ?? undefined,
        doc_url: !scanFile && mode === "link" ? link : undefined,
        template_toc: templateToc,
        manuscript_title: scanFile ? scanFile.name.replace(/\.[^/.]+$/, '') : undefined,
      }, { onStarted: onScanStarted });
      if (onScanComplete) onScanComplete({ ...result, template_toc: templateToc }, scanFile ?? null);
    } catch (e: any) {
      if (navigatedToProcessing) console.error(e);
      const errMsg = e?.message || "The scan could not be completed.";
      onScanFailed?.(e);
      lastScanError = navigatedToProcessing ? null : errMsg;
      setScanError(navigatedToProcessing ? null : errMsg);
      setIsScanning(false);

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

  const stepMeta = [
    { n: 1, title: "1. Chapter Template (Optional)", sub: "Attach, edit or use saved headings" },
    { n: 2, title: "2. Upload Manuscript", sub: "Word file or Google Docs link" },
    { n: 3, title: "3. Confirm Document", sub: "Check it is the right file" },
    { n: 4, title: "4. Coherence Scan", sub: "Then review your report" },
  ];
  const stepName = ["Chapter Template", "Manuscript", "Confirm"][step - 1];
  const hasChapters = templateChapters.some(chapter => chapter.sections.length);
  const fileLabel = mode === "file" ? uploadedFile?.name ?? "" : linkFile?.name ?? link.replace(/^https?:\/\//, "");

  // Step 2 -> 3: make sure there is something to confirm.
  function continueToConfirm() {
    lastScanError = null;
    if (mode === "file" && !uploadedFile) { setScanError("Please select a manuscript file to upload."); return; }
    if (mode === "link" && (!link.trim() || !link.includes("docs.google.com"))) { setScanError("Please provide a valid Google Docs link."); return; }
    setScanError(null);
    setStep(3);
  }

  return (
    <div className="uf upload-motion" style={{ ["--um-brand" as string]: B }}>
      <UploadTour open={tourOpen} onStepChange={setStep} onClose={() => setTourOpen(false)} />
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e6e5f7]">
        <div className="w-full px-6 md:px-10 lg:px-16 h-16 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep((step - 1) as 1 | 2) : onBack()} className="flex items-center gap-1.5 text-sm text-[#5a5778] hover:text-[#0b0a2e] transition-colors font-semibold rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            {step > 1 ? `Back to Step ${step - 1}` : "Back"}
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="ut-replay" onClick={() => setTourOpen(true)}>Replay tour</button>
            <span className="uf-pill tabular-nums">Step {step} of 4: {stepName}</span>
          </div>
        </div>
      </nav>

      <div className="uf-wrap">
        {/* Four-step progress */}
        <div data-tour="progress" className="uf-card uf-stp" role="list">
          {stepMeta.map((meta, index) => {
            const state = meta.n === 4 ? "" : step === meta.n ? "is-on" : step > meta.n ? "is-done" : "";
            return (
              <Fragment key={meta.n}>
                {index > 0 && <div className={`uf-cn ${step > index ? "is-done" : ""}`} />}
                {meta.n === 4 ? (
                  <div className="uf-si" role="listitem" style={{ cursor: "default", opacity: 0.8 }}>
                    <span className="uf-sn">4</span>
                    <div><b>{meta.title}</b><span className="uf-st">{meta.sub}</span></div>
                  </div>
                ) : (
                  <button type="button" role="listitem" className={`uf-si ${state}`} aria-label={`Go to Step ${meta.n}: ${meta.title.slice(3)}`} aria-current={step === meta.n ? "step" : undefined}
                    onClick={() => { if (meta.n < 3 || fileLabel) setStep(meta.n as 1 | 2 | 3); }}>
                    <span className="uf-sn">
                      {step > meta.n ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg> : meta.n}
                    </span>
                    <div><b>{meta.title}</b><span className="uf-st">{meta.sub}</span></div>
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>

        {step === 1 && (
          <div key="step1" className="um-panel flex flex-col gap-[22px]">
            <div className="uf-head">
              <div>
                <div className="uf-eb">Step 1 · Chapter template (optional)</div>
                <h1 className="uf-h1">Optional chapter template</h1>
                <p className="uf-sub">Attach, edit or load a saved template if you need specific headings. Skip to use headings detected from your manuscript.</p>
              </div>
              <div className="uf-actions">
                {templateNotification && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 animate-fade-in">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-emerald-600"><polyline points="20 6 9 17 4 12" /></svg>
                    {templateNotification}
                  </span>
                )}
                <button type="button" onClick={handleSaveTemplate} disabled={!hasChapters} className="uf-btn is-ghost is-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                  Save template
                </button>
                <button type="button" onClick={handleUseSavedTemplate} disabled={!hasSavedTemplate} title={!hasSavedTemplate ? "No saved template yet. Save one first." : undefined} className="uf-btn is-ghost is-sm">Use saved template</button>
                <button type="button" onClick={handleRemoveAllSections} className="uf-btn is-ghost is-danger is-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  Remove all sections
                </button>
                <button type="button" onClick={handleResetTemplate} className="uf-btn is-ghost is-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  Clear
                </button>
              </div>
            </div>

            <div className="uf-grid">
              <div className="uf-col">
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
                <div data-tour="template" className="uf-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span className="uf-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></svg></span>
                    <div>
                      <b style={{ fontSize: 15.5 }}>Have an institutional Word template?</b>
                      <div style={{ fontSize: 13, color: "#6b6890" }}>Resync reads its headings so your report follows your school's format.</div>
                    </div>
                  </div>
                  <button type="button" className={`uf-dz ${customTemplateFile ? "has-file" : ""}`} onClick={() => customTemplateInputRef.current?.click()} style={{ font: "inherit", color: "inherit" }}>
                    <span className="uf-up um-float"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden="true"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></span>
                    <b style={{ fontSize: 16 }}>{customTemplateFile ? customTemplateFile.name : "Attach your school's template"}</b>
                    <span style={{ fontSize: 13.5, color: "#6b6890" }}>{customTemplateFile ? "Click to replace this file" : "Syllabus or format document · .doc, .docx or .txt"}</span>
                  </button>
                  {templateParseError && <p style={{ margin: 0, fontSize: 12.5, color: "#b7791f" }}>{templateParseError}</p>}
                  <input ref={customTemplateInputRef} type="file" accept={TEMPLATE_ACCEPT} className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleTemplateFileChange(f); e.target.value = ""; }} />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                  <button type="button" onClick={() => { handleResetTemplate(); setStep(2); }} className="uf-btn is-ghost is-lg" style={{ padding: "0 26px" }}>Skip, use detected headings</button>
                  <button type="button" onClick={() => setStep(2)} className="uf-btn is-lg is-grow um-cta">
                    Continue to upload manuscript
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                </div>
              </div>

              <div className="uf-col um-stagger">
                <div className="uf-card" style={{ padding: 22 }}>
                  <div className="uf-eb is-muted">Scan configuration</div>
                  <div style={{ fontSize: 19, fontWeight: 800, margin: "8px 0 6px" }}>Template summary</div>
                  <div className="uf-rows">
                    <div className="uf-row"><span>Template</span><b style={{ color: "#2b25c8" }}>{hasChapters ? "Custom" : "Auto-detect"}</b></div>
                    <div className="uf-row"><span>Chapters</span><b>{templateChapters.length} {templateChapters.length === 1 ? "chapter" : "chapters"}</b></div>
                    <div className="uf-row"><span>Total sections</span><b>{templateToc?.length ?? 0} headings</b></div>
                    <div className="uf-row"><span>Scan preview</span><b style={{ color: "#0b9f6e" }}>Free</b></div>
                  </div>
                </div>
                <div className="uf-tip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0012 2z" /></svg>
                  <div>
                    <b>Template tip</b>
                    {hasChapters ? "Click a heading pill to rename it. Resync will compare your sections across the whole manuscript." : "No template selected. Resync will detect sections from your manuscript."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="step2" className="um-panel flex flex-col gap-[22px]">
            <div>
              <div className="uf-eb">Step 2 · Manuscript intake</div>
              <h1 className="uf-h1">Upload manuscript</h1>
              <p className="uf-sub">Upload a Word document or add a Google Docs link. Resync uses your template headings if you chose them in Step 1; otherwise it detects sections.</p>
            </div>

            <div className="uf-grid">
              <div className="uf-col" style={{ gap: 14 }}>
                <div data-tour="source" className="uf-col" style={{ gap: 14 }}>
                  <div className="uf-eb is-muted">Manuscript source</div>
                  <div className="uf-src">
                    {([
                      ["file", "Upload Word file", ".docx · max 25 MB", "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"],
                      ["link", "Google Docs", "Shared view link", "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"],
                    ] as [UploadMode, string, string, string][]).map(([m, label, sub, icon]) => (
                      <button key={m} type="button" aria-pressed={mode === m} className={`uf-sc ${mode === m ? "is-on" : ""}`}
                        onClick={() => { setMode(m); lastScanError = null; setScanError(null); }}>
                        <span className="uf-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d={icon} /></svg></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b>{label}</b>
                          <div style={{ fontSize: 12, color: "#6b6890" }}>{sub}</div>
                        </div>
                        <i className="uf-rd" />
                      </button>
                    ))}
                  </div>

                  {mode === "file" ? (
                    <div role="button" tabIndex={0} aria-label="Choose your Word manuscript"
                      onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) acceptManuscriptFile(f); }}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                      className={`uf-dz um-drop ${drag ? "is-drag" : ""} ${uploadedFile ? "has-file" : ""}`}>
                      <input ref={fileInputRef} type="file" accept={WORD_ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) acceptManuscriptFile(f); e.target.value = ""; }} />
                      {uploadedFile ? (
                        <>
                          <span className="uf-up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></span>
                          <b style={{ fontSize: 16 }}>{uploadedFile.name}</b>
                          <span style={{ fontSize: 13, color: "#6b6890" }}>{formatBytes(uploadedFile.size)} · click to replace this file</span>
                        </>
                      ) : (
                        <>
                          <span className="uf-up um-float"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden="true"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></span>
                          <b style={{ fontSize: 16 }}>Drop your .docx file here</b>
                          <span style={{ fontSize: 13, color: "#6b6890" }}>or click to browse from device · max 25 MB</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="uf-card" style={{ minHeight: 190, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, padding: "20px 26px" }}>
                      <label className="uf-fld">
                        <span className="uf-lab">Google Docs link</span>
                        <span className="uf-inp">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                          <input type="url" value={link} onChange={e => { setLink(e.target.value); lastScanError = null; setScanError(null); }} placeholder="https://docs.google.com/document/d/…" />
                        </span>
                      </label>
                      <div style={{ display: "flex", gap: 10, fontSize: 13, color: "#6b6890", alignItems: "flex-start" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#2b25c8" strokeWidth="2" className="w-4 h-4 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                        Set sharing to “Anyone with the link can view” so Resync can read it.
                      </div>
                    </div>
                  )}
                </div>

                <div data-tour="run" className="uf-col" style={{ gap: 12 }}>
                  <button type="button" onClick={continueToConfirm} className="uf-btn is-lg um-cta" style={{ width: "100%" }}>
                    Continue to confirm document
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                  {scanError && (
                    <div role="alert" className="uf-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <p style={{ margin: 0 }}>{scanError}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="uf-col um-stagger" style={{ gap: 12 }}>
                <div className="uf-prep">
                  <div className="uf-eb">Scan preparation</div>
                  <div>Clear chapter headings help Resync check cross-chapter coherence.</div>
                </div>
                {[
                  ["1", "Chapter template (optional)", "In Step 1, attach, edit or load saved headings. You can skip to use detected headings."],
                  ["2", "Upload manuscript", ".docx under 25 MB, or a Google Docs link set to “Anyone with the link can view”."],
                  ["3", "Confirm your document", "Check the file name and preview, then run the scan. The preview is free; unlocking the full report costs 1 credit."],
                ].map(([n, title, body]) => (
                  <div key={n} className="uf-card uf-side-step"><span className="uf-n">{n}</span><div><b>{title}</b><p>{body}</p></div></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div key="step3" className="um-panel flex flex-col gap-5">
            <div className="uf-head">
              <div>
                <div className="uf-eb">Step 3 · Confirm document</div>
                <h1 className="uf-h1">Is this the right document?</h1>
              </div>
              <div className="uf-toggle" role="group" aria-label="Manuscript source">
                <button type="button" className={mode === "file" ? "is-on" : ""} onClick={() => { setMode("file"); if (!uploadedFile) setStep(2); }} aria-pressed={mode === "file"}>Word file</button>
                <button type="button" className={mode === "link" ? "is-on" : ""} onClick={() => { setMode("link"); if (!link.trim()) setStep(2); }} aria-pressed={mode === "link"}>Google Docs link</button>
              </div>
            </div>

            <div className="uf-grid is-wide">
              <div className="uf-col" style={{ gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="uf-eb is-muted">{mode === "file" ? "Your paper · scroll to read it" : "Your Google Doc · scroll to read it"}</div>
                </div>

                {activeFile && pagesState !== "failed" ? (
                  <div className="uf-pages" aria-label="Your manuscript, as the report will show it">
                    <DocxManuscript file={activeFile} highlights={[]} locked={false} onLinked={() => {}} onFailed={() => setPagesState("failed")} />
                  </div>
                ) : (
                  <div className="uf-paper" style={{ height: "auto", minHeight: 320, maxHeight: 560, overflowY: "auto" }} aria-label="Structure of your manuscript">
                    {linkState === "loading" || outlineLoading ? (
                      <div className="uf-loading" role="status" aria-live="polite">
                        <span className="uf-spinner" aria-hidden="true" />
                        <b>{mode === "link" ? "Opening your Google Doc" : "Reading your document"}</b>
                        <span className="uf-loading-step">
                          {outlineSeconds < 4 ? "Connecting…" : outlineSeconds < 10 ? "Fetching your manuscript…" : "Preparing your pages. Long papers take a little longer."}
                        </span>
                        <span className="uf-skeleton" aria-hidden="true"><i style={{ width: "92%" }} /><i style={{ width: "78%" }} /><i style={{ width: "86%" }} /><i style={{ width: "54%" }} /></span>
                      </div>
                    ) : mode === "link" && linkState === "failed" ? (
                      <p style={{ color: "#8f1d36", fontWeight: 600 }}>{linkProblem ?? "We could not open this Google Doc."} You can still run the scan, but there is no preview.</p>
                    ) : outline ? (
                      <>
                        {outline.title && <h3>{outline.title}</h3>}
                        {outline.excerpt.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                      </>
                    ) : docInfo ? (
                      <>
                        {docInfo.title && <h3>{docInfo.title}</h3>}
                        {docInfo.excerpt.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                      </>
                    ) : (
                      <p style={{ color: "#6b6890" }}>{outlineError ?? "We could not read a preview of this document, but it can still be scanned. Check the name on the right."}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="uf-col">
                <div className="uf-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span className="uf-ic" style={{ width: 64, height: 64, borderRadius: 16 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8" /></svg>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 16.5, wordBreak: "break-word" }}>{fileLabel || "No document chosen"}</b>
                      <div style={{ fontSize: 11.5, color: "#6b6890", fontFamily: "ui-monospace, monospace" }}>
                        {activeFile ? `${mode === "link" ? "Google Doc · " : ""}${formatBytes(activeFile.size)}${(outline?.words ?? docInfo?.words) ? ` · ~${(outline?.words ?? docInfo?.words ?? 0).toLocaleString("en-US")} words` : ""}` : mode === "link" ? "Google Docs link" : ""}
                      </div>
                    </div>
                  </div>

                  {mode === "file" ? (
                    <>
                      <button type="button" className="uf-btn is-ghost is-sm" disabled={isScanning} onClick={() => replaceInputRef.current?.click()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        Replace file
                      </button>
                      <input ref={replaceInputRef} type="file" accept={WORD_ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) acceptManuscriptFile(f); e.target.value = ""; }} />
                    </>
                  ) : (
                    <div className="uf-fld">
                      <span className="uf-lab">Edit the link</span>
                      <span className="uf-inp">
                        <input type="url" aria-label="Google Docs link" value={linkDraft} onChange={e => setLinkDraft(e.target.value)} placeholder="https://docs.google.com/document/d/…" />
                      </span>
                      <button type="button" className="uf-btn is-ghost is-sm" disabled={isScanning || !linkDraft.trim() || linkDraft.trim() === link.trim()}
                        onClick={() => {
                          if (!linkDraft.includes("docs.google.com")) { setScanError("Please provide a valid Google Docs link."); return; }
                          setScanError(null); setLink(linkDraft.trim());
                        }}>Update link</button>
                    </div>
                  )}
                </div>

                <div className="uf-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="uf-eb is-muted">Paper structure</div>
                    {outline && <span className="uf-pill">{outline.sections.length} {outline.sections.length === 1 ? "section" : "sections"}</span>}
                  </div>
                  {outlineLoading ? (
                    <p style={{ margin: 0, fontSize: 13.5, color: "#6b6890" }}>Finding the sections the scan will compare…</p>
                  ) : outline ? (
                    <>
                      <ol className="uf-outline">
                        {outline.sections.map((section, index) => (
                          <li key={`${section.name}-${index}`}>
                            <span className="uf-outline-n">{index + 1}</span>
                            <span className="uf-outline-name">{section.name}</span>
                            <span className="uf-outline-w">{section.words.toLocaleString("en-US")} words</span>
                          </li>
                        ))}
                      </ol>
                      {outline.structure !== "headings" && (
                        <p style={{ margin: 0, fontSize: 12.5, color: "#8a5a12" }}>
                          {outline.structure === "split" ? "No headings found, so the scan will read it in equal parts." : "Headings were found by their shape, not their name."}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13.5, color: "#6b6890" }}>{mode === "link" && outlineError ? outlineError : "The sections will be found when the scan starts."}</p>
                  )}
                </div>

                <div className="uf-card" style={{ padding: 22 }}>
                  <div className="uf-eb is-muted">Scan summary</div>
                  <div className="uf-rows" style={{ borderTop: 0, marginTop: 4 }}>
                    <div className="uf-row"><span>Chapter template</span><b style={{ color: "#2b25c8" }}>{hasChapters ? "Custom" : "Auto-detect"}</b></div>
                    <div className="uf-row"><span>Scan preview</span><b style={{ color: "#0b9f6e" }}>Free</b></div>
                    <div className="uf-row"><span>Full report unlock</span><b>1 credit</b></div>
                    <div className="uf-row"><span>Your credits</span><b>{creditBalance ?? "—"}</b></div>
                  </div>
                </div>
              </div>
            </div>

            {notAPaper && !scanError && (
              <div role="alert" className="uf-error" style={{ maxWidth: 760 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p style={{ margin: 0 }}>{outline?.paper_problem}</p>
              </div>
            )}
            {scanError && (
              <div role="alert" className="uf-error" style={{ maxWidth: 760 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p style={{ margin: 0 }}>{scanError}</p>
              </div>
            )}
            <div className="uf-actionbar">
              <button type="button" onClick={() => setStep(2)} disabled={isScanning} className="uf-btn is-ghost is-lg" style={{ padding: "0 26px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                Choose a different document
              </button>
              <button type="button" onClick={handleScan} disabled={isScanning || notAPaper || (mode === "file" ? !uploadedFile : !link.trim() || linkState === "loading")} className="uf-btn is-lg is-grow um-cta">
                {isScanning ? "Scanning manuscript…" : "Yes, run coherence scan"}
                {!isScanning && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
