import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { INITIAL_ELEMENTS, MAX_ELEMENTS, nextBudget, createPreviewGuard } from '../../lib/docxPreview';
import { highlightSentences, type HighlightSpec } from '../../lib/docxHighlight';

// Scoped overrides: keep Word's own page look (fonts, margins, tables, images) but fit it into the results pane.
const HOST_CSS = `
.docx-host .docx-wrapper { background: transparent !important; padding: 4px 0 !important; }
.docx-host .docx-wrapper > section.docx { box-shadow: 0 1px 8px rgba(11, 15, 61, .14); margin-bottom: 14px !important; }
.docx-host.docx-with-rail { display: flex; align-items: flex-start; }
.docx-main { flex: 1; min-width: 0; }
.docx-rail { position: sticky; top: 0; flex: none; align-self: flex-start; width: 92px; max-height: 100vh; overflow-y: auto; padding: 22px 0 28px; display: flex; flex-direction: column; align-items: center; gap: 24px; background: rgba(255, 255, 255, .6); border-right: 1px solid #e1dffa; margin-right: 8px; scrollbar-width: none; overscroll-behavior: contain; }
.docx-rail::-webkit-scrollbar { display: none; }
.docx-thumb { position: relative; flex: none; width: 56px; height: 74px; border-radius: 7px; background: #fff; border: 1.5px solid #dad8f2; padding: 11px 9px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: transform .2s, border-color .2s, box-shadow .2s; }
.docx-thumb:hover { transform: translateY(-2px); }
.docx-thumb:focus-visible { outline: 3px solid #7b76f0; outline-offset: 2px; }
.docx-thumb.on { border-color: #2b25c8; box-shadow: 0 0 0 3px rgba(43, 37, 200, .14); }
.docx-thumb span { display: block; height: 3px; border-radius: 2px; background: #dad8f2; }
.docx-thumb em { position: absolute; bottom: -17px; left: 0; right: 0; text-align: center; font-style: normal; font-size: 11px; font-weight: 700; color: #7d7b9e; }
@media (max-width: 760px) { .docx-rail { display: none; } }
.docx-host table { display: block; max-width: 100%; overflow-x: auto; }
.docx-host mark { transition: box-shadow .15s; }
.docx-host mark:hover { box-shadow: 0 0 0 2px rgba(26, 31, 204, .35); }
.docx-host mark[data-selected] { box-shadow: 0 0 0 3px rgba(43, 37, 200, .35); }
`;

// Locked previews omit tables because the local file may contain withheld text.
function keepTextOnly(root: HTMLElement, locked: boolean) {
  const visual = `${locked ? 'table, ' : ''}img, svg, canvas, object, embed, video, audio`;
  // A paragraph that held only a picture would leave a blank gap behind, so it goes too.
  root.querySelectorAll('p').forEach(paragraph => {
    if (paragraph.querySelector(visual) && !paragraph.textContent?.trim()) paragraph.remove();
  });
  root.querySelectorAll(visual).forEach(element => element.remove());
  root.querySelectorAll('table').forEach(table => { table.tabIndex = 0; table.setAttribute('aria-label', 'Table; scroll horizontally to see all columns'); });
  // pages that were only a table or a figure
  root.querySelectorAll('section.docx').forEach(page => {
    if (!page.textContent?.trim()) page.remove();
  });
}

export interface DocxManuscriptHandle { loadNext: () => Promise<boolean> }

