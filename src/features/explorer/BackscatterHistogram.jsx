import React, { useRef, useCallback } from 'react';

/**
 * Team Zenith Bimodal Backscatter Histogram
 *
 * Plots backscatter distributions for Date A (Lavender #A78BFA) and Date B (Crimson #FB7185).
 * Features an interactive draggable vertical threshold marker line with live Otsu markers.
 */
export default function BackscatterHistogram({
  histogram,
  activeThresholdDb = -18.0,
  onThresholdChange,
  otsuA,
  otsuB,
  dateALabel = 'Date A',
  dateBLabel = 'Date B',
}) {
  const svgRef = useRef(null);
  const isDraggingRef = useRef(false);

  const minDb = histogram?.minDb ?? -28.0;
  const maxDb = histogram?.maxDb ?? -2.0;
  const binCenters = histogram?.binCenters ?? [];
  const countsA = histogram?.countsA ?? [];
  const countsB = histogram?.countsB ?? [];

  // Find maximum count for vertical normalization
  const maxCount = Math.max(
    1,
    ...countsA,
    ...countsB
  );

  const width = 480;
  const height = 150;
  const padLeft = 38;
  const padRight = 16;
  const padTop = 22;
  const padBottom = 26;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const dbToX = useCallback(
    (db) => {
      const clamped = Math.max(minDb, Math.min(maxDb, db));
      const ratio = (clamped - minDb) / (maxDb - minDb);
      return padLeft + ratio * chartWidth;
    },
    [minDb, maxDb, padLeft, chartWidth]
  );

  const xToDb = useCallback(
    (clientX) => {
      if (!svgRef.current) return activeThresholdDb;
      const rect = svgRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, (relativeX - padLeft) / chartWidth));
      const db = minDb + ratio * (maxDb - minDb);
      return Math.round(db * 10) / 10;
    },
    [minDb, maxDb, padLeft, chartWidth, activeThresholdDb]
  );

  const handlePointerDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const newDb = xToDb(e.clientX);
    onThresholdChange?.(newDb);

    const onPointerMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const scrubDb = xToDb(moveEvent.clientX);
      onThresholdChange?.(scrubDb);
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Build SVG polygon paths for A and B
  const buildAreaPath = (counts) => {
    if (!counts.length || !binCenters.length) return '';
    const points = [];
    const baseY = padTop + chartHeight;

    points.push(`${padLeft},${baseY}`);
    for (let i = 0; i < counts.length; i++) {
      const x = dbToX(binCenters[i]);
      const y = padTop + chartHeight - (counts[i] / maxCount) * chartHeight;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    points.push(`${padLeft + chartWidth},${baseY}`);
    return points.join(' ');
  };

  const pathA = buildAreaPath(countsA);
  const pathB = buildAreaPath(countsB);

  const thresholdX = dbToX(activeThresholdDb);
  const otsuAx = otsuA != null ? dbToX(otsuA) : null;
  const otsuBx = otsuB != null ? dbToX(otsuB) : null;

  // Grid tick marks at -25, -20, -15, -10, -5 dB
  const ticks = [-25, -20, -15, -10, -5];

  return (
    <div className="x-bimodal-histogram">
      <style>{`
        .x-bimodal-histogram {
          background: rgba(8, 8, 12, 0.92);
          border: 1px solid rgba(244, 244, 246, 0.1);
          border-radius: 8px;
          padding: 12px 14px 10px;
          position: relative;
          user-select: none;
        }
        .x-hist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .x-hist-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #F4F4F6;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .x-hist-legends {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-variant-numeric: tabular-nums;
        }
        .x-hist-legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(244, 244, 246, 0.72);
        }
        .x-hist-swatch-a {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: #A78BFA;
          border: 1px solid #C4B5FD;
        }
        .x-hist-swatch-b {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: #FB7185;
          border: 1px solid #E11D48;
        }
        .x-hist-thresh-badge {
          background: rgba(225, 29, 72, 0.18);
          border: 1px solid rgba(225, 29, 72, 0.45);
          color: #FB7185;
          padding: 1px 7px;
          border-radius: 4px;
          font-weight: 700;
        }
        .x-hist-svg-wrap {
          position: relative;
          width: 100%;
          cursor: ew-resize;
        }
        .x-hist-svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .x-hist-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: rgba(244, 244, 246, 0.5);
        }
        .x-hist-physics-hint {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      <div className="x-hist-header">
        <span className="x-hist-title">
          <span>Bimodal Backscatter Spectrum</span>
        </span>
        <div className="x-hist-legends">
          <span className="x-hist-legend-item">
            <span className="x-hist-swatch-a" />
            <span>A: {dateALabel}</span>
          </span>
          <span className="x-hist-legend-item">
            <span className="x-hist-swatch-b" />
            <span>B: {dateBLabel}</span>
          </span>
          <span className="x-hist-thresh-badge">
            T = {activeThresholdDb.toFixed(1)} dB
          </span>
        </div>
      </div>

      <div
        className="x-hist-svg-wrap"
        ref={svgRef}
        onPointerDown={handlePointerDown}
        title="Click or drag to adjust water classification threshold (dB)"
      >
        <svg
          className="x-hist-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Grid lines and dB axis ticks */}
          {ticks.map((t) => {
            const x = dbToX(t);
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartHeight}
                  stroke="rgba(244, 244, 246, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={x}
                  y={padTop + chartHeight + 16}
                  fill="rgba(244, 244, 246, 0.45)"
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Base baseline */}
          <line
            x1={padLeft}
            y1={padTop + chartHeight}
            x2={padLeft + chartWidth}
            y2={padTop + chartHeight}
            stroke="rgba(244, 244, 246, 0.2)"
            strokeWidth="1"
          />

          {/* Water valley indicator zone */}
          <rect
            x={dbToX(-24)}
            y={padTop}
            width={dbToX(-16) - dbToX(-24)}
            height={chartHeight}
            fill="rgba(76, 29, 149, 0.12)"
          />

          {/* Histogram distribution curves */}
          {pathA && (
            <polygon
              points={pathA}
              fill="url(#gradA)"
              stroke="#A78BFA"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          )}
          {pathB && (
            <polygon
              points={pathB}
              fill="url(#gradB)"
              stroke="#FB7185"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          )}

          {/* Otsu Reference markers */}
          {otsuAx && (
            <g opacity="0.8">
              <line
                x1={otsuAx}
                y1={padTop + 4}
                x2={otsuAx}
                y2={padTop + chartHeight}
                stroke="#C4B5FD"
                strokeWidth="1"
                strokeDasharray="1 3"
              />
              <text
                x={otsuAx}
                y={padTop + 2}
                fill="#C4B5FD"
                fontSize="8"
                fontFamily="'JetBrains Mono', monospace"
                textAnchor="middle"
              >
                Otsu A
              </text>
            </g>
          )}

          {otsuBx && (
            <g opacity="0.8">
              <line
                x1={otsuBx}
                y1={padTop + 4}
                x2={otsuBx}
                y2={padTop + chartHeight}
                stroke="#FB7185"
                strokeWidth="1"
                strokeDasharray="1 3"
              />
              <text
                x={otsuBx}
                y={padTop + 2}
                fill="#FB7185"
                fontSize="8"
                fontFamily="'JetBrains Mono', monospace"
                textAnchor="middle"
              >
                Otsu B
              </text>
            </g>
          )}

          {/* Active interactive threshold marker line */}
          <line
            x1={thresholdX}
            y1={padTop - 8}
            x2={thresholdX}
            y2={padTop + chartHeight}
            stroke="#F4F4F6"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          {/* Draggable knob handle */}
          <circle
            cx={thresholdX}
            cy={padTop - 8}
            r="5.5"
            fill="#E11D48"
            stroke="#F4F4F6"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="x-hist-footer">
        <div className="x-hist-physics-hint">
          <span>◄ Calm Water Peak (Low dB)</span>
          <span>·</span>
          <span>Rough Land & Canopy (High dB) ►</span>
        </div>
        <span>Drag slider to tune water/flood boundary</span>
      </div>
    </div>
  );
}
