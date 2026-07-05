/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showDetails?: boolean;
}

export default function ScoreRing({ score, size = 120, strokeWidth = 10, showDetails = true }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Color selection based on score tier
  let strokeColor = 'stroke-rose-500';
  let bgColor = 'bg-rose-50 text-rose-700';
  let label = 'Low Integrity';

  if (score >= 85) {
    strokeColor = 'stroke-emerald-600';
    bgColor = 'bg-emerald-50 text-emerald-800';
    label = 'Excellent Flow';
  } else if (score >= 70) {
    strokeColor = 'stroke-amber-500';
    bgColor = 'bg-amber-50 text-amber-800';
    label = 'Moderate Coherence';
  }

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-100 fill-none"
            strokeWidth={strokeWidth}
          />
          {/* Animated Foreground Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`fill-none transition-all duration-1000 ease-out ${strokeColor}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        {/* Centered Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono font-bold text-slate-800 ${showDetails ? 'text-3xl' : 'text-sm'}`}>{score}</span>
          {showDetails && <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">/ 100</span>}
        </div>
      </div>
      {showDetails && (
        <span className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold ${bgColor}`}>
          {label}
        </span>
      )}
    </div>
  );
}
