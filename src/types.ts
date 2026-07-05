/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  email: string;
  name: string;
  institution?: string;
  role?: string;
  bio?: string;
}

export interface Inconsistency {
  sectionA: string;
  sectionB: string;
  inconsistencyType: 'contradiction' | 'redundancy' | 'logic_gap' | 'terminology_clash';
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  howToFix: string;
}

export interface Suggestion {
  category: 'Structure' | 'Methodology' | 'Citation' | 'Style';
  issue: string;
  explanation: string;
  remedy: string;
}

export interface CitedReference {
  citation: string;
  status: 'Accessible' | 'Unresolved' | 'Broken Link' | 'Missing Context';
  explanation: string;
}

export interface ScanResult {
  id: string;
  userId: string;
  title: string;
  documentLink: string;
  chapterType: string;
  coherenceScore: number;
  overallAssessment: string;
  correlationReport: Inconsistency[];
  suggestions: Suggestion[];
  references: CitedReference[];
  timestamp: string;
  supportingDoc?: string;
}
