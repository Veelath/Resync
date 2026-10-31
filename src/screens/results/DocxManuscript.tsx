import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { highlightSentences, type HighlightSpec } from '../../lib/docxHighlight';

// Scoped overrides: keep Word's own page look (fonts, margins, tables, images) but fit it into the results pane.
const HOST_CSS = `
.docx-host .docx-wrapper { background: transparent !important; padding: 4px 0 !important; }
.docx-host .docx-wrapper > section.docx { box-shadow: 0 1px 8px rgba(11, 15, 61, .14); margin-bottom: 14px !important; }
.docx-host mark { transition: box-shadow .15s; }
.docx-host mark:hover { box-shadow: 0 0 0 2px rgba(26, 31, 204, .35); }
`;

// Only the writing is compared, so tables, pictures and diagrams are removed. The text keeps Word's own formatting.
function keepTextOnly(root: HTMLElement) {
  const visual = 'table, img, svg, canvas, object, embed, video, audio';
  // A paragraph that held only a picture would leave a blank gap behind, so it goes too.
  root.querySelectorAll('p').forEach(paragraph => {
    if (paragraph.querySelector(visual) && !paragraph.textContent?.trim()) paragraph.remove();
  });
  root.querySelectorAll(visual).forEach(element => element.remove());
  // pages that were only a table or a figure
  root.querySelectorAll('section.docx').forEach(page => {
    if (!page.textContent?.trim()) page.remove();
  });
}

/** The student's uploaded Word file, drawn as it looks in Word, with the recommended sentences highlighted. */
export function DocxManuscript({ file, highlights, onLinked, onFailed }: {
  file: File;
  highlights: HighlightSpec[];
  onLinked: (ids: Set<string>) => void;
  onFailed: () => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [scale, setScale] = useState(1);
  // Handlers change every render; the document must not be redrawn for that, so they are read from a ref.
  const callbacks = useRef({ onLinked, onFailed, highlights });
  callbacks.current = { onLinked, onFailed, highlights };
  const highlightKey = highlights.map(item => `${item.id}|${item.text}|${item.background}`).join('\n');

  useEffect(() => {
    let cancelled = false;
    const body = bodyRef.current;
    if (!body) return;
    setStatus('loading');
    body.innerHTML = '';
    renderAsync(file, body, styleRef.current ?? undefined, {
      className: 'docx', inWrapper: true, ignoreWidth: false, ignoreHeight: false, ignoreFonts: false,
      breakPages: true, ignoreLastRenderedPageBreak: true, renderHeaders: true, renderFooters: true,
      renderFootnotes: true, renderEndnotes: true, useBase64URL: true,
    }).then(() => {
      if (cancelled) return;
      keepTextOnly(body);
      const specs = callbacks.current.highlights;
      callbacks.current.onLinked(highlightSentences(body, specs));
      setStatus('ready');
    }).catch(error => {
      console.error('Could not draw the uploaded document', error);
      if (!cancelled) callbacks.current.onFailed();
    });
    return () => { cancelled = true; };
  }, [file, highlightKey]);

  // Word pages are fixed width: shrink them to fit a narrow pane instead of scrolling sideways.
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      const page = bodyRef.current?.querySelector<HTMLElement>('section.docx');
      if (!page) return;
      setScale(Math.min(1, (outer.clientWidth - 8) / page.offsetWidth));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    fit();
    return () => observer.disconnect();
  }, [status]);

  return <div ref={outerRef} className="docx-host" aria-label="Your manuscript, as uploaded">
    <style>{HOST_CSS}</style>
    <div ref={styleRef} />
    {status === 'loading' && <p className="py-6 text-center text-sm text-gray-500" role="status">Opening your manuscript as you uploaded it…</p>}
    <div ref={bodyRef} style={{ zoom: scale, visibility: status === 'ready' ? 'visible' : 'hidden' }} />
  </div>;
}
