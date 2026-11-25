import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { lockedHeadingIndex } from './lockedHeading';
import { highlightSentences, type HighlightSpec } from '../../lib/docxHighlight';

const CSS = `
.docx-host .text-copy p { margin: 0 0 .9em; font: 15px/1.75 Georgia, 'Times New Roman', serif; color: #1f2433; overflow-wrap: anywhere; }
.docx-host .text-copy p[data-heading] { font-weight: 700; margin-top: 1.4em; }
.docx-host .text-copy p[data-title] { text-align: center; font-weight: 700; }
.docx-host .text-copy p[data-contact] { text-align: center; }
.docx-host mark { transition: box-shadow .15s; }
.docx-host mark[data-selected] { box-shadow: 0 0 0 3px rgba(43, 37, 200, .35); }
.docx-host .docx-withheld { filter: blur(6px); user-select: none; pointer-events: none; }
.docx-host .docx-withheld-start { position: relative; z-index: 2; display: flex; justify-content: center; padding: 18px 0 8px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
.docx-host .docx-withheld-start .locked-manuscript-card { position: static; margin-top: 0; }
`;

/**
 * The uploaded file as its exact text, whole and in order: every paragraph, heading and list item, with no table cells or pictures.
 * This is the same copy for a Word file and for a Google Doc (downloaded as Word), and it is never cut short, so it is the view used
 * whenever the page-by-page Word view cannot show the entire document.
 */
export function TextManuscript({ file, highlights, locked, secondSection, unlockControl, onLinked, onFailed }: {
  file: File; highlights: HighlightSpec[]; locked: boolean; secondSection?: string; unlockControl?: ReactNode;
  onLinked: (ids: Set<string>) => void; onFailed: () => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [withheldStart, setWithheldStart] = useState<HTMLElement | null>(null);
  const callbacks = useRef({ onLinked, onFailed, highlights });
  callbacks.current = { onLinked, onFailed, highlights };
  const highlightKey = highlights.map(item => `${item.id}|${item.text}|${item.background}`).join('\n');

  useEffect(() => {
    let cancelled = false;
    const host = body.current;
    if (!host) return;
    setStatus('loading');
    (async () => {
      try {
        const { value } = await (await import('mammoth')).convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        if (cancelled) return;
        const page = new DOMParser().parseFromString(value, 'text/html');
        page.querySelectorAll('table, img').forEach(element => element.remove());
        const blocks = [...page.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')]
          .map(element => ({ text: (element.textContent ?? '').trim(), heading: /^H[1-6]$/.test(element.tagName) }))
          .filter(block => block.text);
        if (!blocks.length) { callbacks.current.onFailed(); return; }
        host.replaceChildren(...blocks.map(block => {
          const paragraph = document.createElement('p');
          paragraph.textContent = block.text;
          if (block.heading) paragraph.dataset.heading = 'true';
          if (/[A-Z]/.test(block.text) && block.text === block.text.toUpperCase() && block.text.length <= 140) paragraph.dataset.title = 'true';   // a title or heading in capitals
          else if (/@/.test(block.text) && block.text.length <= 240) paragraph.dataset.contact = 'true';
          return paragraph;
        }));
        setWithheldStart(null);
        if (locked) {
          const paragraphs = [...host.querySelectorAll('p')];
          const heading = paragraphs[lockedHeadingIndex(paragraphs.map(element => element.textContent ?? ''), secondSection ?? '')];
          if (!heading) { callbacks.current.onFailed(); return; }
          const marker = document.createElement('div');
          marker.className = 'docx-withheld-start';
          heading.before(marker);
          paragraphs.forEach(element => {
            if (element === heading || (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) {
              element.classList.add('docx-withheld'); element.setAttribute('aria-hidden', 'true');
            }
          });
          setWithheldStart(marker);
        }
        try { callbacks.current.onLinked(highlightSentences(host, callbacks.current.highlights)); } catch { /* keep the text */ }
        setStatus('ready');
      } catch { if (!cancelled) callbacks.current.onFailed(); }
    })();
    return () => { cancelled = true; };
  }, [file, highlightKey, locked, secondSection]);

  return <div className="docx-host" aria-label="Your manuscript, as uploaded">
    <style>{CSS}</style>
    {status === 'loading' && <p className="py-6 text-center text-sm text-gray-500" role="status">Opening your manuscript as you uploaded it…</p>}
    <div ref={body} className="text-copy mx-auto w-full max-w-[78ch] px-3 py-4 sm:px-8" style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} />
    {withheldStart && unlockControl && createPortal(<div className="locked-manuscript-card w-full max-w-[360px] rounded-2xl border border-[#dfe5f5] bg-white p-5 text-center shadow-[0_16px_48px_#0b0f3d26]"><p className="mb-3 text-sm font-semibold text-[#0b0f3d]">The rest of your manuscript is covered by the full report.</p>{unlockControl}</div>, withheldStart)}
  </div>;
}
