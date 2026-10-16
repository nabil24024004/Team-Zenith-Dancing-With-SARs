import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react';
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
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function CatalogTimeline({
  features = [],
  selectedId,
  onSelect,
  comparePair = null,
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
        .x-timeline-row-wrap {
          position: relative;
          display: flex;
          align-items: stretch;
          margin-bottom: 3px;
        }
        .x-timeline-row-wrap .x-observation {
          flex: 1;
          margin-bottom: 0;
        }
        .x-compare-actions {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 2;
        }
        .x-compare-pill-btn {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          border: 1px solid rgba(244, 244, 246, 0.14);
          background: rgba(8, 8, 12, 0.7);
          color: rgba(244, 244, 246, 0.65);
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
        .x-compare-pill-btn:hover {
          color: #F4F4F6;
          border-color: rgba(244, 244, 246, 0.4);
          background: rgba(244, 244, 246, 0.12);
        }
        .x-compare-pill-btn.is-active-a {
          background: #8B5CF6;
          border-color: #A78BFA;
          color: #FFFFFF;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
        }
        .x-compare-pill-btn.is-active-b {
          background: #E11D48;
          border-color: #FB7185;
          color: #FFFFFF;
          box-shadow: 0 0 8px rgba(225, 29, 72, 0.4);
        }
        .x-pair-badge {
          background: rgba(139, 92, 246, 0.14);
          border: 1px solid rgba(139, 92, 246, 0.35);
          color: #C4B5FD;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 1px 5px;
          border-radius: 3px;
          text-transform: uppercase;
          margin-left: 6px;
        }
        .x-autopair-btn {
          background: rgba(225, 29, 72, 0.14);
          border: 1px solid rgba(225, 29, 72, 0.35);
          color: #FB7185;
          border-radius: 4px;
          padding: 2px 5px;
          cursor: pointer;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 2px;
          transition: all 0.15s ease;
        }
        .x-autopair-btn:hover {
          background: #E11D48;
          color: #FFFFFF;
          border-color: #FB7185;
        }
      `}</style>

      <div className="x-panel-heading">
        <div>
          <span className="x-eyebrow">
            <DiamondCrosshair />
            <span>03 // ACQUISITIONS</span>
          </span>
          <h2 id="x-timeline-title">Observation timeline</h2>
        </div>
        <span className="x-count-pill">{features.length}</span>
      </div>
      <p className="x-helper-text" id="x-timeline-help">
        Chronological order. Click [A] or [B] to compare any two repeat passes.
      </p>
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
              <li key={id ?? index} className="x-timeline-row-wrap">
                <button
                  ref={selected ? selectedRef : null}
                  type="button"
                  className={`x-observation${selected ? ' is-selected' : ''}${isA ? ' is-compare-a' : ''}${isB ? ' is-compare-b' : ''}`}
                  aria-pressed={selected}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={`${formatDate(properties.acquisitionDate)}, product ${properties.processingLevel ?? properties.productType ?? 'unknown'}, ${shortName(feature)}`}
                  onClick={() => onSelect(id)}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
                      return;
                    event.preventDefault();
                    const items = Array.from(
                      event.currentTarget
                        .closest('ol')
                        ?.querySelectorAll('button.x-observation') ?? []
                    );
                    const currentIndex = items.indexOf(event.currentTarget);
                    const nextIndex =
                      event.key === 'ArrowDown'
                        ? Math.min(items.length - 1, currentIndex + 1)
                        : Math.max(0, currentIndex - 1);
                    items[nextIndex]?.focus();
                  }}
                >
                  <span className="x-observation-rail" aria-hidden="true">
                    <span
                      className="x-timeline-dot"
                      style={
                        isA
                          ? { background: '#8B5CF6', borderColor: '#A78BFA' }
                          : isB
                            ? { background: '#E11D48', borderColor: '#FB7185' }
                            : undefined
                      }
                    />
                  </span>
                  <span className="x-observation-copy" style={{ paddingRight: '76px' }}>
                    <span className="x-observation-date">
                      {formatDate(properties.acquisitionDate)}{' '}
                      <span>
                        {properties.startTime
                          ? new Intl.DateTimeFormat('en', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC',
                              timeZoneName: 'short',
                            }).format(new Date(properties.startTime))
                          : ''}
                      </span>
                      {hasRepeat && (
                        <span className="x-pair-badge" title="Shares orbital track and frame with other dates">
                          Repeat Pair
                        </span>
                      )}
                    </span>
                    <strong>
                      {properties.processingLevel ??
                        properties.productType ??
                        'Product unclassified'}
                    </strong>
                    <span className="x-granule-name">{shortName(feature)}</span>
                  </span>
                </button>

                {/* Compare actions [A] and [B] + Auto-Pair */}
                <div className="x-compare-actions">
                  {hasRepeat && !isA && !isB && onAutoPair && (
                    <button
                      type="button"
                      className="x-autopair-btn"
                      title={`1-Click compare with partner (${formatDate(partners[0].properties?.acquisitionDate)})`}
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
                    className={`x-compare-pill-btn${isA ? ' is-active-a' : ''}`}
                    title={isA ? 'Currently selected as Date A' : 'Set as Date A (Reference)'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAsDateA?.(feature);
                    }}
                  >
                    A
                  </button>

                  <button
                    type="button"
                    className={`x-compare-pill-btn${isB ? ' is-active-b' : ''}`}
                    title={isB ? 'Currently selected as Date B' : 'Set as Date B (Secondary)'}
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
        <div className="x-list-hint">
          <ArrowUp size={12} aria-hidden="true" />
          <ArrowDown size={12} aria-hidden="true" /> Click [A] & [B] to compare dates · Arrow keys navigate
        </div>
      )}
    </section>
  );
}
