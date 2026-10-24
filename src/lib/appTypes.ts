import type { ScanResponse } from '../services/api';

export type Screen = "home" | "upload" | "processing" | "results" | "login" | "signup" | "dashboard" | "reset-password";

export type DisplayScan = ScanResponse & { template_toc?: string[] };
