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
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${val}T00:00:00Z`));
  } catch {
    return String(val);
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
            position: absolute;
            top: 14px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 20;
            background: rgba(12, 12, 18, 0.88);
            backdrop-filter: blur(28px);
            border: 1px solid rgba(225, 29, 72, 0.45);
            border-radius: 9999px;
            padding: 6px 14px 6px 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 32px rgba(4, 4, 6, 0.8), 0 0 16px rgba(225, 29, 72, 0.2);
            animation: fadeInDown 0.25s ease-out;
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translate(-50%, -8px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
          .x-pin-tag {
            background: rgba(139, 92, 246, 0.22);
            border: 1px solid rgba(167, 139, 250, 0.5);
            color: #C4B5FD;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 9px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .x-pin-hint {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 11px;
            color: rgba(244, 244, 246, 0.85);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .x-pin-cancel {
            background: rgba(244, 244, 246, 0.08);
            border: 1px solid rgba(244, 244, 246, 0.16);
            color: rgba(244, 244, 246, 0.7);
            padding: 4px;
            border-radius: 9999px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .x-pin-cancel:hover {
            background: rgba(225, 29, 72, 0.3);
            color: #F4F4F6;
            border-color: rgba(225, 29, 72, 0.6);
          }
        `}</style>
        <div className="x-pin-tag">
          <span>{pinned.label} PINNED: {formatDate(pinned.date)}</span>
        </div>
        <div className="x-pin-hint">
          <span>Click <strong>[{missingTag}]</strong> on any granule in this region or query ANY coordinate / preset globally</span>
        </div>
        <button
          type="button"
          className="x-pin-cancel"
          onClick={onExitCompare}
          title="Clear pinned selection"
          aria-label="Cancel pin"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  // If NOT currently comparing, but active record has a partner available
  if (!isComparing && activePartner) {
    const partnerP = activePartner.properties ?? activePartner ?? {};
    const partnerDate = partnerP.acquisitionDate ?? (partnerP.startTime ? partnerP.startTime.slice(0, 10) : '');

    return (
      <div className="x-compare-banner">
        <style>{`
          .x-compare-banner {
            position: absolute;
            top: 14px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 20;
            background: rgba(12, 12, 18, 0.82);
            backdrop-filter: blur(28px);
            border: 1px solid rgba(225, 29, 72, 0.45);
            border-radius: 9999px;
            padding: 6px 14px 6px 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 32px rgba(4, 4, 6, 0.8), 0 0 16px rgba(225, 29, 72, 0.2);
            animation: fadeInDown 0.25s ease-out;
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translate(-50%, -8px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
          .x-partner-quick-btn {
            background: linear-gradient(135deg, #E11D48 0%, #BE123C 100%);
            border: 1px solid rgba(251, 113, 133, 0.5);
            color: #F4F4F6;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            padding: 5px 12px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 2px 8px rgba(225, 29, 72, 0.35);
          }
          .x-partner-quick-btn:hover {
            transform: scale(1.03);
            background: linear-gradient(135deg, #FB7185 0%, #E11D48 100%);
          }
          .x-partner-info {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: rgba(244, 244, 246, 0.78);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .x-partner-pill {
            background: rgba(139, 92, 246, 0.18);
            border: 1px solid rgba(139, 92, 246, 0.4);
            color: #C4B5FD;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
          }
        `}</style>
        <button
          type="button"
          className="x-partner-quick-btn"
          onClick={() => onStartAutoCompare?.(activePartner)}
        >
          <Zap size={13} fill="#F4F4F6" />
          <span>Compare Repeat-Pass Pair</span>
        </button>
        <div className="x-partner-info">
          <span className="x-partner-pill">12-Day Orbit Match</span>
          <span>Partner: {formatDate(partnerDate)}</span>
        </div>
      </div>
    );
  }

  // If compare is active
  if (!isComparing) return null;

  return (
    <div className="x-compare-hud">
      <style>{`
        .x-compare-hud {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          z-index: 20;
          background: rgba(10, 10, 16, 0.88);
          backdrop-filter: blur(28px);
          border: 1px solid rgba(225, 29, 72, 0.35);
          border-radius: 12px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 10px 40px rgba(4, 4, 6, 0.85), 0 0 24px rgba(225, 29, 72, 0.15);
          animation: fadeInDown 0.25s ease-out;
        }
        .x-hud-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .x-hud-badge-group {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
        }
        .x-date-badge-a {
          background: rgba(139, 92, 246, 0.16);
          border: 1px solid rgba(167, 139, 250, 0.45);
          color: #C4B5FD;
          padding: 4px 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .x-date-badge-b {
          background: rgba(225, 29, 72, 0.16);
          border: 1px solid rgba(251, 113, 133, 0.45);
          color: #FB7185;
          padding: 4px 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .x-hud-vs {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: rgba(244, 244, 246, 0.4);
          text-transform: uppercase;
        }
        .x-hud-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(244, 244, 246, 0.65);
          border-left: 1px solid rgba(244, 244, 246, 0.12);
          padding-left: 10px;
        }
        .x-hud-center {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(4, 4, 6, 0.6);
          border: 1px solid rgba(244, 244, 246, 0.08);
          border-radius: 8px;
          padding: 3px;
        }
        .x-mode-pill {
          background: transparent;
          border: none;
          color: rgba(244, 244, 246, 0.65);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 5px 11px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.18s ease;
        }
        .x-mode-pill:hover {
          color: #F4F4F6;
          background: rgba(244, 244, 246, 0.06);
        }
        .x-mode-pill.is-active {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
          border: 1px solid rgba(251, 113, 133, 0.45);
          color: #F4F4F6;
          box-shadow: 0 2px 8px rgba(225, 29, 72, 0.2);
        }
        .x-hud-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .x-hud-btn-subtle {
          background: rgba(244, 244, 246, 0.06);
          border: 1px solid rgba(244, 244, 246, 0.12);
          color: #F4F4F6;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.18s ease;
        }
        .x-hud-btn-subtle:hover {
          background: rgba(244, 244, 246, 0.12);
          border-color: rgba(244, 244, 246, 0.25);
        }
        .x-hud-exit-btn {
          background: rgba(225, 29, 72, 0.18);
          border: 1px solid rgba(225, 29, 72, 0.4);
          color: #FB7185;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.18s ease;
        }
        .x-hud-exit-btn:hover {
          background: rgba(225, 29, 72, 0.35);
          color: #F4F4F6;
        }
        .x-opacity-control {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(244, 244, 246, 0.6);
          border-left: 1px solid rgba(244, 244, 246, 0.12);
          padding-left: 10px;
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
        .x-opacity-slider {
          accent-color: #E11D48;
          width: 58px;
          cursor: pointer;
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
            <Layers size={13} />
            <span>Dual-Region Radar Footprints (A & B)</span>
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
            <Layers size={13} />
            <span>4-Class Flood Mask</span>
          </button>

          <button
            type="button"
            className={`x-mode-pill${compareLayerMode === 'curtain' ? ' is-active' : ''}`}
            onClick={() => onSetCompareMode?.('curtain')}
            title="Interactive 3D split-swipe curtain slider between Date A and Date B"
          >
            <SplitSquareVertical size={13} />
            <span>Split-Swipe Curtain (A ◄► B)</span>
          </button>

          <button
            type="button"
            className={`x-mode-pill${compareLayerMode === 'diffDb' ? ' is-active' : ''}`}
            onClick={() => onSetCompareMode?.('diffDb')}
            title="Drape continuous backscatter shift (B - A dB)"
          >
            <Sparkles size={13} />
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
          <ArrowLeftRight size={12} />
          <span>Swap A/B</span>
        </button>

        <button
          type="button"
          className="x-hud-exit-btn"
          onClick={onExitCompare}
          title="Exit Multi-Temporal Compare Mode"
        >
          <X size={12} />
          <span>Exit Compare</span>
        </button>
      </div>
    </div>
  );
}
