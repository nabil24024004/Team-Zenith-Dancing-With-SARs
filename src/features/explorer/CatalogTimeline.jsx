import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { DiamondCrosshair } from '../../components/ZenithElements.jsx';

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
}) {
  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selectedId]);

  return (
    <section
      className="explorer-panel x-timeline"
      aria-labelledby="x-timeline-title"
    >
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
        Chronological by acquisition time. Use the arrow keys to move through
        observations.
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
            return (
              <li key={id ?? index}>
                <button
                  ref={selected ? selectedRef : null}
                  type="button"
                  className={`x-observation${selected ? ' is-selected' : ''}`}
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
                    <span className="x-timeline-dot" />
                  </span>
                  <span className="x-observation-copy">
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
                    </span>
                    <strong>
                      {properties.processingLevel ??
                        properties.productType ??
                        'Product unclassified'}
                    </strong>
                    <span className="x-granule-name">{shortName(feature)}</span>
                  </span>
                </button>
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
          <ArrowDown size={12} aria-hidden="true" /> Select an observation to
          inspect its footprint
        </div>
      )}
    </section>
  );
}
