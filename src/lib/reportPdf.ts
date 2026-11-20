// The downloadable report, drawn from the scan result with a fixed template: a real PDF, not a picture of the page.
// Order: the score report first (score, how it was made, scores by section, findings, recommendations, citations), then the
// manuscript text. Every page links to the Resync site, never the report itself.
import { jsPDF } from 'jspdf';
import type { DimensionBreakdown, DimensionName, ManuscriptFlowPair, V7ScanResponse } from '../services/v7Result';
import { GROUPS } from '../screens/results/ScoreExplainer';
import type { DocxBlock } from './docxStructure';
import { clearPairs } from '../screens/results/clearPairs';
import { plainText } from '../screens/results/helpers';

export const RESYNC_SITE = 'https://resync-web-m.onrender.com';

export interface PdfCitation { ref: string; status: string; noLink?: boolean }

const INDIGO: [number, number, number] = [26, 31, 204];
const NAVY: [number, number, number] = [11, 15, 61];
const GREY: [number, number, number] = [75, 82, 117];
const SOFT: [number, number, number] = [246, 247, 251];
const LINE: [number, number, number] = [223, 229, 245];
const GREEN: [number, number, number] = [18, 161, 80];
const AMBER: [number, number, number] = [217, 140, 6];
const RED: [number, number, number] = [225, 29, 72];

const CATEGORIES: { name: DimensionName; label: string }[] = [
  { name: 'context_alignment', label: 'Context Alignment' },
  { name: 'operational_alignment', label: 'Operational Alignment' },
  { name: 'evidence_consistency', label: 'Evidence Consistency' },
  { name: 'logical_support', label: 'Logical Support' },
];

/** Standard PDF fonts cover Latin text only; anything else is swapped for a close plain character, or a question mark. */
export function pdfSafe(value: string | null | undefined): string {
  const swaps: Record<string, string> = { '→': '->', '←': '<-', '↔': '<->', '≥': '>=', '≤': '<=', '≠': '!=', '≈': '~', '−': '-', '‑': '-', '✦': '*', '✓': 'v', '✗': 'x',
    'β': 'beta', 'α': 'alpha', 'χ': 'chi', 'σ': 'sigma', 'μ': 'mu', 'Δ': 'Delta', ' ': ' ', '​': '', '﻿': '' };
  return (value ?? '').replace(/[^\x00-\xFF‘’“”–—•…€]/g, ch => swaps[ch] ?? '?').replace(/\r/g, '');
}

const pct = (value: number) => String(Number(value.toFixed(2)));
const points = (value: number) => String(Number(value.toFixed(2)));
const trim = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

function bandColor(band: string): [number, number, number] { return band === 'Strong' ? GREEN : band === 'Solid' ? AMBER : RED; }
function scoreColor(score: number): [number, number, number] { return score >= 85 ? GREEN : score >= 70 ? AMBER : RED; }

const CREDIT = { Critical: 0, Moderate: 0.25, Minor: 0.5 } as const;
const PAIR_KEYS = ['objectives_alignment', 'methodology_fit', 'claim_support'] as const;

/** The points a pair earned over the checks it takes part in, by the same rules as the score (1 for a pass, part of a point for a problem). */
export function pairPoints(pair: ManuscriptFlowPair): { earned: number; total: number } | null {
  if (pair.scores.overall_coherence == null) return null;
  const keys = pair.numeric_applicable ? [...PAIR_KEYS, 'numeric_consistency' as const] : [...PAIR_KEYS];
  let earned = 0;
  for (const key of keys) {
    const rating = pair.scores[key];
    if (pair.severity && pair.severity !== 'None' && pair.failed_dimension === key) earned += CREDIT[pair.severity];
    else if (rating != null && rating < 0.5 && (pair.adjacent !== false || pair.severity == null)) earned += Math.max(0, rating);
    else earned += 1;
  }
  return { earned, total: keys.length };
}

