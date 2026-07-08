/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getScoreTier } from '../utils.js';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showDetails?: boolean;
  showSubtext?: boolean;
  className?: string;
}

export default function ScoreRing({ 
  score, 
  size = 120, 
  strokeWidth = 10, 
  showDetails = true,
  showSubtext = showDetails,
  className = "p-2"
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const { strokeColor, bgColor, textColor, label } = getScoreTier(score);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
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
          <span className={`font-mono font-bold text-slate-800 ${size < 80 ? 'text-sm' : size <= 100 ? 'text-lg' : 'text-3xl'}`}>{score}</span>
          {showSubtext && <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold -mt-1 font-mono">/ 100</span>}
        </div>
      </div>
      {showDetails && (
        <span className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}>
          {label}
        </span>
      )}
    </div>
  );
}

