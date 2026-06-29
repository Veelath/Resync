/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult, Inconsistency, Suggestion, CitedReference } from "../types.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Extract Google Docs ID
export function extractDocId(url: string): string | null {
  const regExp = /\/document\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// Fetch public Google Docs text
export async function fetchGoogleDocText(docId: string): Promise<string> {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document. Status: ${response.status}. Make sure the link is set to "Anyone with the link can view".`);
  }
  return await response.text();
}

// High-fidelity sample manuscript for instant testing
const SAMPLE_MANUSCRIPT = `
Title: Optimizing Deep Neural Networks for Low-Power Edge Wearables

Abstract:
This study presents an optimized lightweight neural network architecture, EdgeNet, designed specifically for real-time heart rate anomaly detection on wearable edge devices. We demonstrate a 40% reduction in power consumption compared to standard CNNs with only a 0.5% drop in accuracy.

Chapter 1: Introduction
Edge computing is vital for immediate medical telemetry. Traditional models run on cloud infrastructure due to massive parameter sizes, incurring latencies of over 500ms which are unacceptable for cardiac monitoring. We propose using EdgeNet, which maintains a model size under 2.5MB. In this section, we assume a continuous stream of photoplethysmography (PPG) sampling at 100Hz. Section 1.3 details that we exclusively utilize integer-only quantization (INT8) to achieve high hardware compatibility on low-cost ARM Cortex-M microcontrollers.

Chapter 2: Related Work
Prior works like WearableNet (Smith et al., 2021) and PulseML (Johnson & Patel, 2023) have leveraged convolutional neural networks. Smith et al. (2021) achieved 92% accuracy but required floating-point arithmetic (FP32), which drains typical 300mAh lithium batteries in under 6 hours.

Chapter 3: Methodology
To evaluate EdgeNet, we trained the network using the MIT-BIH Arrhythmia Database. The input layer accepts 1D sequences of size 180.
Contrary to the INT8 design stated in Chapter 1, we implemented the system using FP32 (single-precision floating point) computations on the microcontroller to maximize signal clarity, as our microcontrollers have dedicated FPUs. Wait, this introduces high battery drain. Furthermore, we utilized a sampling rate of 250Hz for the PPG data stream, differing from the 100Hz sampling baseline mentioned in the Introduction.

Chapter 4: Results
The evaluation was executed on an STM32 Nucleo board. However, for power benchmarking, we performed the testing on an NVIDIA Jetson Nano GPU instead. The power metrics show an average draw of 1.2 Watts, which violates our edge wearable constraint of < 50 milli-Watts.
We list our citations:
1. Smith, J. (2021). "Wearable Neural Networks for Cardiology." Journal of Mobile Health, vol 12. https://doi.org/10.1016/j.jmh.2021.04.12
2. Johnson, A., & Patel, S. (2023). "PulseML: Real-time Signal Processing." IEEE Transactions on Wearables. https://invalidlink.example.com/pulseml-paper-notfound
3. Davis, L. (2024). "FPGA vs MCU in Wearable Computing." (Self-published blog post, no peer review).
`;

export async function analyzeManuscript(
  docLink: string,
  chapterType: string,
  customTopic?: string
): Promise<{
  title: string;
  coherenceScore: number;
  overallAssessment: string;
  correlationReport: Inconsistency[];
  suggestions: Suggestion[];
  references: CitedReference[];
}> {
  let docText = "";
  let usingSample = false;
  let fetchErrorMsg = "";

  const docId = extractDocId(docLink);
  if (docId) {
    try {
      docText = await fetchGoogleDocText(docId);
      // Clean text slightly if needed
      if (docText.trim().length < 50) {
        throw new Error("The retrieved document content is too short to analyze.");
      }
    } catch (err: any) {
      console.warn("Could not fetch Google Doc, falling back to rich sample analysis:", err.message);
      fetchErrorMsg = err.message;
      usingSample = true;
    }
  } else {
    usingSample = true;
  }

  if (usingSample) {
    docText = SAMPLE_MANUSCRIPT;
    if (customTopic) {
      docText = `Title: AI-Driven Manuscript Analysis of: ${customTopic}\n\n` + docText;
    }
  }

  const systemInstruction = `You are Resync AI, a premier academic coherence auditor and manuscript analyzer.
Your job is to thoroughly analyze the provided manuscript text, detect sections that are logically inconsistent, audit references, and output your findings in a structured JSON response.

Be rigorous and highly specific:
- Coherence Score: Provide an overall manuscript integrity score (0-100). If the document has blatant contradictions, lower the score.
- Overall Assessment: Write a detailed summary evaluation of the manuscript (strength, weaknesses, flow).
- Correlation Report: Find contradictions or terminology clashes. Explicitly reference Section A and Section B (e.g. Chapter 1 vs Chapter 3).
- Suggestions: Provide concrete steps to resolve the inconsistencies, categorize them under 'Structure', 'Methodology', 'Style', or 'Citation'.
- References: Analyze the bibliographical references cited in the text or listed at the end. Check if they are valid, peer-reviewed, or have unresolved links.

Your output must strictly follow the JSON schema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Manuscript Chapter Context: ${chapterType}\n\nDocument Text:\n${docText}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Extracted or inferred manuscript title" },
            coherenceScore: { type: Type.INTEGER, description: "Overall manuscript integrity score out of 100" },
            overallAssessment: { type: Type.STRING, description: "Detailed summary assessment" },
            correlationReport: {
              type: Type.ARRAY,
              description: "List of logical inconsistencies or clashes found across sections",
              items: {
                type: Type.OBJECT,
                properties: {
                  sectionA: { type: Type.STRING, description: "First section involved, e.g. Chapter 1" },
                  sectionB: { type: Type.STRING, description: "Contradicting section, e.g. Chapter 3" },
                  inconsistencyType: {
                    type: Type.STRING,
                    description: "Type of inconsistency",
                    enum: ["contradiction", "redundancy", "logic_gap", "terminology_clash"]
                  },
                  description: { type: Type.STRING, description: "Explanation of the logical mismatch" },
                  severity: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  howToFix: { type: Type.STRING, description: "Actionable fix" }
                },
                required: ["sectionA", "sectionB", "inconsistencyType", "description", "severity", "howToFix"]
              }
            },
            suggestions: {
              type: Type.ARRAY,
              description: "Structured improvements to help researchers improve the paper before defense",
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, enum: ["Structure", "Methodology", "Style", "Citation"] },
                  issue: { type: Type.STRING, description: "Summary of the issue" },
                  explanation: { type: Type.STRING, description: "Detailed reason" },
                  remedy: { type: Type.STRING, description: "Step-by-step remedy" }
                },
                required: ["category", "issue", "explanation", "remedy"]
              }
            },
            references: {
              type: Type.ARRAY,
              description: "Audited references list",
              items: {
                type: Type.OBJECT,
                properties: {
                  citation: { type: Type.STRING, description: "Citation text/author/year" },
                  status: { type: Type.STRING, enum: ["Accessible", "Unresolved", "Broken Link", "Missing Context"] },
                  explanation: { type: Type.STRING, description: "Audit details about this reference" }
                },
                required: ["citation", "status", "explanation"]
              }
            }
          },
          required: ["title", "coherenceScore", "overallAssessment", "correlationReport", "suggestions", "references"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    
    // If we used the sample, prepend a warning about Google Doc fetch failure
    if (usingSample && fetchErrorMsg) {
      parsed.overallAssessment = `[Notice: We could not access the Google Doc link directly (${fetchErrorMsg}). To showcase the Resync system, we performed a high-fidelity audit of our standard edge wearables manuscript instead.]\n\n${parsed.overallAssessment}`;
    } else if (usingSample) {
      parsed.overallAssessment = `[Notice: Utilizing our demo academic manuscript template for Resync's interactive scan.]\n\n${parsed.overallAssessment}`;
    }

    return parsed;
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    // Return structured default in case of rate limits or failures
    return {
      title: customTopic || "Edge Computing Wearable Analysis",
      coherenceScore: 72,
      overallAssessment: "Analysis fell back to standard template due to an API error: " + error.message,
      correlationReport: [
        {
          sectionA: "Chapter 1: Introduction",
          sectionB: "Chapter 3: Methodology",
          inconsistencyType: "contradiction",
          description: "Chapter 1 defines INT8 low-power quantizations but Chapter 3 implements FP32 floating point computations.",
          severity: "High",
          howToFix: "Synchronize the hardware precision mode across both sections."
        }
      ],
      suggestions: [
        {
          category: "Methodology",
          issue: "Precision Discrepancy",
          explanation: "Inconsistent mathematical precisions listed.",
          remedy: "Align target data representations."
        }
      ],
      references: [
        {
          citation: "Smith et al. (2021)",
          status: "Accessible",
          explanation: "Matches valid journal record DOI."
        }
      ]
    };
  }
}
