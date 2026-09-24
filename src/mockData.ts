import { ScanResult } from './types.js';

export const MOCK_MANUSCRIPT_TEXT = `OPTIMIZING DEEP NEURAL NETWORKS FOR LOW-POWER EDGE WEARABLES
A Capstone Research Manuscript
Department of Information Technology

CHAPTER 1: INTRODUCTION AND STATEMENT OF OBJECTIVES

1.1 Background of the Study
Recent advances in deep learning have enabled complex signal processing workloads to migrate from centralized cloud infrastructure directly onto resource-constrained edge computing devices. Within biomedical telemetry and wearable health monitors, continuous physical monitoring requires algorithmic architectures capable of inferring physiological states under severe battery limitations. Traditional wearable implementations transmit raw sensory telemetry to remote servers via Bluetooth or Wi-Fi, resulting in substantial communication latency and unsustainable power drain.

1.2 Problem Statement & Research Objectives
Deploying quantized convolutional neural networks directly onto microcontrollers introduces trade-offs between inferential accuracy, memory footprint, and operating power. Existing literature fails to demonstrate sustained multi-modal physiological telemetry execution within ultra-low-power thermal and battery envelopes. 

To resolve this limitation, this research pursues the following explicit milestones:
1. To design a structured pruning and 8-bit integer quantization pipeline for convolutional architectures tailored to biomedical timeseries.
2. The primary objective is to validate real-time biometric anomaly detection across continuous multi-lead ECG signals.
3. Target wearable deployment imposes a strict operating power budget not exceeding 50mW.
4. To establish latency and energy trade-offs between dedicated edge tensor accelerators and low-power microcontrollers.

1.3 Scope and Limitations
The scope encompasses embedded model training, quantization-aware fine-tuning, and hardware benchmark profiling. Non-biomedical sensor modalities, such as video streams and high-throughput audio, are explicitly excluded from this investigation.

CHAPTER 2: REVIEW OF RELATED LITERATURE

2.1 Model Compression Techniques for Embedded Systems
Deep neural network compression typically relies upon weight pruning, low-rank tensor approximation, and uniform quantization. As demonstrated by Smith et al. (2021), post-training quantization to INT8 representations preserves classification fidelity while reducing SRAM utilization by up to 75%. However, non-linear activation functions can trigger numeric underflow when dynamic ranges fluctuate unexpectedly across biological datasets.

2.2 Wearable Telemetry Constraints
Wearable health telemetry systems are strictly bound by skin-contact thermal thresholds and milliampere-hour battery capacities. Continuous radio transmission represents the predominant power consumer in modern smartbands. By computing anomaly classifications locally on the edge node and transmitting telemetry only when anomalies are detected, overall device battery life can be extended by an order of magnitude.

CHAPTER 3: METHODOLOGY AND EXPERIMENTAL SETUP

3.1 System Architecture
The experimental testbed evaluates quantized model performance across realistic sensor streams. Sensor inputs are sampled, buffered in static memory, and passed into the integer quantization inference engine implemented in C++ using embedded tensor kernels.

3.2 Data Acquisition Protocol
Empirical measurements were conducted using simulated biological telemetry feeds under controlled laboratory conditions. Hardware tests were conducted exclusively using a MAX30102 photoplethysmography sensor operating at 100Hz. Raw optical photoplethysmographic absorption waveforms were filtered through a second-order digital Butterworth bandpass filter before ingestion into the convolutional feature extraction pipeline.

3.3 Quantization and Compression Pipeline
The neural network topology consists of three 1D temporal convolutional blocks followed by global average pooling and a dense classification head. Quantization-aware training (QAT) was applied during the final 20 epochs of supervised fine-tuning. Quantized models were converted into optimized flatbuffer binaries suitable for static allocation without dynamic heap usage.

CHAPTER 4: RESULTS AND PERFORMANCE EVALUATION

4.1 Classification Accuracy and Precision
The quantized model achieved a 94.6% macro F1-score across benchmark test intervals, observing only a 1.2% degradation compared to full 32-bit floating point reference implementations. Signal preprocessing latency remained below 12 milliseconds per inferential window.

4.2 Energy Consumption and Thermal Footprint
Energy consumption was recorded using a high-precision digital power analyzer sampling current draw at 10kHz across multiple operating voltage levels. Peak sustained power consumption during convolutional layer processing was measured at 1.2W. While the inference engine completed execution without thermal throttling, sustained energy draw exceeded initial wearable envelope projections when running uninterrupted on the development board.

4.3 Memory Footprint Analysis
Static flash consumption remained under 180 kilobytes, well within the 512-kilobyte ceiling of standard ARM Cortex-M4 architectures. SRAM peak allocation was measured at 42 kilobytes during matrix multiplications.

CHAPTER 5: CONCLUSION AND RECOMMENDATIONS

5.1 Summary of Findings
The empirical findings demonstrate that INT8 convolutional quantization enables high-accuracy physiological classification on edge hardware with minimal loss of discriminative performance. Nonetheless, architectural alignment between initial design objectives and hardware implementation remains critical for practical deployment.

5.2 Recommendations for Future Work
Future iterations should implement dynamic duty cycling and investigate low-power sleep states between inferential windows to reduce average power consumption to target wearable thresholds.`;

