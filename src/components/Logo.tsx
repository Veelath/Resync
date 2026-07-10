import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
}

export default function Logo({ className = 'h-9', variant = 'full' }: LogoProps) {
  // Polar to Cartesian conversion for SVG paths
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const rad = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  // Generates a curved pencil body segment (arc)
  const getArcPath = (cx: number, cy: number, rIn: number, rOut: number, start: number, end: number) => {
    const pStartOut = polarToCartesian(cx, cy, rOut, start);
    const pEndOut = polarToCartesian(cx, cy, rOut, end);
    const pStartIn = polarToCartesian(cx, cy, rIn, start);
    const pEndIn = polarToCartesian(cx, cy, rIn, end);
    
    return `M ${pStartOut.x.toFixed(2)} ${pStartOut.y.toFixed(2)} ` +
           `A ${rOut} ${rOut} 0 0 1 ${pEndOut.x.toFixed(2)} ${pEndOut.y.toFixed(2)} ` +
           `L ${pEndIn.x.toFixed(2)} ${pEndIn.y.toFixed(2)} ` +
           `A ${rIn} ${rIn} 0 0 0 ${pStartIn.x.toFixed(2)} ${pStartIn.y.toFixed(2)} ` +
           `Z`;
  };

  // Generates a path for a concentric line (stripe) inside the pencil body
  const getLinePath = (cx: number, cy: number, r: number, start: number, end: number) => {
    const pStart = polarToCartesian(cx, cy, r, start);
    const pEnd = polarToCartesian(cx, cy, r, end);
    return `M ${pStart.x.toFixed(2)} ${pStart.y.toFixed(2)} A ${r} ${r} 0 0 1 ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)}`;
  };

  // Generates the wood tip path of the pencil
  const getWoodTipPath = (cx: number, cy: number, rIn: number, rOut: number, start: number, end: number) => {
    const rMid = (rIn + rOut) / 2;
    const rLeadOut = rMid + (rOut - rIn) * 0.15;
    const rLeadIn = rMid - (rOut - rIn) * 0.15;
    
    const pStartOut = polarToCartesian(cx, cy, rOut, start);
    const pStartIn = polarToCartesian(cx, cy, rIn, start);
    const pEndOut = polarToCartesian(cx, cy, rLeadOut, end);
    const pEndIn = polarToCartesian(cx, cy, rLeadIn, end);
    
    return `M ${pStartOut.x.toFixed(2)} ${pStartOut.y.toFixed(2)} ` +
           `L ${pEndOut.x.toFixed(2)} ${pEndOut.y.toFixed(2)} ` +
           `L ${pEndIn.x.toFixed(2)} ${pEndIn.y.toFixed(2)} ` +
           `L ${pStartIn.x.toFixed(2)} ${pStartIn.y.toFixed(2)} ` +
           `Z`;
  };

  // Generates the graphite lead tip path of the pencil
  const getLeadTipPath = (cx: number, cy: number, rIn: number, rOut: number, start: number, end: number) => {
    const rMid = (rIn + rOut) / 2;
    const rLeadOut = rMid + (rOut - rIn) * 0.15;
    const rLeadIn = rMid - (rOut - rIn) * 0.15;
    
    const pStartOut = polarToCartesian(cx, cy, rLeadOut, start);
    const pStartIn = polarToCartesian(cx, cy, rLeadIn, start);
    const pEnd = polarToCartesian(cx, cy, rMid, end);
    
    return `M ${pStartOut.x.toFixed(2)} ${pStartOut.y.toFixed(2)} ` +
           `L ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)} ` +
           `L ${pStartIn.x.toFixed(2)} ${pStartIn.y.toFixed(2)} ` +
           `Z`;
  };

  // Dimensions & parameters
  const cx = variant === 'full' ? 120 : 25;
  const cy = 25;
  const rOut = 20;
  const rIn = 12;
  const rMid = (rOut + rIn) / 2;
  const thickness = rOut - rIn;

  // Colors
  const colors = {
    brandBlue: '#131bb4',      // Deep royal blue for letters and main bodies
    pencilBody: '#1e40af',     // Indigo-800 for pencil body base
    pencilStripe: '#60a5fa',   // Lighter blue for pencil body stripes
    eraser: '#0f172a',         // Deep slate dark blue for erasers
    ferrule: '#ffffff',        // White/silver for metal ring
    wood: '#fde047',           // Yellow-300 for wood tip
  };

  // Pencil 1 angles (top-right, clockwise)
  const p1 = {
    eraserStart: -20,
    eraserEnd: -5,
    ferruleStart: -5,
    ferruleEnd: 5,
    bodyStart: 5,
    bodyEnd: 120,
    woodStart: 120,
    woodEnd: 135,
    leadStart: 135,
    leadEnd: 140,
  };

  // Pencil 2 angles (bottom-left, clockwise, shifted by 180 deg)
  const p2 = {
    eraserStart: 160,
    eraserEnd: 175,
    ferruleStart: 175,
    ferruleEnd: 185,
    bodyStart: 185,
    bodyEnd: 300,
    woodStart: 300,
    woodEnd: 315,
    leadStart: 315,
    leadEnd: 320,
  };

  const viewBoxWidth = variant === 'full' ? 150 : 50;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} 50`}
      className={`${className} overflow-visible`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft premium drop shadow filter */}
        <filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.22" floodColor="#000000" />
        </filter>
      </defs>

      <g filter="url(#logo-shadow)">
        {variant === 'full' && (
          <g>
            {/* Outline/Border for 'RE' */}
            <text
              x="8"
              y="37"
              fill="white"
              stroke="white"
              strokeWidth="6"
              strokeLinejoin="round"
              className="select-none font-black"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '34px',
                letterSpacing: '-0.04em',
                fontWeight: 900,
              }}
            >
              RE
            </text>
            {/* Fill for 'RE' */}
            <text
              x="8"
              y="37"
              fill={colors.brandBlue}
              className="select-none font-black"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '34px',
                letterSpacing: '-0.04em',
                fontWeight: 900,
              }}
            >
              RE
            </text>

            {/* Colon ':' */}
            <text
              x="72"
              y="37"
              fill="white"
              stroke="white"
              strokeWidth="6"
              strokeLinejoin="round"
              className="select-none font-black"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '34px',
                fontWeight: 900,
              }}
            >
              :
            </text>
            <text
              x="72"
              y="37"
              fill={colors.brandBlue}
              className="select-none font-black"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '34px',
                fontWeight: 900,
              }}
            >
              :
            </text>
          </g>
        )}

        {/* Pencil Circle Container */}
        <g>
          {/* ==================== PENCIL 1 (Top Right) ==================== */}
          {/* Eraser */}
          <path
            d={getArcPath(cx, cy, rIn, rOut, p1.eraserStart, p1.eraserEnd)}
            fill={colors.eraser}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Metal Ferrule */}
          <path
            d={getArcPath(cx, cy, rIn, rOut, p1.ferruleStart, p1.ferruleEnd)}
            fill={colors.ferrule}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Pencil Body */}
          <path
            d={getArcPath(cx, cy, rIn, rOut, p1.bodyStart, p1.bodyEnd)}
            fill={colors.brandBlue}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Pencil Body Stripes/Grain */}
          <path
            d={getLinePath(cx, cy, rIn + thickness * 0.33, p1.bodyStart, p1.bodyEnd)}
            fill="none"
            stroke={colors.pencilStripe}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d={getLinePath(cx, cy, rIn + thickness * 0.67, p1.bodyStart, p1.bodyEnd)}
            fill="none"
            stroke={colors.pencilStripe}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          {/* Wood Tip */}
          <path
            d={getWoodTipPath(cx, cy, rIn, rOut, p1.woodStart, p1.woodEnd)}
            fill={colors.wood}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Graphite Lead Tip */}
          <path
            d={getLeadTipPath(cx, cy, rIn, rOut, p1.leadStart, p1.leadEnd)}
            fill={colors.brandBlue}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />

          {/* ==================== PENCIL 2 (Bottom Left) ==================== */}
          {/* Eraser */}
          <path
            d={getArcPath(cx, cy, rIn, rOut, p2.eraserStart, p2.eraserEnd)}
            fill={colors.eraser}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Metal Ferrule */}
          <path
            d={getArcPath(cx, cy, rIn, rOut, p2.ferruleStart, p2.ferruleEnd)}
            fill={colors.ferrule}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Pencil Body */}
          <path
            d={getArcPath(cx, cy, rIn, rOut, p2.bodyStart, p2.bodyEnd)}
            fill={colors.brandBlue}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Pencil Body Stripes/Grain */}
          <path
            d={getLinePath(cx, cy, rIn + thickness * 0.33, p2.bodyStart, p2.bodyEnd)}
            fill="none"
            stroke={colors.pencilStripe}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d={getLinePath(cx, cy, rIn + thickness * 0.67, p2.bodyStart, p2.bodyEnd)}
            fill="none"
            stroke={colors.pencilStripe}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          {/* Wood Tip */}
          <path
            d={getWoodTipPath(cx, cy, rIn, rOut, p2.woodStart, p2.woodEnd)}
            fill={colors.wood}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Graphite Lead Tip */}
          <path
            d={getLeadTipPath(cx, cy, rIn, rOut, p2.leadStart, p2.leadEnd)}
            fill={colors.brandBlue}
            stroke="white"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
