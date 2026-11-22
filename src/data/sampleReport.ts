import type { V7ScanResponse } from '../services/v7Result';
import sampleResult from './sampleResult.json';
import coherentSample from './samples/coherent.json';
import numbersSample from './samples/numbers.json';
import mismatchSample from './samples/mismatch.json';

export interface Citation {
  id: string;
  ref: string;
  url: string;
  status: 'public' | 'private';
  noLink?: boolean;
  title?: string;
  authors?: string;
  year?: number | string;
}

/**
 * The sample report is a real scan result (the Resync capstone proposal, scanned by Resync), saved as JSON with its ids
 * made anonymous. Its Word file is public/sample-manuscript.docx, so the sample looks exactly like a student's own report.
 */
export const SAMPLE_REPORT = sampleResult as unknown as V7ScanResponse;

/**
 * Sample papers that score differently, so a visitor (and the PDF) can see a strong paper, a paper with numbers that do not match and a
 * paper whose method, results and conclusion disagree. Each is a real scan result made by the Resync pipeline from a short demonstration
 * paper, with anonymous ids. They are demonstrations, not real students' work.
 */
export interface SamplePaper { id: string; label: string; summary: string; result: V7ScanResponse }
export const SAMPLE_PAPERS: SamplePaper[] = [
  { id: 'capstone', label: 'Capstone thesis (long paper)', summary: 'A full thesis with many sections', result: SAMPLE_REPORT },
  { id: 'coherent', label: 'Coherent study (strong)', summary: 'Sections agree with each other', result: coherentSample as unknown as V7ScanResponse },
  { id: 'numbers', label: 'Numbers do not match', summary: 'Sample size, duration and statistics change between sections', result: numbersSample as unknown as V7ScanResponse },
  { id: 'mismatch', label: 'Method and conclusion mismatch', summary: 'The method, results and conclusion disagree', result: mismatchSample as unknown as V7ScanResponse },
];
export const sampleById = (id: string | null | undefined): SamplePaper => SAMPLE_PAPERS.find(paper => paper.id === id) ?? SAMPLE_PAPERS[0];

// Plain-text copy of the paper, for the text view used when the Word file cannot be drawn.
