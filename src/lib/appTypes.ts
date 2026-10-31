import type { ScanResult } from '../services/v7Result';

export type Screen = "home" | "upload" | "processing" | "results" | "login" | "signup" | "dashboard" | "reset-password" | "privacy" | "terms";

export type DisplayScan = ScanResult & { template_toc?: string[] };