/** The share of points each section earned over every check it takes part in: shows which parts of the paper fit least well. */
export function sectionScores(flow: ManuscriptFlowPair[]): { name: string; score: number; pairs: number }[] {
  const totals = new Map<string, { earned: number; total: number; pairs: number }>();
  for (const pair of flow) {
    const points = pairPoints(pair);
    if (!points) continue;
    for (const name of [pair.section_a, pair.section_b]) {
      const entry = totals.get(name) ?? { earned: 0, total: 0, pairs: 0 };
      entry.earned += points.earned; entry.total += points.total; entry.pairs += 1;
      totals.set(name, entry);
    }
  }
  return [...totals].map(([name, { earned, total, pairs }]) => ({ name, score: Number((earned / total * 100).toFixed(2)), pairs }));
}

/** `manuscriptText` is the exact text of the uploaded file (paragraph by paragraph); without it the stored sections are printed. */
export function buildReportPdf(result: V7ScanResponse, title: string, citations: PdfCitation[], locked = false, manuscriptText?: string | null, structure?: DocxBlock[] | null): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  const bottom = H - 54;
  const inner = W - M * 2;
  let y = M + 10;

  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const newPage = () => { doc.addPage(); y = M + 10; };
  const need = (height: number) => { if (y + height > bottom) newPage(); };

  /** The manuscript as it was written: its paragraphs in order with alignment, indents, spacing, bold, italic, underline, sizes, lists and page breaks. */
  function drawStructure(blocks: DocxBlock[]) {
    const TM = 64;                       // a 2.25 cm margin, like the Word page
    const right = W - TM;
    const fontOf = (run: { bold: boolean; italic: boolean }) => run.bold && run.italic ? 'bolditalic' : run.bold ? 'bold' : run.italic ? 'italic' : 'normal';
    color([20, 20, 20]);
    let blanks = 0;
    for (const block of blocks) {
      if (block.kind === 'page') { newPage(); blanks = 0; continue; }
      const lineHeight = block.size * block.lineFactor;
      if (!block.runs.length) {   // an empty paragraph is a blank line, but a long run of them is not kept
        if (++blanks <= 3) { need(lineHeight); y += lineHeight; }
        continue;
      }
      blanks = 0;
      let left = block.left, first = block.first;
      if (block.marker && left === 0 && first === 0) { left = 36; first = -18; }
      if (y > M + 10) y += block.before;
      // words with their style, then lines that fit the width
      type Word = { text: string; font: string; underline: boolean; width: number; gap: number; breakAfter: boolean };
      const words: Word[] = [];
      let gap = 0;
      doc.setFontSize(block.size);
      for (const run of block.runs) {
        doc.setFont('times', fontOf(run));
        for (const piece of run.text.split(/(\n|[ \t\u00a0]+)/)) {
          if (!piece) continue;
          if (piece === '\n') { if (words.length) words[words.length - 1].breakAfter = true; gap = 0; continue; }
          if (/^[ \t\u00a0]+$/.test(piece)) { gap += doc.getTextWidth(' ') * (piece.length > 3 ? 4 : Math.min(piece.length, 2)); continue; }
          const safe = pdfSafe(piece);
          words.push({ text: safe, font: fontOf(run), underline: run.underline, width: doc.getTextWidth(safe), gap: words.length || gap ? gap : 0, breakAfter: false });
          gap = 0;
        }
      }
      type Line = { words: Word[]; forced: boolean };
      const lines: Line[] = [];
      let current: Word[] = [], used = 0, firstLine = true;
      const room = () => right - (TM + left + (firstLine ? first : 0));
      for (const word of words) {
        const add = (current.length ? word.gap || doc.getTextWidth(' ') : 0) + word.width;
        if (current.length && used + add > room()) { lines.push({ words: current, forced: false }); current = []; used = 0; firstLine = false; }
        current.push(word); used += (current.length > 1 ? word.gap || doc.getTextWidth(' ') : 0) + word.width;
        if (word.breakAfter) { lines.push({ words: current, forced: true }); current = []; used = 0; firstLine = false; }
      }
      if (current.length) lines.push({ words: current, forced: true });
      lines.forEach((line, index) => {
        need(lineHeight);
        const startsAt = TM + left + (index === 0 ? first : 0);
        const space = doc.getTextWidth(' ');
        const natural = line.words.reduce((sum, word, i) => sum + word.width + (i ? word.gap || space : 0), 0);
        const available = right - startsAt;
        let x = startsAt, extra = 0;
        if (block.align === 'center') x = TM + left + (right - TM - left - natural) / 2;
        else if (block.align === 'right') x = right - natural;
        else if (block.align === 'justify' && !line.forced && line.words.length > 1) extra = Math.max(0, (available - natural) / (line.words.length - 1));
        const baseline = y + block.size;
        if (index === 0 && block.marker) {
          doc.setFont('times', 'normal'); doc.setFontSize(block.size);
          doc.text(pdfSafe(block.marker), TM + left + first, baseline);
        }
        line.words.forEach((word, i) => {
          if (i) x += (word.gap || space) + extra;
          doc.setFont('times', word.font); doc.setFontSize(block.size);
          doc.text(word.text, x, baseline);
          if (word.underline) { stroke([20, 20, 20]); doc.setLineWidth(0.5); doc.line(x, baseline + 1.5, x + word.width, baseline + 1.5); }
          x += word.width;
        });
        y += lineHeight;
      });
      y += block.after;
    }
  }

  /** Wrapped text at the current position; returns the height used. */
  function text(value: string, opts: { size?: number; bold?: boolean; italic?: boolean; color?: [number, number, number]; x?: number; width?: number; gap?: number; lineHeight?: number } = {}) {
    const size = opts.size ?? 10;
    doc.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal');
    doc.setFontSize(size);
    color(opts.color ?? NAVY);
    const x = opts.x ?? M;
    const lines = doc.splitTextToSize(pdfSafe(value), opts.width ?? inner - (x - M)) as string[];
    const lineHeight = opts.lineHeight ?? size * 1.38;
    for (const line of lines) {
      need(lineHeight);
      doc.text(line, x, y + size);
      y += lineHeight;
    }
    y += opts.gap ?? 0;
  }

  function heading(value: string) {
    need(46);
    y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); color(INDIGO);
    doc.text(pdfSafe(value), M, y + 14);
    y += 20;
    stroke(INDIGO); doc.setLineWidth(1.4); doc.line(M, y, W - M, y);
    y += 10;
  }

  function bar(x: number, width: number, value: number, c: [number, number, number], height = 7) {
    fill(LINE); doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
    const filled = Math.max(0, Math.min(100, value)) / 100 * width;
    if (filled > 0) { fill(c); doc.roundedRect(x, y, Math.max(filled, height), height, height / 2, height / 2, 'F'); }
  }

  const breakdown: DimensionBreakdown | undefined = result.dimension_breakdown ?? result.score_breakdown.dimension_breakdown;
  const overall = Math.round(result.overall_coherence_score);
  const band = result.score_breakdown.band;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const status = result.ai_synthesis?.review_status;
  const provisional = (status?.unreviewed ?? 0) > 0;

  // ---------------------------------------------------------------- cover block
  fill(INDIGO); doc.rect(0, 0, W, 112, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
  doc.text('ReSync', M, 38);
  doc.setFontSize(23); doc.text('Manuscript Coherence Report', M, 68);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
  const titleLines = doc.splitTextToSize(pdfSafe(title), inner) as string[];
  doc.text(titleLines.slice(0, 2), M, 88);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.setFont('helvetica', 'normal'); doc.text(date, W - M, 52, { align: 'right' });
  y = 132;

  // ---------------------------------------------------------------- overall score
  fill(SOFT); doc.roundedRect(M, y, inner, 96, 10, 10, 'F');
  const bc = bandColor(band);
  fill(bc); doc.circle(M + 52, y + 48, 38, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(32);
  doc.text(String(overall), M + 52, y + 56, { align: 'center' });
  doc.setFontSize(9); doc.text('/ 100', M + 52, y + 70, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); color(NAVY);
  doc.text(`${band} coherence`, M + 108, y + 36);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); color(GREY);
  const note = `Overall score = the average of the applicable category scores below, rounded up. ${result.sections_analyzed.length} sections were compared.`;
  const noteLines = doc.splitTextToSize(note, inner - 126) as string[];
  doc.text(noteLines, M + 108, y + 54);
  y += 112;
  if (provisional) {
    text(`Provisional: ${status!.unreviewed} section ${status!.unreviewed === 1 ? 'pair was' : 'pairs were'} not AI-reviewed, so ${status!.unreviewed === 1 ? 'its check uses' : 'their checks use'} the model's rating alone.`,
      { italic: true, color: AMBER, size: 9.5, gap: 4 });
  }
  if (locked) text('This is the preview of the report. The full report includes every section and recommendation.', { italic: true, color: GREY, size: 9.5, gap: 4 });

  // ---------------------------------------------------------------- category cards
  heading('Score by category');
  const cardW = (inner - 12) / 2;
  const cardH = 118;
  CATEGORIES.forEach(({ name, label }, index) => {
    if (index % 2 === 0) need(cardH + 10);
    const x = M + (index % 2) * (cardW + 12);
    const top = y;
    stroke(LINE); doc.setLineWidth(0.8); fill([255, 255, 255]); doc.roundedRect(x, top, cardW, cardH, 8, 8, 'FD');
    const entry = breakdown?.[name];
    const applicable = entry && entry.score !== 'N/A';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); color(NAVY);
    doc.text(label, x + 12, top + 20);
    if (!applicable) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); color(GREY);
      doc.text('Not applicable', x + 12, top + 44);
      doc.text(name === 'evidence_consistency' ? 'No numbers to compare in this paper.' : 'Not enough text to check.', x + 12, top + 58);
    } else {
      const score = entry!.score as number;
      doc.setFontSize(20); color(scoreColor(score));
      doc.text(`${pct(score)}%`, x + 12, top + 46);
      const save = y; y = top + 54; bar(x + 12, cardW - 24, score, scoreColor(score)); y = save;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); color(GREY);
      let line = top + 80;
      for (const kind of ['flow', 'cross'] as const) {
        const half = entry![kind];
        if (!half?.items) continue;
        const label2 = GROUPS[name][kind].name;
        const credit = half.credit != null ? ` · ${points(half.credit)} of ${half.items} points = ${pct(half.credit / half.items * 100)}%` : '';
        doc.text(`${label2} ${half.passed}/${half.items}${credit}`, x + 12, line);
        line += 11;
      }
      if (entry!.flow?.items && entry!.cross?.items && entry!.flow.credit != null && entry!.cross.credit != null) {
        doc.setFont('helvetica', 'bold');
        doc.text(`(${pct(entry!.flow.credit / entry!.flow.items * 100)}% + ${pct(entry!.cross.credit / entry!.cross.items * 100)}%) / 2 = ${pct(score)}%`, x + 12, line + 1);
      }
    }
    if (index % 2 === 1 || index === CATEGORIES.length - 1) y = top + cardH + 12;
  });

  heading('How the score is made');
  text('Every pair of sections is checked on four categories. Each check is worth 1 point: a pass earns 1, a Minor contradiction 0.5, a Moderate one 0.25, a Critical one 0, '
    + 'and a pair the AI review could not check keeps its own model rating (up to 0.5). A pair the AI review cleared earns a full point, however the model rated it: the score only drops for a problem the AI verified with an exact quote. Each category has two groups, checks between neighbouring sections (flow) and checks between far-apart '
    + 'sections that must agree (cross-sections). The two groups count for half each: category score = (flow rate + cross-section rate) / 2. The overall score is the average of the applicable '
    + 'categories, rounded up. Bands: 85 or more is Strong, 70 to 84 is Solid, below 70 is Needs Revision. A finding only counts when it has an exact quote from the manuscript.',
    { size: 9.5, color: GREY, gap: 6 });

  // ---------------------------------------------------------------- scores by section
  const perSection = sectionScores(result.manuscript_flow);
  if (perSection.length) {
    heading('Scores by section');
    text('The share of points each section earned over all the checks it takes part in, by the same rules as the score. A lower score shows where the paper fits together least well.', { size: 9.5, color: GREY, gap: 4 });
    for (const row of perSection) {
      need(20);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); color(NAVY);
      doc.text(trim(pdfSafe(row.name), 44), M, y + 8);
      const save = y;
      y = save + 1; bar(M + 230, inner - 290, row.score, scoreColor(row.score), 7); y = save;
      doc.setFont('helvetica', 'bold'); color(scoreColor(row.score));
      doc.text(`${pct(row.score)}%`, W - M, y + 8, { align: 'right' });
      y += 19;
    }
    y += 4;

    need(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); color(NAVY);
    doc.text('Section pairs', M, y + 10); y += 18;
    const colX = [M, M + 222, M + 300, M + 382, M + 440];
    const head = () => {
      fill(INDIGO); doc.rect(M, y, inner, 17, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      ['Sections compared', 'Type', 'Points', 'Result', 'Issue'].forEach((label, i) => doc.text(label, colX[i] + 4, y + 12));
      y += 17;
    };
    head();
    const hasFailures = breakdown && Object.values(breakdown).some(entry => Array.isArray(entry.failures));
    const advice = result.recommendations.filter(rec => plainText(rec.recommended_revision).trim()).slice(0, locked ? 2 : undefined);
    const classified = clearPairs(result.manuscript_flow, order => advice.some(rec => rec.pair_order === order), result.manuscript_sections, breakdown);
    result.manuscript_flow.forEach((pair, index) => {
      const points = pairPoints(pair);
      const score = points ? points.earned / points.total : null;
      const label = `${pair.section_a} -> ${pair.section_b}`;
      const small = classified.small.find(item => item.pair === pair);
      const verdict = !hasFailures ? (pair.severity == null ? 'Not reviewed' : pair.severity === 'None' ? (score != null && score < 0.85 ? 'Weak link' : 'Clear') : pair.severity)
        : pair.severity == null ? 'Not reviewed' : small ? 'Small issue' : classified.clear.includes(pair) ? 'All clear'
        : pair.severity === 'None' && advice.some(rec => rec.pair_order === pair.order) ? 'Suggestion' : pair.severity === 'None' ? 'Not reviewed' : pair.severity;
      const issue = small ? small.categories.join(', ') : pair.severity && pair.severity !== 'None' ? (pair.explanation?.highlighted_inconsistencies?.[0]?.what ?? pair.explanation?.link_summary ?? '') : '';
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      const issueLines = small ? doc.splitTextToSize(pdfSafe(issue), W - M - colX[4] - 8) as string[] : [trim(pdfSafe(issue), 24)];
      const rowHeight = Math.max(21, issueLines.length * 10 + 8);
      if (y + rowHeight > bottom) { newPage(); head(); }
      if (index % 2 === 0) { fill(SOFT); doc.rect(M, y, inner, rowHeight, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); color(NAVY);
      doc.text(trim(pdfSafe(label), 46), colX[0] + 4, y + 14);
      doc.text(pair.adjacent === false ? 'Cross-section' : 'Transition', colX[1] + 4, y + 14);
      if (points && score != null) { doc.setFont('helvetica', 'bold'); color(scoreColor(score * 100)); doc.text(`${pct(points.earned)}/${points.total} (${Math.round(score * 100)}%)`, colX[2] + 4, y + 14); }
      doc.setFont('helvetica', 'bold'); color(verdict === 'Clear' || verdict === 'All clear' ? GREEN : verdict === 'Not reviewed' ? GREY : verdict === 'Minor' || verdict === 'Weak link' || verdict === 'Small issue' || verdict === 'Suggestion' ? AMBER : RED);
      doc.text(verdict, colX[3] + 4, y + 14);
      doc.setFont('helvetica', 'normal'); color(GREY);
      doc.text(issueLines, colX[4] + 4, y + 14);
      y += rowHeight;
    });
    y += 8;
  }

  // ---------------------------------------------------------------- findings
  heading('Findings');
  if (!result.inconsistencies.length) {
    text('No contradictions between sections were confirmed with a quote from the manuscript.', { size: 10, color: GREY, gap: 4 });
  }
  result.inconsistencies.forEach(item => {
    need(70);
    const pair = result.manuscript_flow.find(entry => entry.order === item.pair_order);
    const severity = pair?.severity && pair.severity !== 'None' ? pair.severity : 'Issue';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); color(severity === 'Minor' ? AMBER : RED);
    doc.text(`${severity}`, M, y + 10);
    color(NAVY); doc.text(trim(pdfSafe(`${item.section_a} <-> ${item.section_b}`), 70), M + 52, y + 10);
    y += 16;
    text(item.explanation_what, { size: 10, bold: true, x: M + 52, gap: 1 });
    text(item.explanation_why, { size: 9.5, color: GREY, x: M + 52, gap: 2 });
    for (const quote of item.evidence_quotes.slice(0, 2)) {
      text(`${quote.section}: "${trim(quote.text, 320)}"`, { size: 9, italic: true, color: GREY, x: M + 52, gap: 1 });
    }
    y += 8;
  });

  // ---------------------------------------------------------------- recommendations
  heading('Recommendations');
  if (!result.recommendations.length) text('No recommendations: nothing needs to change.', { size: 10, color: GREY, gap: 4 });
  result.recommendations.forEach((rec, index) => {
    need(80);
    const sectionName = rec.section ?? rec.section_b;
    fill(rec.kind === 'add' ? GREEN : INDIGO); doc.roundedRect(M, y + 1, 34, 14, 4, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text(rec.kind === 'add' ? 'ADD' : 'EDIT', M + 17, y + 11, { align: 'center' });
    doc.setFontSize(10); color(NAVY);
    doc.text(trim(pdfSafe(`${index + 1}. ${sectionName}`), 70), M + 42, y + 11);
    y += 20;
    if (rec.issue) text(`Why: ${rec.issue}`, { size: 9.5, color: GREY, x: M + 42, gap: 1 });
    if (rec.kind === 'add') {
      text(`Go to the ${rec.placement === 'start' ? 'beginning' : 'end'} of "${sectionName}" and add:`, { size: 9.5, x: M + 42, gap: 1 });
    } else if (rec.original_sentence) {
      text(`Find: "${trim(rec.original_sentence, 360)}"`, { size: 9.5, italic: true, x: M + 42, gap: 1 });
      text('Change to:', { size: 9.5, x: M + 42 });
    }
    text(rec.recommended_revision, { size: 10, bold: true, x: M + 42, color: GREEN, gap: 8 });
  });

  // ---------------------------------------------------------------- citations
  heading('Citations');
  if (locked) {
    text(`${result.access?.locked_counts.citations ?? 0} citations were checked. The full report lists them.`, { size: 10, color: GREY, gap: 4 });
  } else if (!citations.length) {
    text('No citations were found.', { size: 10, color: GREY, gap: 4 });
  } else {
    const label: Record<string, string> = { public: 'Accessible', private: 'Inaccessible' };
    const counts = citations.reduce<Record<string, number>>((all, c) => ({ ...all, [c.status]: (all[c.status] ?? 0) + 1 }), {});
    text(`${citations.length} checked: ${counts.public ?? 0} accessible, ${counts.private ?? 0} inaccessible.`, { size: 10, gap: 4 });
    citations.forEach((citation, index) => text(`${index + 1}. ${citation.ref} (${citation.noLink ? 'no link to check' : label[citation.status] ?? citation.status})`, { size: 8.5, color: GREY, gap: 2 }));
  }

  // ---------------------------------------------------------------- the manuscript text, after the score report
  newPage();
  heading('Manuscript text');
  const copyBlocks = !locked && structure?.length ? structure : null;
  const exactText = !locked && !copyBlocks && manuscriptText?.trim() ? manuscriptText : null;
  text(copyBlocks || exactText ? 'A copy of your uploaded document, as you wrote it.' : 'The text that was scanned, section by section.', { size: 9.5, color: GREY, gap: 4 });
  if (copyBlocks) drawStructure(copyBlocks);
  else if (exactText) exactText.split(/\n+/).map(line => line.trim()).filter(Boolean).forEach(line => text(line, { size: 9.5, gap: 4, lineHeight: 13.2 }));
  const sections = copyBlocks || exactText ? [] : result.manuscript_sections ?? [];
  sections.forEach(section => {
    if (section.text == null && !section.blocks) {
      need(30);
      text(section.display_name || section.name, { size: 12, bold: true, gap: 2 });
      text('Part of the full report.', { size: 9.5, italic: true, color: GREY, gap: 6 });
      return;
    }
    need(48);
    y += 6;
    text(section.display_name || section.name, { size: 12, bold: true, color: INDIGO, gap: 3 });
    const blocks = section.blocks?.length ? section.blocks : (section.text ?? '').split(/\n+/).filter(Boolean).map(line => ({ type: 'paragraph' as const, text: line }));
    for (const block of blocks) {
      if (block.type === 'paragraph') text(block.text, { size: 9.5, gap: 4, lineHeight: 13.2 });
      else block.rows.forEach(row => text(row.join('  |  '), { size: 8.5, color: GREY, gap: 1 }));
    }
  });

  // ---------------------------------------------------------------- header and footer on every page
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    if (page > 1) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); color(INDIGO);
      doc.text('ReSync', M, 28);
      doc.setFont('helvetica', 'normal'); color(GREY);
      doc.text(trim(pdfSafe(title), 70), W - M, 28, { align: 'right' });
      stroke(LINE); doc.setLineWidth(0.6); doc.line(M, 34, W - M, 34);
    }
    stroke(LINE); doc.setLineWidth(0.6); doc.line(M, H - 40, W - M, H - 40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); color(GREY);
    doc.setFont('helvetica', 'normal'); color(INDIGO);
    doc.textWithLink(RESYNC_SITE, W / 2, H - 25, { url: RESYNC_SITE, align: 'center' });
    color(GREY);
    doc.text(`Page ${page} of ${pages}`, W - M, H - 25, { align: 'right' });
  }
  return doc;
}

export function reportFileName(title: string): string {
  const safeName = pdfSafe(title).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'manuscript';
  return `ReSync-report-${safeName}.pdf`;
}

/** The finished PDF as a Blob, for the preview that is shown before anything is downloaded. */
export function reportPdfBlob(result: V7ScanResponse, title: string, citations: PdfCitation[], locked = false, manuscriptText?: string | null, structure?: DocxBlock[] | null): Blob {
  return buildReportPdf(result, title, citations, locked, manuscriptText, structure).output('blob');
}

export function downloadReportPdf(result: V7ScanResponse, title: string, citations: PdfCitation[], locked = false, manuscriptText?: string | null, structure?: DocxBlock[] | null) {
  buildReportPdf(result, title, citations, locked, manuscriptText, structure).save(reportFileName(title));
}
