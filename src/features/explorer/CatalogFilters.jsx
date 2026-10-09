import React from 'react';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { DiamondCrosshair } from '../../components/ZenithElements.jsx';

export default function CatalogFilters({
  productTypes = [],
  filters,
  onChange,
  onReset,
  resultCount,
  totalCount,
  coverage,
}) {
  const update = (key) => (event) =>
    onChange({ ...filters, [key]: event.target.value });
  return (
    <section
      className="explorer-panel x-filter-panel"
      aria-labelledby="x-filter-title"
    >
      <div className="x-panel-heading">
        <div>
          <span className="x-eyebrow">
            <DiamondCrosshair />
            <span>01 // CATALOG CONTROLS</span>
          </span>
          <h2 id="x-filter-title">Refine observations</h2>
        </div>
        <button
          className="x-reset"
          type="button"
          onClick={onReset}
          disabled={
            !filters.productType && !filters.startDate && !filters.endDate
          }
          aria-label="Clear all catalog filters"
        >
          <RotateCcw size={12} aria-hidden="true" /> Reset
        </button>
      </div>
      <div className="x-filter-fields">
        <label className="x-field">
          <span>Product type</span>
          <select
            value={filters.productType}
            onChange={update('productType')}
          >
            <option value="">All product types</option>
            {productTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <div className="x-date-field">
          <label className="x-field">
            <span>
              <CalendarDays size={12} aria-hidden="true" /> From
            </span>
            <input
              type="date"
              value={filters.startDate}
              max={filters.endDate || undefined}
              onChange={update('startDate')}
            />
          </label>
          <label className="x-field">
            <span>
              <CalendarDays size={12} aria-hidden="true" /> To
            </span>
            <input
              type="date"
              value={filters.endDate}
              min={filters.startDate || undefined}
              onChange={update('endDate')}
            />
          </label>
        </div>
      </div>
      <div className="x-filter-summary" aria-live="polite">
        <p>
          <span>Matching passes</span>
          <span>
            <strong>{resultCount.toLocaleString()}</strong> /{' '}
            {totalCount.toLocaleString()}
          </span>
        </p>
        <p>
          <span>Date coverage</span>
          <strong>{coverage || '—'}</strong>
        </p>
      </div>
    </section>
  );
}
