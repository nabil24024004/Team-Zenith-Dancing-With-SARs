import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Info, Zap } from 'lucide-react';
import { DiamondCrosshair } from '../../components/ZenithElements.jsx';
import { getPartnerGranules } from './catalog.js';

function shortName(feature) {
  const properties = feature.properties ?? {};
  return (
    properties.granuleName ??
    properties.granuleUr ??
    feature.id ??
    'Catalog record'
  );
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? str : d.toISOString().slice(0, 10);
  } catch {
    return str;
  }
}

function formatUtcTime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm} UTC`;
  } catch {
    return '';
  }
}

export default function CatalogTimeline({
  features = [],
  selectedId,
  onSelect,
  comparePair = null,
  activePartner = null,
  onSelectAsDateA,
  onSelectAsDateB,
  onAutoPair,
}) {
  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selectedId]);

  const idA = comparePair?.granuleA?.id ?? comparePair?.granuleA?.properties?.id;
  const idB = comparePair?.granuleB?.id ?? comparePair?.granuleB?.properties?.id;

  return (
    <section
      className="explorer-panel x-timeline"
      aria-labelledby="x-timeline-title"
    >
      <style>{`
        .x-timeline {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 100%;
          overflow: hidden;
          padding: 16px;
        }
        @media (max-width: 760px) {
          .x-timeline {
            padding: 12px;
          }
        }
        .x-timeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }
        .x-timeline-title {
          font-family: "Space Grotesk", sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 3px 0 0;
          letter-spacing: -0.01em;
        }
        .x-count-pill {
          padding: 3px 9px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: #FFFFFF;
          font-weight: 600;
        }
        .x-timeline-helper {
          color: var(--x-muted);
          font-size: 11px;
          font-weight: 300;
          line-height: 1.45;
          margin: 0 0 8px;
        }
        .x-timeline-onboarding {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(244, 244, 246, 0.85);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          line-height: 1.45;
          margin-bottom: 8px;
        }
        .x-timeline-onboarding strong {
          color: #FFFFFF;
        }
        .x-onboarding-icon {
          flex-shrink: 0;
          margin-top: 1.5px;
          color: rgba(244, 244, 246, 0.6);
        }
        .x-timeline-partner-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(12, 12, 18, 0.85);
          border: 1px solid rgba(251, 113, 133, 0.28);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          margin-bottom: 8px;
        }
        .x-partner-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
        }
        .x-partner-pill {
          color: #FB7185;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .x-partner-date {
          color: rgba(244, 244, 246, 0.85);
        }
        .x-partner-quick-btn {
          width: 100%;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 6px;
          border: 1px solid #FB7185;
          background: linear-gradient(135deg, #E11D48 0%, #BE123C 100%);
          color: #FFFFFF;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 10px rgba(225, 29, 72, 0.35);
        }
        .x-partner-quick-btn:hover {
          background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
          transform: translateY(-0.5px);
        }
        .x-observation-list {
          list-style: none;
          overflow-y: auto;
          margin: 0 -6px 0 0;
          padding: 0 6px 0 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
          scrollbar-width: thin;
        }
        .x-observation-list::-webkit-scrollbar {
          width: 5px;
        }
        .x-observation-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 999px;
        }
        .x-observation-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.24);
          border-radius: 999px;
        }
        .x-observation-list::-webkit-scrollbar-thumb:hover {
          background: #FB7185;
        }
        .x-timeline-item {
          display: flex;
          align-items: stretch;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(12, 12, 18, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.2s ease;
          position: relative;
        }
        .x-timeline-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.14);
        }
        .x-timeline-item.is-selected {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.16) 0%, rgba(139, 92, 246, 0.08) 100%);
          border-color: rgba(251, 113, 133, 0.45);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }
        .x-timeline-item.is-compare-a {
          border-color: rgba(139, 92, 246, 0.5);
          background: rgba(139, 92, 246, 0.12);
        }
        .x-timeline-item.is-compare-b {
          border-color: rgba(225, 29, 72, 0.5);
          background: rgba(225, 29, 72, 0.12);
        }
        .x-item-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 4px;
          flex-shrink: 0;
          width: 10px;
        }
        .x-item-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: #08080C;
          transition: all 0.2s ease;
        }
        .is-selected .x-item-dot {
          border-color: #FFE4E6;
          background: #E11D48;
          box-shadow: 0 0 8px rgba(225, 29, 72, 0.85);
        }
        .is-compare-a .x-item-dot {
          border-color: #DDD6FE;
          background: #8B5CF6;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.85);
        }
        .is-compare-b .x-item-dot {
          border-color: #FFE4E6;
          background: #E11D48;
          box-shadow: 0 0 8px rgba(225, 29, 72, 0.85);
        }
        .x-item-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          cursor: pointer;
          text-align: left;
        }
        .x-item-header {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .x-item-date {
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          font-weight: 600;
          color: #FFFFFF;
        }
        .x-item-time {
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          color: var(--x-dim);
        }
        .x-pair-indicator {
          background: rgba(139, 92, 246, 0.16);
          border: 1px solid rgba(139, 92, 246, 0.35);
          color: #C4B5FD;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 1px 5px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .x-item-middle {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .x-item-badge {
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: #C4B5FD;
        }
        .is-selected .x-item-badge {
          color: #FDA4AF;
        }
        .x-item-track {
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          color: var(--x-muted);
        }
        .x-item-granule {
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          color: var(--x-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.3;
        }
        .x-item-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          align-self: center;
        }
        .x-action-btn-pair {
          background: rgba(225, 29, 72, 0.15);
          border: 1px solid rgba(225, 29, 72, 0.4);
          color: #FB7185;
          border-radius: 6px;
          padding: 3px 6px;
          cursor: pointer;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 9.5px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: all 0.15s ease;
          height: 24px;
        }
        .x-action-btn-pair:hover {
          background: #E11D48;
          color: #FFFFFF;
          border-color: #FB7185;
        }
        .x-action-btn-pill {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid rgba(244, 244, 246, 0.15);
          background: rgba(8, 8, 12, 0.75);
          color: rgba(244, 244, 246, 0.7);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.15s ease;
        }
        .x-action-btn-pill:hover {
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.12);
        }
        .x-action-btn-pill.is-active-a {
          background: #8B5CF6;
          border-color: #A78BFA;
          color: #FFFFFF;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
        }
        .x-action-btn-pill.is-active-b {
          background: #E11D48;
          border-color: #FB7185;
          color: #FFFFFF;
          box-shadow: 0 0 8px rgba(225, 29, 72, 0.5);
        }
        .x-timeline-footer {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--x-dim);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `}</style>

      <div className="x-timeline-header">
        <div>
          <span className="x-eyebrow">
            <DiamondCrosshair />
            <span>CHRONOLOGICAL OBSERVATIONS</span>
          </span>
          <h2 id="x-timeline-title" className="x-timeline-title">
            Observation Timeline
          </h2>
        </div>
        <span className="x-count-pill">{features.length}</span>
      </div>

      {/* Repeat-Pass Quick Trigger (Contextually Grouped with Timeline) */}
      {activePartner && !comparePair && (
        <div className="x-timeline-partner-card">
          <div className="x-partner-card-meta">
            <span className="x-partner-pill">12-DAY ORBIT MATCH</span>
            <span className="x-partner-date">
              Partner: {formatDate(activePartner.properties?.acquisitionDate)}
            </span>
          </div>
          <button
            type="button"
            className="x-partner-quick-btn"
            onClick={() => onAutoPair?.(activePartner)}
          >
            <Zap size={11} fill="#FFFFFF" />
            <span>Compare Repeat-Pass Pair</span>
          </button>
        </div>
      )}

      {/* A/B Comparison Onboarding Banner */}
      <div className="x-timeline-onboarding" role="note">
        <Info size={13} className="x-onboarding-icon" aria-hidden="true" />
        <span>
          <strong>InSAR Repeat-Pass:</strong> Pair <strong>[A]</strong> &amp; <strong>[B]</strong> acquisitions (or click <strong>[Pair]</strong>) to detect surface displacement on the 3D globe.
        </span>
      </div>

      {features.length ? (
        <ol
          className="x-observation-list"
          aria-label="Chronological observations"
        >
          {features.map((feature, index) => {
            const properties = feature.properties ?? {};
            const id = feature.id ?? properties.id;
            const selected = id === selectedId;
            const isA = id === idA;
            const isB = id === idB;

            // Check if this feature has repeat-pass partners in the current catalog
            const partners = getPartnerGranules(feature, features);
            const hasRepeat = partners.length > 0;

            return (
              <li
                key={id ?? index}
                ref={selected ? selectedRef : null}
                className={`x-timeline-item${selected ? ' is-selected' : ''}${
                  isA ? ' is-compare-a' : ''
                }${isB ? ' is-compare-b' : ''}`}
              >
                <div className="x-item-rail" aria-hidden="true">
                  <span className="x-item-dot" />
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  className="x-item-content"
                  aria-pressed={selected}
                  aria-label={`${formatDate(properties.acquisitionDate)}, product ${
                    properties.processingLevel ?? properties.productType ?? 'unknown'
                  }, ${shortName(feature)}`}
                  onClick={() => onSelect(id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(id);
                    }
                  }}
                >
                  <div className="x-item-header">
                    <span className="x-item-date">
                      {formatDate(properties.acquisitionDate)}
                    </span>
                    <span className="x-item-time">
                      {formatUtcTime(properties.startTime)}
                    </span>
                    {hasRepeat && (
                      <span
                        className="x-pair-indicator"
                        title="Repeat-pass orbit pair available"
                      >
                        Pair
                      </span>
                    )}
                  </div>

                  <div className="x-item-middle">
                    <span className="x-item-badge">
                      {properties.processingLevel ??
                        properties.productType ??
                        'SAR'}
                    </span>
                    <span className="x-item-track">
                      Trk {properties.pathNumber ?? properties.track ?? '—'} · Frm {properties.frameNumber ?? '—'}
                    </span>
                  </div>

                  <div className="x-item-granule" title={shortName(feature)}>
                    {shortName(feature)}
                  </div>
                </div>

                {/* Dedicated Action CTA Column: Never overlaps text! */}
                <div className="x-item-actions">
                  {hasRepeat && !isA && !isB && onAutoPair && (
                    <button
                      type="button"
                      className="x-action-btn-pair"
                      title={`Compare with 12-day repeat partner (${formatDate(
                        partners[0].properties?.acquisitionDate
                      )})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAutoPair(feature, partners[0]);
                      }}
                    >
                      <Zap size={10} />
                      <span>Pair</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`x-action-btn-pill${isA ? ' is-active-a' : ''}`}
                    title={
                      isA
                        ? 'Currently selected as Date A'
                        : 'Set as Date A (Reference)'
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAsDateA?.(feature);
                    }}
                  >
                    A
                  </button>

                  <button
                    type="button"
                    className={`x-action-btn-pill${isB ? ' is-active-b' : ''}`}
                    title={
                      isB
                        ? 'Currently selected as Date B'
                        : 'Set as Date B (Secondary)'
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAsDateB?.(feature);
                    }}
                  >
                    B
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="x-empty" role="status">
          <span>No observations match these filters.</span>
          <span>
            Try widening the date range or resetting the product type.
          </span>
        </div>
      )}

      {features.length > 0 && (
        <div className="x-timeline-footer">
          <ArrowUp size={11} aria-hidden="true" />
          <ArrowDown size={11} aria-hidden="true" />
          <span>Click [A] &amp; [B] to compare · Scroll to explore</span>
        </div>
      )}
    </section>
  );
}
