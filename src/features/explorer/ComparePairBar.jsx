import React from 'react';
import {
  ArrowLeftRight,
  Eye,
  Layers,
  Sparkles,
  SplitSquareVertical,
  X,
  Zap,
} from 'lucide-react';

function formatDate(val) {
  if (!val) return 'Date unavailable';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? str : d.toISOString().slice(0, 10);
  } catch {
    return str;
  }
}

function calculateDayDiff(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return null;
  const timeA = Date.parse(`${dateStrA}T00:00:00Z`);
  const timeB = Date.parse(`${dateStrB}T00:00:00Z`);
  if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) return null;
  const days = Math.round(Math.abs(timeB - timeA) / (1000 * 60 * 60 * 24));
  return `${days} Days`;
}

export default function ComparePairBar({
  comparePair = null,
  activePartner = null,
  changeProduct = null,
  onStartAutoCompare,
  compareLayerMode = 'floodMask',
  onSetCompareMode,
  compareOpacity = 0.9,
  onOpacityChange,
  onSwapCompare,
  onExitCompare,
}) {
  const granuleA = comparePair?.granuleA;
  const granuleB = comparePair?.granuleB;
  const isComparing = Boolean(granuleA && granuleB);

  const pA = granuleA?.properties ?? granuleA ?? {};
  const pB = granuleB?.properties ?? granuleB ?? {};

  const dateA = pA.acquisitionDate ?? (pA.startTime ? pA.startTime.slice(0, 10) : 'Date A');
  const dateB = pB.acquisitionDate ?? (pB.startTime ? pB.startTime.slice(0, 10) : 'Date B');
  const daysDelta = calculateDayDiff(dateA, dateB);

  const track = pA.track ?? pA.pathNumber ?? '—';
  const frame = pA.frameNumber ?? '—';

  // If ONLY Date A or Date B is pinned (awaiting user to pick second location/granule)
  if (!isComparing && (granuleA || granuleB)) {
    const pinned = granuleA ? { label: 'DATE A', date: dateA, prop: pA, tag: 'A' } : { label: 'DATE B', date: dateB, prop: pB, tag: 'B' };
    const missingTag = pinned.tag === 'A' ? 'B' : 'A';
    return (
      <div className="x-compare-banner x-pinned-banner">
        <style>{`
          .x-compare-banner {
            position: relative;
            width: 100%;
            z-index: 10;
            background: rgba(12, 12, 18, 0.92);
            backdrop-filter: blur(28px);
            border: 1px solid rgba(225, 29, 72, 0.45);
            border-radius: 12px;
            padding: 8px 14px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            box-shadow: 0 4px 20px rgba(4, 4, 6, 0.6), 0 0 16px rgba(225, 29, 72, 0.15);
            animation: fadeInDown 0.25s ease-out;
            margin-bottom: 8px;
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .x-pin-tag {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.22);
            color: #F4F4F6;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 9px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
          }
          .x-pin-tag.is-tag-b {
            background: rgba(225, 29, 72, 0.22);
            border-color: rgba(251, 113, 133, 0.5);
            color: #FB7185;
          }
          .x-pin-prompt {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: rgba(244, 244, 246, 0.85);
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .x-pin-btn-cancel {
            background: transparent;
            border: 1px solid rgba(244, 244, 246, 0.15);
            color: rgba(244, 244, 246, 0.65);
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
          }
          .x-pin-btn-cancel:hover {
            color: #FB7185;
            border-color: rgba(225, 29, 72, 0.4);
            background: rgba(225, 29, 72, 0.1);
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className={`x-pin-tag${pinned.tag === 'B' ? ' is-tag-b' : ''}`}>
            {pinned.label}: {formatDate(pinned.date)}
          </span>
          <span className="x-pin-prompt">
            Click <strong>[{missingTag}]</strong> on any other observation (or pick a new region) to complete pair
          </span>
        </div>
        <button
          type="button"
          className="x-pin-btn-cancel"
          onClick={onExitCompare}
          title="Cancel pair selection"
        >
          <X size={12} className="inline mr-1" />
          <span>Cancel</span>
        </button>
      </div>
    );
  }

  // If compare is active
  if (!isComparing) return null;

  return (
    <div className="x-compare-hud">
      <style>{`
        .x-compare-hud {
          position: relative;
          width: 100%;
          z-index: 10;
          background: rgba(10, 10, 16, 0.94);
          backdrop-filter: blur(28px);
          border: 1px solid rgba(225, 29, 72, 0.4);
          border-radius: 12px;
          padding: 8px 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px 12px;
          box-shadow: 0 6px 24px rgba(4, 4, 6, 0.7), 0 0 20px rgba(225, 29, 72, 0.15);
          animation: fadeInDown 0.25s ease-out;
          margin-bottom: 8px;
        }
        .x-hud-left {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .x-hud-badge-group {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          font-weight: 600;
        }
        .x-date-badge-a {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #F4F4F6;
          padding: 3px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .x-date-badge-b {
          background: rgba(225, 29, 72, 0.16);
          border: 1px solid rgba(251, 113, 133, 0.45);
          color: #FB7185;
          padding: 3px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .x-hud-vs {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 9px;
          font-weight: 700;
          color: rgba(244, 244, 246, 0.4);
          text-transform: uppercase;
        }
        .x-hud-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          color: rgba(244, 244, 246, 0.65);
          border-left: 1px solid rgba(244, 244, 246, 0.12);
          padding-left: 8px;
          white-space: nowrap;
        }
        .x-hud-center {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
          background: rgba(4, 4, 6, 0.6);
          border: 1px solid rgba(244, 244, 246, 0.08);
          border-radius: 8px;
          padding: 2px;
        }
        .x-mode-pill {
          background: transparent;
          border: none;
          color: rgba(244, 244, 246, 0.65);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.03em;
          padding: 4px 9px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .x-mode-pill:hover {
          color: #F4F4F6;
          background: rgba(244, 244, 246, 0.06);
        }
        .x-mode-pill.is-active {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.35) 0%, rgba(190, 18, 60, 0.25) 100%);
          border: 1px solid rgba(251, 113, 133, 0.55);
          color: #F4F4F6;
          box-shadow: 0 2px 8px rgba(225, 29, 72, 0.2);
        }
        .x-hud-right {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .x-hud-btn-subtle {
          background: rgba(244, 244, 246, 0.06);
          border: 1px solid rgba(244, 244, 246, 0.12);
          color: #F4F4F6;
          padding: 5px 9px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10.5px;
          font-weight: 600;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .x-hud-btn-subtle:hover {
          background: rgba(244, 244, 246, 0.12);
          border-color: rgba(244, 244, 246, 0.25);
        }
        .x-hud-exit-btn {
          background: rgba(225, 29, 72, 0.18);
          border: 1px solid rgba(225, 29, 72, 0.4);
          color: #FB7185;
          padding: 5px 9px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10.5px;
          font-weight: 600;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .x-hud-exit-btn:hover {
          background: rgba(225, 29, 72, 0.35);
          color: #F4F4F6;
        }
        .x-opacity-control {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          color: rgba(244, 244, 246, 0.6);
          border-left: 1px solid rgba(244, 244, 246, 0.12);
          padding-left: 8px;
          white-space: nowrap;
        }
        .x-opacity-slider {
          accent-color: #E11D48;
          width: 52px;
          cursor: pointer;
        }
        .x-cross-loc-pill {
          background: rgba(225, 29, 72, 0.22);
          border: 1px solid rgba(251, 113, 133, 0.55);
          color: #FB7185;
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        @media (max-width: 900px) {
          .x-compare-hud {
            flex-direction: column;
            align-items: stretch;
          }
          .x-hud-left, .x-hud-center, .x-hud-right {
            justify-content: space-between;
            width: 100%;
          }
        }
      `}</style>

      {/* Left: Date A vs Date B and Orbit Info */}
      <div className="x-hud-left">
        <div className="x-hud-badge-group">
          <div className="x-date-badge-a" title={`Date A Reference: ${pA.granuleName ?? 'A'}`}>
            <span>Date A: {formatDate(dateA)}</span>
          </div>
          <span className="x-hud-vs">VS</span>
          <div className="x-date-badge-b" title={`Date B Secondary: ${pB.granuleName ?? 'B'}`}>
            <span>Date B: {formatDate(dateB)}</span>
          </div>
        </div>

        <div className="x-hud-meta">
          {changeProduct?.isCrossLocation ? (
            <span className="x-cross-loc-pill">
              CROSS-LOCATION · {changeProduct.separationKm} km SEPARATION
            </span>
          ) : (
            <>
              {daysDelta && <span>Δ {daysDelta}</span>}
              <span>·</span>
              <span>Trk {track} / Frm {frame}</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Layer Mode Switcher */}
      {changeProduct?.isCrossLocation ? (
        <div className="x-hud-center">
          <button
            type="button"
            className="x-mode-pill is-active"
            title="Dual-Region Comparative SAR: Independent classification and backscatter draping on both footprints"
          >
            <Layers size={12} />
            <span>Dual-Region Footprints (A & B)</span>
          </button>
        </div>
      ) : (
        <div className="x-hud-center">
          <button
            type="button"
            className={`x-mode-pill${compareLayerMode === 'floodMask' ? ' is-active' : ''}`}
            onClick={() => onSetCompareMode?.('floodMask')}
            title="Drape 4-Class Surface & Water Change classification texture"
          >
            <Layers size={12} />
            <span>4-Class Flood Mask</span>
          </button>

          <button
            type="button"
            className={`x-mode-pill${compareLayerMode === 'curtain' ? ' is-active' : ''}`}
            onClick={() => onSetCompareMode?.('curtain')}
            title="Interactive 3D split-swipe curtain slider between Date A and Date B"
          >
            <SplitSquareVertical size={12} />
            <span>Split Curtain (A ◄► B)</span>
          </button>

          <button
            type="button"
            className={`x-mode-pill${compareLayerMode === 'diffDb' ? ' is-active' : ''}`}
            onClick={() => onSetCompareMode?.('diffDb')}
            title="Drape continuous backscatter shift (B - A dB)"
          >
            <Sparkles size={12} />
            <span>Backscatter ΔdB</span>
          </button>
        </div>
      )}

      {/* Right: Swap, Opacity Slider & Exit */}
      <div className="x-hud-right">
        {compareLayerMode !== 'curtain' && (
          <div className="x-opacity-control">
            <span>Opacity</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={compareOpacity}
              onChange={(e) => onOpacityChange?.(parseFloat(e.target.value))}
              className="x-opacity-slider"
              title={`Overlay opacity: ${Math.round(compareOpacity * 100)}%`}
            />
          </div>
        )}

        <button
          type="button"
          className="x-hud-btn-subtle"
          onClick={onSwapCompare}
          title="Swap Date A and Date B"
        >
          <ArrowLeftRight size={11} />
          <span>Swap A/B</span>
        </button>

        <button
          type="button"
          className="x-hud-exit-btn"
          onClick={onExitCompare}
          title="Exit Multi-Temporal Compare Mode"
        >
          <X size={11} />
          <span>Exit Compare</span>
        </button>
      </div>
    </div>
  );
}
