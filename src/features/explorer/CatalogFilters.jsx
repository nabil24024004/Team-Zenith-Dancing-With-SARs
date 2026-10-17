import React from 'react';
import { CalendarDays, Filter, Layers, RotateCcw } from 'lucide-react';
import { DiamondCrosshair } from '../../components/ZenithElements.jsx';

export default function CatalogFilters({
  productTypes = [],
  filters,
  onChange,
  onReset,
  resultCount = 0,
  totalCount = 0,
  coverage = '',
}) {
  const update = (key) => (event) =>
    onChange({ ...filters, [key]: event.target.value });

  const updateValue = (key) => (val) =>
    onChange({ ...filters, [key]: val });

  const hasActiveFilters = Boolean(
    filters.productType || filters.startDate || filters.endDate
  );

  return (
    <div className="x-filter-toolbar" aria-label="Catalog filters and observation metrics">
      <style>{`
        .x-filter-toolbar {
          margin-bottom: 14px;
          padding: 10px 16px;
          border-radius: 14px;
          background: rgba(10, 10, 16, 0.72);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .x-filter-controls-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .x-filter-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.8);
          padding-right: 6px;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        .x-filter-field {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .x-filter-label {
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(244, 244, 246, 0.65);
          white-space: nowrap;
        }
        .x-filter-select {
          height: 32px;
          padding: 0 28px 0 10px;
          border-radius: 8px;
          background: rgba(4, 4, 6, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #F4F4F6;
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: auto;
          color-scheme: dark;
        }
        .x-filter-select:hover,
        .x-filter-select:focus {
          border-color: rgba(251, 113, 133, 0.6);
          box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.15);
          background: rgba(12, 12, 18, 0.95);
          outline: none;
        }
        .x-filter-input {
          height: 32px;
          padding: 0 8px;
          border-radius: 8px;
          background: rgba(4, 4, 6, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #F4F4F6;
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          color-scheme: dark;
          transition: all 0.2s ease;
        }
        .x-filter-input::placeholder {
          color: rgba(244, 244, 246, 0.38);
          font-family: "JetBrains Mono", monospace;
          font-size: 10.5px;
          letter-spacing: 0.04em;
        }
        .x-filter-input:hover,
        .x-filter-input:focus {
          border-color: rgba(251, 113, 133, 0.6);
          box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.15);
          background: rgba(12, 12, 18, 0.95);
          outline: none;
        }
        .x-date-input-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .x-filter-date {
          width: 122px;
          padding: 0 26px 0 9px;
          letter-spacing: 0.04em;
        }
        .x-date-picker-btn {
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          padding: 3px;
          color: rgba(244, 244, 246, 0.45);
          cursor: pointer;
          border-radius: 4px;
          transition: color 0.15s ease, transform 0.15s ease;
        }
        .x-date-picker-btn:hover {
          color: #FB7185;
          transform: translateY(-50%) scale(1.08);
        }
        .x-native-date-hidden {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          opacity: 0;
          pointer-events: none;
          border: 0;
          padding: 0;
          margin: 0;
          z-index: -1;
        }
        .x-filter-reset {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          height: 32px;
          padding: 0 11px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(244, 244, 246, 0.75);
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .x-filter-reset:hover:not(:disabled) {
          border-color: rgba(251, 113, 133, 0.45);
          background: rgba(225, 29, 72, 0.16);
          color: #FFFFFF;
        }
        .x-filter-reset:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .x-filter-metrics {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 16px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10.5px;
          color: rgba(244, 244, 246, 0.7);
        }
        .x-filter-stat-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .x-filter-stat-item strong {
          color: #FFFFFF;
          font-weight: 600;
        }
        .x-filter-stat-item strong.highlight {
          color: #FB7185;
        }
        @media (max-width: 960px) {
          .x-filter-toolbar {
            flex-direction: column;
            align-items: flex-start;
          }
          .x-filter-tag {
            border-right: none;
            padding-right: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="x-filter-controls-group">
        <div className="x-filter-tag">
          <DiamondCrosshair />
          <span>Filters</span>
        </div>

        <div className="x-filter-field">
          <label htmlFor="filter-product-type" className="x-filter-label">
            Product
          </label>
          <select
            id="filter-product-type"
            className="x-filter-select"
            value={filters.productType}
            onChange={update('productType')}
          >
            <option value="">All Products ({productTypes.length})</option>
            {productTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="x-filter-field">
          <label htmlFor="filter-start-date" className="x-filter-label">
            From <span className="text-[8.5px] opacity-60 font-mono tracking-normal lowercase">(yyyy-mm-dd)</span>
          </label>
          <IsoDateInput
            id="filter-start-date"
            placeholder="yyyy-mm-dd"
            value={filters.startDate}
            max={filters.endDate || undefined}
            onChange={updateValue('startDate')}
            ariaLabel="Start acquisition date"
          />
        </div>

        <div className="x-filter-field">
          <label htmlFor="filter-end-date" className="x-filter-label">
            To <span className="text-[8.5px] opacity-60 font-mono tracking-normal lowercase">(yyyy-mm-dd)</span>
          </label>
          <IsoDateInput
            id="filter-end-date"
            placeholder="yyyy-mm-dd"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={updateValue('endDate')}
            ariaLabel="End acquisition date"
          />
        </div>

        <button
          type="button"
          className="x-filter-reset"
          onClick={onReset}
          disabled={!hasActiveFilters}
          aria-label="Clear active filters"
        >
          <RotateCcw size={11} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      <div className="x-filter-metrics" aria-live="polite">
        <div className="x-filter-stat-item">
          <span>Matching Passes:</span>
          <strong className={resultCount < totalCount ? 'highlight' : ''}>
            {resultCount} / {totalCount}
          </strong>
        </div>
        <div className="x-filter-stat-item hidden sm:inline-flex">
          <span>Coverage:</span>
          <strong>{coverage || 'Full Orbital Record'}</strong>
        </div>
        <div className="x-filter-stat-item hidden md:inline-flex">
          <span>Cycle:</span>
          <strong>12-Day Repeat</strong>
        </div>
      </div>
    </div>
  );
}

function IsoDateInput({
  id,
  value = '',
  min,
  max,
  placeholder = 'yyyy-mm-dd',
  onChange,
  ariaLabel,
}) {
  const [localValue, setLocalValue] = React.useState(value || '');
  const pickerRef = React.useRef(null);

  React.useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleOpenPicker = (e) => {
    e.preventDefault();
    if (pickerRef.current) {
      try {
        if (typeof pickerRef.current.showPicker === 'function') {
          pickerRef.current.showPicker();
        } else {
          pickerRef.current.focus();
          pickerRef.current.click();
        }
      } catch {
        pickerRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && (e.altKey || e.metaKey)) {
      handleOpenPicker(e);
    } else if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (!raw) {
      setLocalValue('');
      onChange('');
      return;
    }
    const sanitized = raw.replace(/[^\d-]/g, '').slice(0, 10);
    setLocalValue(sanitized);
    if (/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) {
      onChange(sanitized);
    }
  };

  const handleBlur = () => {
    if (!localValue) {
      onChange('');
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(localValue)) {
      onChange(localValue);
    } else {
      setLocalValue(value || '');
    }
  };

  const handlePickerChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    onChange(val);
  };

  return (
    <div className="x-date-input-wrap">
      <input
        id={id}
        type="text"
        className="x-filter-input x-filter-date"
        placeholder={placeholder}
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        maxLength={10}
        autoComplete="off"
        spellCheck="false"
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className="x-date-picker-btn"
        title="Open calendar picker"
        aria-label={`Open calendar for ${ariaLabel || id}`}
        onClick={handleOpenPicker}
        tabIndex={-1}
      >
        <CalendarDays size={12} aria-hidden="true" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
        min={min}
        max={max}
        onChange={handlePickerChange}
        className="x-native-date-hidden"
      />
    </div>
  );
}
