import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderAsync } from 'docx-preview';

const CSS = `
.template-page .template-wrapper { background: transparent; padding: 0; }
.template-page .template-wrapper > section.template { box-shadow: 0 1px 8px rgba(11, 15, 61, .14); margin-bottom: 14px; }
`;

/** The uploaded file as it looks: a Word file drawn page by page, a text file as its lines. */
function TemplateDocument({ file }: { file: File }) {
  const body = useRef<HTMLDivElement>(null);
  const styles = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [text, setText] = useState<string | null>(null);
  const isText = /\.txt$/i.test(file.name);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        if (isText) {
          const content = await file.text();
          if (!cancelled) { setText(content); setStatus('ready'); }
          return;
        }
        const page = document.createElement('div');
        const pageStyles = document.createElement('div');
        // Embedded HTML parts are not drawn, and links are switched off: this is only for looking at.
        await renderAsync(await file.arrayBuffer(), page, pageStyles, { className: 'template', inWrapper: true, breakPages: true, useBase64URL: true, renderAltChunks: false });
        if (cancelled) return;
        page.querySelectorAll('a[href]').forEach(link => link.removeAttribute('href'));
        styles.current?.replaceChildren(...pageStyles.childNodes);
        body.current?.replaceChildren(...page.childNodes);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();
    return () => { cancelled = true; };
  }, [file, isText]);

  return <div className="template-page">
    <style>{CSS}</style>
    {status === 'loading' && <p role="status" className="py-8 text-center text-sm text-[#6b6890]">Opening your template…</p>}
    {status === 'failed' && <p role="alert" className="py-8 text-center text-sm text-[#9f1239]">This file could not be shown. Try saving it again in Word and upload it.</p>}
    {isText ? <pre className="whitespace-pre-wrap rounded-xl bg-white p-5 font-serif text-[15px] leading-7 text-[#1f2433]">{text}</pre>
      : <><div ref={styles} /><div ref={body} className="overflow-x-auto" /></>}
  </div>;
}

/** A pop-up showing the template file, when it was kept. */
export function TemplateViewer({ name, detail, file, onClose }: {
  name: string; detail: string; file: File | null; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="template-view-title"
    className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(11,10,46,.55)] p-3 backdrop-blur-[3px] sm:p-6" onClick={onClose}>
    <div className="flex max-h-full w-full max-w-[900px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_40px_90px_-30px_rgba(11,10,46,.7)]" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 border-b border-[#e7e5fb] px-5 py-4">
        <div className="min-w-0">
          <h2 id="template-view-title" className="truncate text-lg font-extrabold text-[#0b0a2e]">{name}</h2>
          <p className="text-[13px] text-[#6b6890]">{detail}</p>
        </div>
        <button type="button" autoFocus onClick={onClose} className="shrink-0 rounded-xl border border-[#dad8f2] px-4 py-2 text-sm font-bold text-[#0b0a2e] hover:bg-[#f6f5ff] focus-visible:outline-2 focus-visible:outline-[#2b25c8]">Close</button>
      </div>
      <div className="overflow-y-auto bg-[#f5f5fe] px-4 py-4 sm:px-6">
        {file ? <TemplateDocument file={file} />
          : <p className="rounded-xl bg-white p-5 text-sm text-[#6b6890]">The file of this template was not saved. Upload it again and save it to see it here.</p>}
      </div>
    </div>
  </div>, document.body);
}
