import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { createRequestToken } from '../lib/requestToken';
import { INITIAL_ELEMENTS, MAX_ELEMENTS, nextBudget, createPreviewGuard } from '../lib/docxPreview';

export function DocxPreview({ file, onFailed }: { file: File; onFailed: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const styles = useRef<HTMLDivElement>(null);
  const worker = useRef<Worker | null>(null);
  const token = useRef(createRequestToken());
  const loaded = useRef(false);
  const callback = useRef(onFailed);
  callback.current = onFailed;
  const [budget, setBudget] = useState(INITIAL_ELEMENTS);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [truncated, setTruncated] = useState(false);
  const [scale, setScale] = useState(1);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const instance = new Worker(new URL('../lib/docxPreview.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    loaded.current = false;
    setBudget(INITIAL_ELEMENTS);
    setHasContent(false);
    return () => { token.current.invalidate(); instance.terminate(); worker.current = null; };
  }, [file]);

  useEffect(() => {
    const instance = worker.current;
    if (!instance) return;
    token.current.invalidate();
    const current = token.current.current();
    const fail = () => { if (current()) { instance.terminate(); callback.current(); } };
    const guard = createPreviewGuard(fail);
    setStatus('loading');
    instance.onmessage = async event => {
      if (!current() || !guard.isActive()) return;
      if (event.data.error) { guard.cancel(); fail(); return; }
      const end = performance.now();
      performance.measure('docx-preview-worker', { start: Math.max(0, end - event.data.workerMs), end });
      try {
        const body = document.createElement('div');
        const css = document.createElement('div');
        await renderAsync(event.data.bytes, body, css, {
          className: 'docx', inWrapper: true, ignoreWidth: false, ignoreHeight: false, ignoreFonts: false,
          breakPages: true, ignoreLastRenderedPageBreak: true, renderHeaders: true, renderFooters: true,
          renderFootnotes: false, renderEndnotes: false, useBase64URL: true,
        });
        if (!current() || !guard.isActive()) return;
        if (!guard.finish()) return;
        styles.current?.replaceChildren(...css.childNodes);
        host.current?.replaceChildren(...body.childNodes);
        setHasContent(true);
        setTruncated(event.data.truncated);
        setStatus('ready');
      } catch { guard.cancel(); fail(); }
    };
    instance.onerror = () => { guard.cancel(); fail(); };
    instance.postMessage({ file: loaded.current ? undefined : file, budget });
    loaded.current = true;
    return () => { guard.cancel(); token.current.invalidate(); };
  }, [file, budget]);

  useEffect(() => {
    const outer = host.current?.parentElement;
    if (!outer || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      const page = host.current?.querySelector<HTMLElement>('section.docx');
      if (page) setScale(Math.min(1, Math.max(0.7, (outer.clientWidth - 8) / page.offsetWidth)));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(outer); fit();
    return () => observer.disconnect();
  }, [status]);

  return <>
    <style>{`.confirm-docx-scroll:focus-visible { outline: 3px solid #2b25c8; outline-offset: -3px; } .confirm-docx .docx-wrapper { background: transparent !important; padding: 4px 0 !important; } .confirm-docx section.docx { box-shadow: 0 1px 8px rgba(11,15,61,.14); margin-bottom: 14px !important; }`}</style>
    <div ref={styles} />
    {status === 'loading' && <p role="status">Opening your document...</p>}
    <div role="region" aria-label="Document preview" tabIndex={0} className="confirm-docx-scroll" style={{ maxHeight: 320, overflow: 'auto' }}>
      <div className="confirm-docx" ref={host} style={{ zoom: scale, visibility: hasContent ? 'visible' : 'hidden' }} />
    </div>
    {hasContent && <>
      <p style={{ color: '#334155', fontSize: 14 }}>{truncated ? 'Showing the first pages of your document. The scan reads all of it.' : 'Your whole document is shown.'}</p>
      {truncated && budget < MAX_ELEMENTS && <button type="button" className="uf-btn is-ghost is-sm" disabled={status === 'loading'} onClick={() => { setStatus('loading'); setBudget(nextBudget(budget)); }}>Show more</button>}
    </>}
  </>;
}