export const MOCK_SCAN_RESULT: ScanResult = {
  id: 'mock-demo-scan',
  analysis_run_id: 'mock-demo-scan',
  userId: 'demo-user',
  user_id: 'demo-user',
  title: 'Optimizing Deep Neural Networks for Low-Power Edge Wearables',
  documentLink: 'https://docs.google.com/document/d/1demo-edge-wearable-thesis/edit',
  doc_url: 'https://docs.google.com/document/d/1demo-edge-wearable-thesis/edit',
  chapterType: 'Chapter 1 to Chapter 5 (Full Manuscript)',
  coherenceScore: 78,
  overall_coherence_score: 78,
  overallAssessment: 'Moderate-to-High Coherence. The manuscript demonstrates strong experimental execution and clear algorithmic contributions. However, two critical disconnects exist between Chapter 1 stated objectives and Chapter 3 implementation details, alongside an unverified reference citation.',
  
  sections_analyzed: [
    'Chapter 1: Introduction',
    'Chapter 2: Literature Review',
    'Chapter 3: Methodology',
    'Chapter 4: Results',
    'Chapter 5: Conclusion'
  ],
  has_all_required_sections: true,
  auto_detected: true,
  detection_confidence: 0.96,

  score_breakdown: {
    overall_score: 78,
    band: 'Moderate Coherence',
    structural_completeness_score: 95,
    cross_chapter_coherence_score: 72,
    citation_integrity_score: 80,
    biggest_lever: {
      criterion: 'Cross-chapter coherence',
      current_score: 72,
      potential_point_gain: 14,
      reason: 'Harmonize Chapter 1 objectives with Chapter 3 sensor protocol and Chapter 4 power measurements.'
    },
    structural_detail: {
      present_required: ['Introduction', 'Literature Review', 'Methodology', 'Results', 'Conclusion'],
      missing_required: [],
      present_optional: ['Recommendations'],
      missing_optional: [],
      stub_sections: []
    },
    coherence_detail: {
      unevaluable_weight_fraction: 0.0,
      pair_scores: [
        {
          role_a: 'Methodology',
          role_b: 'Results',
          score: 88,
          weight: 0.35,
          included: true,
          raw_similarity: 0.91
        },
        {
          role_a: 'Introduction',
          role_b: 'Results',
          score: 76,
          weight: 0.30,
          included: true,
          raw_similarity: 0.81
        },
        {
          role_a: 'Introduction',
          role_b: 'Methodology',
          score: 64,
          weight: 0.35,
          included: true,
          raw_similarity: 0.69
        }
      ],
      dismissed_pairs: [
        {
          role_a: 'Literature Review',
          role_b: 'Results',
          score: 58,
          reason: 'Theoretical quantization background does not conflict with empirical telemetry results.'
        }
      ]
    },
    citation_detail: {
      well_formed_ratio: 1.0,
      link_resolution_rate: 0.5,
      cross_match_score: 85,
      total_entries: 2
    }
  },

  verifications: [
    {
      role_a: 'Methodology',
      role_b: 'Results',
      score: 88,
      alignment: 'substantive',
      note: 'The experimental benchmark protocol directly evaluates every neural network quantization model described in the methodology.'
    },
    {
      role_a: 'Introduction',
      role_b: 'Results',
      score: 76,
      alignment: 'substantive',
      note: 'Edge inference latency benchmarks address the core low-power constraints stated in the research scope.'
    }
  ],

  inconsistencies: [
    {
      inconsistency_id: 'inc_obj_meth_01',
      section_a: 'Chapter 1: Research Objectives',
      section_b: 'Chapter 3: Methodology',
      severity: 'High',
      explanation_what: 'Biometric ECG telemetry collection is promised in the core objectives but omitted from the experimental setup.',
      explanation_why: 'The manuscript promises multi-modal ECG acquisition in Section 1.2, but Chapter 3 only specifies PPG optical sensors and synthetic accelerometer data.',
      suggested_fix: 'Incorporate the ECG telemetry acquisition hardware in Chapter 3 or amend Objective 2 in Chapter 1 to focus solely on PPG optical sensors.',
      evidence_a: 'The primary objective is to validate real-time biometric anomaly detection across continuous multi-lead ECG signals.',
      evidence_b: 'Hardware tests were conducted exclusively using a MAX30102 photoplethysmography sensor operating at 100Hz.',
      evidence_verified: true,
      objectives_unaddressed: ['Objective 1.2: Validate multi-lead ECG real-time acquisition on MCU']
    },
    {
      inconsistency_id: 'inc_pwr_spec_02',
      section_a: 'Chapter 1: Hardware Specifications',
      section_b: 'Chapter 4: Results & Power Metrics',
      severity: 'Medium',
      explanation_what: 'Wearable power ceiling is specified as 50mW, but benchmarks report 1.2W draw.',
      explanation_why: 'A twenty-four-fold discrepancy exists between the stated wearable battery envelope and the tested development board benchmark.',
      suggested_fix: 'Clarify that the 1.2W reading represents an unconstrained development baseline prior to MCU duty-cycling and sleep modes.',
      evidence_a: 'Target wearable deployment imposes a strict operating power budget not exceeding 50mW.',
      evidence_b: 'Peak sustained power consumption during convolutional layer processing was measured at 1.2W.',
      evidence_verified: true
    }
  ],
  correlationReport: [], // legacy alias

  citations: [
    {
      citation_raw_reference_text: 'Smith, J. (2021). Wearable Neural Networks for Cardiology. Journal of Mobile Health, vol 12. doi:10.1016/j.jmh.2021.04.12',
      citation_status: 'verified_metadata',
      citation_primary_link: 'https://doi.org/10.1016/j.jmh.2021.04.12',
      explanation: 'Confirmed against Crossref metadata — the DOI resolves to this exact work.',
      citation_is_accessible: true,
      citation_is_cited_in_text: true
    },
    {
      citation_raw_reference_text: 'Chen, X., & Patel, S. (2023). Low-Power Quantization for Microcontrollers. IEEE Transactions on Wearables.',
      citation_status: 'broken',
      citation_primary_link: 'https://ieeexplore.ieee.org/document/broken-link-example',
      explanation: 'Unreachable or broken reference link (HTTP 404).',
      citation_is_accessible: false,
      citation_is_cited_in_text: true
    }
  ],
  references: [], // legacy alias

  suggestions: [
    {
      category: 'Methodology',
      issue: 'Sensor Modality Mismatch',
      explanation: 'Objective 2 promises ECG telemetry validation, while Chapter 3 only instruments PPG optical sensors.',
      remedy: 'Harmonize Chapter 1 and Chapter 3 by either adding ECG testing or scoping down the objective.'
    },
    {
      category: 'Citation',
      issue: 'Broken IEEE Reference',
      explanation: 'The link for Chen & Patel (2023) returns a 404 error.',
      remedy: 'Replace the URL with a registered DOI or accessible archive.'
    }
  ],

  timestamp: new Date().toISOString()
};
