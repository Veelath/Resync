import type { V7ScanResponse } from '../services/v7Result';
import sampleResult from './sampleResult.json';

export interface Citation {
  id: string;
  ref: string;
  url: string;
  status: 'public' | 'private';
  title?: string;
  authors?: string;
  year?: number | string;
}

/**
 * The sample report is a real scan result (the ReSync capstone proposal, scanned by ReSync), saved as JSON with its ids
 * made anonymous. Its Word file is public/sample-manuscript.docx, so the sample looks exactly like a student's own report.
 */
export const SAMPLE_REPORT = sampleResult as unknown as V7ScanResponse;

// Plain-text copy of the paper, for the text view used when the Word file cannot be drawn.
export const SAMPLE_MANUSCRIPT = [SAMPLE_REPORT.manuscript_title, ...(SAMPLE_REPORT.manuscript_sections ?? []).map(section => `${section.name}\n${section.text ?? ''}`)].join('\n\n');