/** The student's uploaded Word file, drawn as it looks in Word, with the recommended sentences highlighted. */
export const DocxManuscript = forwardRef<DocxManuscriptHandle, {
  file: File; highlights: HighlightSpec[]; locked: boolean; secondSection?: string;
  onLinked: (ids: Set<string>) => void; onFailed: () => void;
}>(function DocxManuscript({ file, highlights, locked, secondSection, onLinked, onFailed }, ref) {
  const outerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const loadNextRef = useRef<() => Promise<boolean>>(async () => false);
  useImperativeHandle(ref, () => ({ loadNext: () => loadNextRef.current() }), []);
  const [budget, setBudget] = useState(INITIAL_ELEMENTS);
  const [loadedPages, setLoadedPages] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [scale, setScale] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(0);
  // Handlers change every render; the document must not be redrawn for that, so they are read from a ref.
  const callbacks = useRef({ onLinked, onFailed, highlights });
  callbacks.current = { onLinked, onFailed, highlights };
  const highlightKey = highlights.map(item => `${item.id}|${item.text}|${item.background}`).join('\n');

  useEffect(() => {
    let cancelled = false;
    const body = bodyRef.current;
    if (!body) return;
    setStatus('loading');
    body.replaceChildren();
    setLoadedPages(0);
    if (!locked) {
      const worker = new Worker(new URL('../../lib/docxPages.worker.ts', import.meta.url), { type: 'module' });
      let next = 0, total = 1, pending: Promise<boolean> | null = null;
      const found = new Set<string>();
      const loadNext = (): Promise<boolean> => {
        if (cancelled || next >= total) return Promise.resolve(false);
        if (pending) return pending;
        pending = new Promise<boolean>(resolve => {
          worker.onmessage = async event => {
            if (cancelled) { resolve(false); return; }
            if (event.data.error) { callbacks.current.onFailed(); resolve(false); return; }
            try {
              const rendered = document.createElement('div');
              const styles = document.createElement('div');
              await renderAsync(event.data.bytes, rendered, styles, {
                className: 'docx', inWrapper: true, ignoreWidth: false, ignoreHeight: false, ignoreFonts: false,
                breakPages: true, ignoreLastRenderedPageBreak: true, renderHeaders: true, renderFooters: true,
                renderFootnotes: true, renderEndnotes: true, useBase64URL: true,
              });
              if (cancelled) { resolve(false); return; }
              keepTextOnly(rendered, false);
              if (next === 0) styleRef.current?.replaceChildren(...styles.childNodes);
              const ids = highlightSentences(rendered, callbacks.current.highlights.filter(spec => !found.has(spec.id)));
              ids.forEach(id => found.add(id));
              body.append(...rendered.childNodes);
              callbacks.current.onLinked(new Set(found));
              next++; total = event.data.total; setLoadedPages(next);
              setTruncated(next < total);
              setStatus('ready');
              resolve(true);
            } catch { callbacks.current.onFailed(); resolve(false); }
          };
          worker.onerror = () => { if (!cancelled) callbacks.current.onFailed(); resolve(false); };
          worker.postMessage({ file: next === 0 ? file : undefined, index: next });
        }).finally(() => { pending = null; });
        return pending;
      };
      loadNextRef.current = loadNext;
      void loadNext();
      return () => { cancelled = true; loadNextRef.current = async () => false; worker.terminate(); };
    }
    loadNextRef.current = async () => false;
    const rendered = document.createElement('div');
    const styles = document.createElement('div');
    const worker = new Worker(new URL('../../lib/docxPreview.worker.ts', import.meta.url), { type: 'module' });
    const guard = createPreviewGuard(() => { worker.terminate(); if (!cancelled) callbacks.current.onFailed(); });
    worker.onerror = () => { guard.cancel(); worker.terminate(); if (!cancelled) callbacks.current.onFailed(); };
    worker.onmessage = async event => {
      if (cancelled || !guard.isActive()) return;
      if (event.data.error) { guard.cancel(); worker.terminate(); callbacks.current.onFailed(); return; }
      try {
        await renderAsync(event.data.bytes, rendered, styles, {
          className: 'docx', inWrapper: true, ignoreWidth: false, ignoreHeight: false, ignoreFonts: false,
          breakPages: true, ignoreLastRenderedPageBreak: true, renderHeaders: true, renderFooters: true,
          renderFootnotes: true, renderEndnotes: true, useBase64URL: true,
        });
      if (cancelled || !guard.finish()) return;
      worker.terminate();
      setTruncated(event.data.truncated);
      keepTextOnly(rendered, locked);
      if (locked) {
        const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
        const target = normalize(secondSection ?? '');
        const heading = target && [...rendered.querySelectorAll('p, h1, h2, h3, h4, h5, h6')].find(element => {
          const text = normalize(element.textContent ?? '');
          return text === target || (text.endsWith(` ${target}`) && /^chapter\s+(?:\d+|[ivxlcdm]+)\b/.test(text));
        });
        if (!heading || !rendered.lastChild) { callbacks.current.onFailed(); return; }
        const withheld = document.createRange();
        withheld.setStartBefore(heading);
        withheld.setEndAfter(rendered.lastChild);
        withheld.deleteContents();
        keepTextOnly(rendered, locked);
      }
      styleRef.current?.replaceChildren(...styles.childNodes);
      body.replaceChildren(...rendered.childNodes);
      const specs = callbacks.current.highlights;
      callbacks.current.onLinked(highlightSentences(body, specs));
      setActivePage(0);
      setStatus('ready');
      } catch (error) {
        guard.cancel(); worker.terminate();
        console.error('Could not draw the uploaded document', error);
        if (!cancelled) callbacks.current.onFailed();
      }
    };
    worker.postMessage({ file, budget });
    return () => { cancelled = true; guard.cancel(); worker.terminate(); };
  }, [file, highlightKey, locked, secondSection, budget]);

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

  // Pages are counted the way Word would: the document is cut into sheet-sized pieces by height, because the file's own
  // page breaks can be few and far between. All sizes here are on-screen pixels, so they already include the zoom.
  const pageMetrics = () => {
    const body = bodyRef.current;
    const first = body?.querySelector<HTMLElement>('section.docx');
    if (!body || !first) return null;
    const nominal = parseFloat(getComputedStyle(first).minHeight) || first.offsetWidth * 1.294;
    const rect = body.getBoundingClientRect();
    return { top: rect.top, height: rect.height, step: (nominal + 14) * scale };
  };

  useEffect(() => {
    if (status !== 'ready') return;
    const metrics = pageMetrics();
    if (metrics) setPageCount(Math.max(1, Math.round(metrics.height / metrics.step)));
  }, [status, scale, loadedPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // On wide screens the manuscript pane scrolls by itself; on narrow ones the whole page does. Find whichever moves now.
  const scrollerOf = (): HTMLElement | null => {
    for (let element = outerRef.current?.parentElement ?? null; element; element = element.parentElement) {
      const overflow = getComputedStyle(element).overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && element.scrollHeight > element.clientHeight + 1) return element;
    }
    return null;
  };

  // The strip follows the reader: the page under the top of the visible area is the current one.
  useEffect(() => {
    if (status !== 'ready') return;
    const onScroll = (event: Event) => {
      if (railRef.current?.contains(event.target as Node)) return;
      const metrics = pageMetrics();
      if (!metrics) return;
      const edge = (scrollerOf()?.getBoundingClientRect().top ?? 0) + 120;
      setActivePage(Math.max(0, Math.min(pageCount - 1, Math.floor((edge - metrics.top) / metrics.step))));
    };
    // capture: scroll events do not bubble, and this catches the pane and the page alike
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    onScroll(new Event('scroll'));
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [status, scale, pageCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // The strip has no scrollbar of its own: wheeling over it moves the manuscript, and the strip then follows.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scroller = scrollerOf();
      if (scroller) scroller.scrollBy({ top: event.deltaY });
      else window.scrollBy({ top: event.deltaY });
    };
    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, [status, pageCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // A long strip keeps the current thumbnail in view, without moving the manuscript.
  useEffect(() => {
    const rail = railRef.current;
    const thumb = rail?.children[activePage] as HTMLElement | undefined;
    if (!rail || !thumb) return;
    if (thumb.offsetTop < rail.scrollTop + 8 || thumb.offsetTop + thumb.offsetHeight > rail.scrollTop + rail.clientHeight - 24) {
      rail.scrollTop = thumb.offsetTop - rail.clientHeight / 2;
    }
  }, [activePage]);

  const goToPage = (index: number) => {
    const metrics = pageMetrics();
    if (!metrics) return;
    const scroller = scrollerOf();
    const delta = metrics.top + index * metrics.step - (scroller?.getBoundingClientRect().top ?? 0) - 8;
    if (scroller) scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + delta), behavior: 'smooth' });
    else window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: 'smooth' });
    setActivePage(index);
  };

  return <div className="docx-host docx-with-rail" aria-label="Your manuscript, as uploaded">
    <style>{HOST_CSS}</style>
    <div ref={styleRef} />
    {status === 'ready' && pageCount > 1 && <nav ref={railRef} className="docx-rail print:hidden" aria-label="Pages">
      {Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" onClick={() => goToPage(index)} aria-label={`Go to page ${index + 1}`} aria-current={index === activePage ? 'page' : undefined} className={`docx-thumb ${index === activePage ? 'on' : ''}`}>
        <span /><span /><span style={{ width: '60%' }} /><span /><em>{index + 1}</em>
      </button>)}
    </nav>}
    <div ref={outerRef} className="docx-main">
      {status === 'loading' && <p className="py-6 text-center text-sm text-gray-500" role="status">Opening your manuscript as you uploaded it…</p>}
      <div ref={bodyRef} style={{ zoom: scale, visibility: status === 'ready' ? 'visible' : 'hidden' }} />
      {status === 'ready' && truncated && (locked ? budget < MAX_ELEMENTS : true) && <button type="button" className="uf-btn is-ghost is-sm" onClick={() => locked ? setBudget(nextBudget(budget)) : void loadNextRef.current()}>Show more</button>}
      {locked && status === 'ready' && truncated && budget >= MAX_ELEMENTS && <p>Only the first pages are shown.</p>}
    </div>
  </div>;
});
