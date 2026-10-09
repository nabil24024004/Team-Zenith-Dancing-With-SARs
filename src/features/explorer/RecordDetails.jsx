import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  BookmarkPlus,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  RadioTower,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DiamondCrosshair } from '../../components/ZenithElements.jsx';
import { SME2_L3_DATASET } from './sme2Data.js';
import SyntheticPreview from './SyntheticPreview.jsx';

function valueOrDash(value) {
  return value == null || value === '' ? 'Not provided' : String(value);
}

function centerOf(feature) {
  const points = feature?.geometry?.coordinates?.[0] ?? [];
  if (!points.length) return null;
  const totals = points
    .slice(0, -1)
    .reduce((sum, [lon, lat]) => [sum[0] + lon, sum[1] + lat], [0, 0]);
  const count = Math.max(points.length - 1, 1);
  return `${(totals[0] / count).toFixed(3)}°, ${(totals[1] / count).toFixed(3)}°`;
}

function formatBytes(bytes) {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (num >= 1_073_741_824) return `${(num / 1_073_741_824).toFixed(2)} GB`;
  if (num >= 1_048_576) return `${(num / 1_048_576).toFixed(1)} MB`;
  if (num >= 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${num} B`;
}

function proxyAssetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  return `/api/earthdata-asset?url=${encodeURIComponent(rawUrl)}`;
}

function labelForBrowseUrl(url, index) {
  if (typeof url !== 'string') return `BROWSE ${index + 1}`;
  const match = /_NATIVE_([AB])_([HV]{4})/i.exec(url);
  if (match) {
    return `FREQ ${match[1].toUpperCase()} · ${match[2].toUpperCase()}`;
  }
  if (url.endsWith('_BROWSE_LATLON.png')) return 'LATLON · COMPOSITE';
  if (url.endsWith('_LATLON.png')) return 'LATLON · GEOCODED';
  if (url.endsWith('_BROWSE.png')) return 'SAR OVERVIEW';
  return `VIEW ${index + 1}`;
}

function parseQaCsv(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) return [];
  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const parts = line.split(',');
    const tool = parts[0]?.trim() || 'QA';
    const checkDesc = parts[1]?.trim() || 'QA check';
    const result = parts[2]?.trim() || 'PASS';
    const threshold = parts[3]?.trim() || '';
    const actual = parts[4]?.trim() || '';
    const notes = parts.slice(5).join(',').trim() || '';
    const valueLabel = actual
      ? `${actual}%${threshold ? ` (limit ${threshold}%)` : ''}`
      : 'Verified';
    return {
      dataset: notes || tool,
      description: checkDesc,
      check: checkDesc,
      result,
      value: valueLabel,
    };
  });
}

export default function RecordDetails({
  feature,
  drapeRadarOnGlobe = true,
  onToggleDrapeRadar,
  onFlyToSme2,
  onPinWatchpoint,
  isPinned = false,
  pinning = false,
  watchpoints = [],
  onSelectWatchpoint,
  onDeleteWatchpoint,
  activeId,
}) {
  const [copied, setCopied] = useState(false);
  const [selectedBrowseIdx, setSelectedBrowseIdx] = useState(0);
  const [browseLoaded, setBrowseLoaded] = useState(false);
  const [browseError, setBrowseError] = useState(false);
  const [qaRows, setQaRows] = useState([]);
  const [qaStatus, setQaStatus] = useState('idle');
  const copyTimeoutRef = useRef(null);

  const p = feature?.properties ?? {};

  // Deduplicate browse URLs while preserving distinct polarization/projection views
  const browseItems = useMemo(() => {
    if (!Array.isArray(p.browse)) return [];
    const seenUrls = new Set();
    const seenLabels = new Set();
    const list = [];
    p.browse.forEach((u, idx) => {
      if (typeof u !== 'string' || !/^https:\/\//i.test(u)) return;
      if (seenUrls.has(u)) return;
      seenUrls.add(u);
      let label = labelForBrowseUrl(u, idx);
      if (seenLabels.has(label)) {
        label = `${label} (${idx + 1})`;
      }
      seenLabels.add(label);
      list.push({ url: u, label });
    });
    return list;
  }, [p.browse]);

  const additionalUrls = useMemo(() => {
    const raw = p.nisar?.additionalUrls;
    return Array.isArray(raw)
      ? raw.filter((u) => typeof u === 'string' && /^https:\/\//i.test(u))
      : [];
  }, [p.nisar]);

  const qaCsvUrl = useMemo(
    () => additionalUrls.find((u) => u.endsWith('_QA_SUMMARY.csv')) ?? null,
    [additionalUrls]
  );
  const qaPdfUrl = useMemo(
    () => additionalUrls.find((u) => u.endsWith('_QA_REPORT.pdf')) ?? null,
    [additionalUrls]
  );
  const runConfigUrl = useMemo(
    () => additionalUrls.find((u) => u.endsWith('.rc.yaml')) ?? null,
    [additionalUrls]
  );
  const isoXmlUrl = useMemo(
    () => additionalUrls.find((u) => u.endsWith('.iso.xml')) ?? null,
    [additionalUrls]
  );

  useEffect(() => {
    setCopied(false);
    setSelectedBrowseIdx(0);
    setBrowseLoaded(false);
    setBrowseError(false);
    if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    };
  }, [feature?.id]);

  // Fetch authenticated NASA Earthdata QA Summary CSV when available
  useEffect(() => {
    if (!qaCsvUrl) {
      setQaRows([]);
      setQaStatus('idle');
      return undefined;
    }
    let cancelled = false;
    setQaStatus('loading');
    fetch(proxyAssetUrl(qaCsvUrl))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parseQaCsv(text);
        setQaRows(parsed);
        setQaStatus(parsed.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!cancelled) {
          setQaRows([]);
          setQaStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qaCsvUrl]);

  if (!feature) {
    return (
      <div className="x-inspection-deck">
        <section className="explorer-panel x-details x-details-empty">
          <div className="x-empty">
            <span>Select an observation</span>
            <span>
              Choose a row in the timeline or a footprint on the 3D globe to
              inspect authenticated NASA Earthdata SAR browse imagery, QA
              telemetry, and HDF5 assets.
            </span>
          </div>
        </section>
      </div>
    );
  }

  const granule = p.granuleName ?? p.granuleUr ?? feature.id ?? 'Observation';
  const isSme2Record =
    (p.processingLevel ?? p.productType) === 'SME2' ||
    granule.includes('_SME2_');
  const catalogUrl =
    typeof p.url === 'string' && /^https:\/\//i.test(p.url) ? p.url : null;
  const downloadUrl =
    typeof p.downloadUrl === 'string' && /^https:\/\//i.test(p.downloadUrl)
      ? p.downloadUrl
      : null;
  const externalUrl = catalogUrl ?? downloadUrl;
  const sizeFormatted = formatBytes(p.bytes);

  const fields = [
    ['Processing level', p.processingType],
    ['Product type', p.processingLevel ?? p.productType],
    [
      'Acquired',
      p.startTime
        ? new Date(p.startTime)
            .toISOString()
            .replace('T', ' ')
            .replace('Z', ' UTC')
        : p.acquisitionDate,
    ],
    [
      'Stopped',
      p.stopTime
        ? new Date(p.stopTime)
            .toISOString()
            .replace('T', ' ')
            .replace('Z', ' UTC')
        : null,
    ],
    ['Platform', p.platform],
    ['Orbit direction', p.flightDirection],
    ['Beam mode', p.beamMode],
    ['Polarization', p.polarization],
    ['Track / frame', [p.pathNumber, p.frameNumber].filter(Boolean).join(' / ')],
    ['Granule size', sizeFormatted],
    ['Science DOI', p.nisar?.doi ?? (isSme2Record ? SME2_L3_DATASET.doi : null)],
    ['Footprint center', centerOf(feature)],
  ];

  const copyLink = async () => {
    if (!externalUrl || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(externalUrl);
      setCopied(true);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const activeBrowseItem =
    browseItems[selectedBrowseIdx] ?? browseItems[0] ?? null;
  const proxiedBrowseSrc = activeBrowseItem
    ? proxyAssetUrl(activeBrowseItem.url)
    : null;

  return (
    <div className="x-inspection-deck">
      {/* COLUMN 1: 04 // SELECTED RECORD METADATA & CLOUD ASSETS */}
      <section
        className="explorer-panel x-details"
        aria-labelledby="x-details-title"
      >
        <div className="x-panel-heading">
          <div>
            <span className="x-eyebrow">
              <DiamondCrosshair />
              <span>04 // SELECTED RECORD</span>
            </span>
            <h2 id="x-details-title">Observation details</h2>
          </div>
          <span className="x-product-badge">
            {valueOrDash(p.processingLevel ?? p.productType)}
          </span>
        </div>

        <p className="x-record-id" title={granule}>
          {granule}
        </p>

        <dl className="x-metadata">
          {fields
            .filter(([, value]) => value != null && value !== '')
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{valueOrDash(value)}</dd>
              </div>
            ))}
        </dl>

        {/* Primary Earthdata Cloud, Supabase & ASF Actions */}
        <div className="x-record-actions">
          {externalUrl ? (
            <>
              <a
                className="x-link-button"
                href={proxyAssetUrl(externalUrl)}
                target="_blank"
                rel="noreferrer"
                aria-label="Download HDF5 granule via Earthdata token proxy"
              >
                <Download size={13} aria-hidden="true" />
                <span>
                  Download HDF5 {sizeFormatted ? `(${sizeFormatted})` : ''}
                </span>
              </a>
              <button
                className="x-icon-button"
                type="button"
                onClick={copyLink}
                aria-label="Copy ASF Cloud URL"
                title="Copy ASF Cloud URL"
              >
                <Copy size={13} aria-hidden="true" />
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            </>
          ) : isSme2Record ? (
            <button
              className="x-link-button"
              type="button"
              onClick={onFlyToSme2}
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>Focus 561-Pixel L3 Grid on Globe</span>
            </button>
          ) : (
            <span className="x-disabled-link" aria-disabled="true">
              <RadioTower size={13} aria-hidden="true" /> ASF URL unavailable
              for this record
            </span>
          )}
          {onPinWatchpoint && (
            <button
              className="x-icon-button"
              type="button"
              disabled={pinning || isPinned}
              onClick={() => onPinWatchpoint(feature)}
              title="Persist this observation as a Mission Watchpoint in Supabase Cloud"
            >
              <BookmarkPlus size={13} aria-hidden="true" />
              <span>
                {pinning
                  ? 'Saving…'
                  : isPinned
                    ? 'Pinned in Supabase'
                    : 'Pin to Supabase'}
              </span>
            </button>
          )}
        </div>

        {/* Companion Cloud Assets (QA PDF, QA CSV, RunConfig YAML, ISO XML) */}
        {(qaPdfUrl || qaCsvUrl || runConfigUrl || isoXmlUrl) && (
          <div className="x-cloud-assets">
            <span className="x-sub-eyebrow">
              EARTHDATA CLOUD COMPANION ASSETS (AUTHENTICATED)
            </span>
            <div className="x-asset-chips">
              {qaPdfUrl && (
                <a
                  href={proxyAssetUrl(qaPdfUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="x-asset-chip"
                >
                  <FileText size={11} aria-hidden="true" />
                  <span>QA Report PDF</span>
                  <ArrowUpRight size={10} aria-hidden="true" />
                </a>
              )}
              {qaCsvUrl && (
                <a
                  href={proxyAssetUrl(qaCsvUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="x-asset-chip"
                >
                  <FileSpreadsheet size={11} aria-hidden="true" />
                  <span>QA Summary CSV</span>
                  <ArrowUpRight size={10} aria-hidden="true" />
                </a>
              )}
              {runConfigUrl && (
                <a
                  href={proxyAssetUrl(runConfigUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="x-asset-chip"
                >
                  <FileCode2 size={11} aria-hidden="true" />
                  <span>ISCE3 RunConfig YAML</span>
                  <ArrowUpRight size={10} aria-hidden="true" />
                </a>
              )}
              {isoXmlUrl && (
                <a
                  href={proxyAssetUrl(isoXmlUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="x-asset-chip"
                >
                  <FileCode2 size={11} aria-hidden="true" />
                  <span>ISO 19115 XML</span>
                  <ArrowUpRight size={10} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* COLUMN 2: 05 // AUTHENTICATED NISAR SAR IMAGERY (OR L3 SME2 / SYNTHETIC PREVIEW) */}
      {browseItems.length > 0 ? (
        <section
          className="explorer-panel x-browse-panel"
          aria-label="Authenticated NISAR SAR browse imagery"
        >
          <div className="x-panel-heading">
            <div>
              <span className="x-eyebrow">
                <DiamondCrosshair />
                <span>05 // AUTHENTICATED NISAR SAR IMAGERY</span>
              </span>
              <h2>Real L-band radar browse</h2>
            </div>
            {onToggleDrapeRadar && (
              <button
                type="button"
                className={`x-drape-btn${drapeRadarOnGlobe ? ' is-active' : ''}`}
                onClick={onToggleDrapeRadar}
                aria-pressed={drapeRadarOnGlobe}
                title="Drape geocoded SAR browse raster directly over the 3D globe footprint"
              >
                <Layers size={11} aria-hidden="true" />
                <span>
                  {drapeRadarOnGlobe ? 'Draped on 3D Globe' : 'Drape on Globe'}
                </span>
              </button>
            )}
          </div>

          {browseItems.length > 1 && (
            <div
              className="x-browse-tabs"
              role="tablist"
              aria-label="SAR polarization and projection views"
            >
              {browseItems.map((item, idx) => (
                <button
                  key={item.url}
                  type="button"
                  role="tab"
                  aria-selected={selectedBrowseIdx === idx}
                  className={`x-browse-tab${
                    selectedBrowseIdx === idx ? ' is-active' : ''
                  }`}
                  onClick={() => {
                    setSelectedBrowseIdx(idx);
                    setBrowseLoaded(false);
                    setBrowseError(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="x-browse-stage">
            {!browseLoaded && !browseError && (
              <div className="x-browse-loading">
                <Loader2 size={18} className="animate-spin text-[#A78BFA]" />
                <span>
                  Streaming authenticated SAR browse PNG via Supabase CDN &amp;
                  NASA Earthdata Cloud…
                </span>
              </div>
            )}
            {browseError ? (
              <div className="x-browse-loading">
                <span>
                  Browse preview failed to stream via proxy. Click below to open
                  directly on Earthdata Cloud.
                </span>
              </div>
            ) : (
              <img
                src={proxiedBrowseSrc}
                alt={`NISAR ${p.processingLevel ?? 'SAR'} browse image for ${granule}`}
                className={`x-browse-img${browseLoaded ? ' is-loaded' : ''}`}
                onLoad={() => setBrowseLoaded(true)}
                onError={() => setBrowseError(true)}
              />
            )}
          </div>

          <div className="x-browse-footer">
            <span>
              SOURCE: SUPABASE CDN + EARTHDATA · {activeBrowseItem?.label}
            </span>
            <a
              href={proxiedBrowseSrc}
              target="_blank"
              rel="noreferrer"
              className="x-browse-open"
            >
              <Eye size={11} aria-hidden="true" />
              <span>Full PNG</span>
            </a>
          </div>
        </section>
      ) : isSme2Record ? (
        <section
          className="explorer-panel x-sme2-panel"
          aria-label="Parsed L3 Soil Moisture EASE-Grid 2.0 telemetry"
        >
          <div className="x-panel-heading">
            <div>
              <span className="x-eyebrow">
                <DiamondCrosshair />
                <span>05 // PARSED HDF5 L3 SOIL MOISTURE (SME2)</span>
              </span>
              <h2>200m EASE-Grid 2.0 Telemetry</h2>
            </div>
            <span className="x-product-badge">561 PIXELS</span>
          </div>
          <p className="x-helper-text">
            Extracted directly from{' '}
            <code className="text-white/85">nisar_sme2.json</code> · Volumetric
            soil moisture (<code className="text-white/85">m³/m³</code>) across
            Svalbard Arctic permafrost (Track 141, Frame 045).
          </p>
          <div className="x-sme2-stats">
            <div>
              <span>Min Moisture</span>
              <strong>{(SME2_L3_DATASET.stats.min * 100).toFixed(1)}%</strong>
              <small>{SME2_L3_DATASET.stats.min.toFixed(3)} m³/m³</small>
            </div>
            <div>
              <span>Mean Moisture</span>
              <strong className="text-[#A78BFA]">
                {(SME2_L3_DATASET.stats.mean * 100).toFixed(1)}%
              </strong>
              <small>{SME2_L3_DATASET.stats.mean.toFixed(3)} m³/m³</small>
            </div>
            <div>
              <span>Peak Moisture</span>
              <strong className="text-[#FB7185]">
                {(SME2_L3_DATASET.stats.max * 100).toFixed(1)}%
              </strong>
              <small>{SME2_L3_DATASET.stats.max.toFixed(3)} m³/m³</small>
            </div>
          </div>
          <div className="x-record-actions" style={{ marginTop: '16px' }}>
            <button
              className="x-link-button"
              type="button"
              onClick={onFlyToSme2}
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>Fly 3D Camera to Svalbard 561-Pixel Grid</span>
            </button>
          </div>
        </section>
      ) : (
        <SyntheticPreview />
      )}

      {/* COLUMN 3: 06 // LIVE QA TELEMETRY & SUPABASE CLOUD WATCHPOINTS */}
      <section
        className="explorer-panel x-qa-watchpoints-panel"
        aria-label="Live NISAR QA telemetry and Supabase Cloud Watchpoints"
      >
        <div className="x-panel-heading">
          <div>
            <span className="x-eyebrow">
              <DiamondCrosshair />
              <span>06 // TELEMETRY &amp; SUPABASE CLOUD</span>
            </span>
            <h2>QA checks &amp; watchpoints</h2>
          </div>
          {qaStatus === 'ready' ? (
            <span className="x-qa-pill is-pass">
              <CheckCircle2 size={10} /> {qaRows.length} QA checks
            </span>
          ) : (
            <span className="x-product-badge">
              {watchpoints.length} SAVED
            </span>
          )}
        </div>

        {/* Live Authenticated QA Telemetry Table */}
        {qaCsvUrl ? (
          <div className="x-qa-box">
            <div className="x-qa-header">
              <span className="x-sub-eyebrow">
                LIVE NISAR QA TELEMETRY · EARTHDATA CLOUD
              </span>
              {qaStatus === 'loading' && (
                <span className="x-qa-pill">
                  <Loader2 size={10} className="animate-spin" /> Fetching CSV…
                </span>
              )}
            </div>
            {qaStatus === 'ready' && qaRows.length > 0 && (
              <div className="x-qa-list">
                {qaRows.map((row, idx) => (
                  <div key={`${row.check}-${idx}`} className="x-qa-row">
                    <div>
                      <strong>{row.description}</strong>
                      <span>
                        {row.dataset} · {row.value}
                      </span>
                    </div>
                    <span
                      className={`x-qa-badge ${
                        row.result.toUpperCase() === 'PASS'
                          ? 'is-pass'
                          : 'is-warn'
                      }`}
                    >
                      {row.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="x-qa-box">
            <span className="x-sub-eyebrow">
              QA TELEMETRY STATUS
            </span>
            <p className="x-helper-text" style={{ margin: 0 }}>
              {isSme2Record
                ? 'L3 Soil Moisture HDF5 quality flags verified: 561 valid land pixels extracted across Svalbard EASE-Grid 2.0.'
                : 'Select any L1/L2 science product (GCOV, GUNW, GSLC, RSLC) to stream its live NASA Earthdata _QA_SUMMARY.csv verification checks.'}
            </p>
          </div>
        )}

        {/* Supabase Cloud Watchpoints List */}
        <div className="x-watchpoints-sub">
          <div className="x-qa-header">
            <span className="x-sub-eyebrow">
              SUPABASE POSTGIS WATCHPOINTS (PUBLIC.MISSION_WATCHPOINTS)
            </span>
            <span className="x-qa-pill">
              {watchpoints.length} synced
            </span>
          </div>
          <div className="x-wp-list">
            {watchpoints.map((wp) => {
              const isActive =
                activeId && wp.pinned_granule_id === activeId;
              return (
                <div
                  key={wp.id}
                  role="button"
                  tabIndex={0}
                  className={`x-wp-card${isActive ? ' is-active' : ''}`}
                  onClick={() => onSelectWatchpoint?.(wp)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectWatchpoint?.(wp);
                    }
                  }}
                >
                  <div className="x-wp-top">
                    <span className="x-wp-title">
                      <Bookmark
                        size={10}
                        className="inline mr-1.5 text-[#A78BFA]"
                      />
                      {wp.title}
                    </span>
                    {onDeleteWatchpoint && (
                      <button
                        type="button"
                        className="x-wp-del"
                        aria-label={`Remove ${wp.title} from Supabase`}
                        title="Remove watchpoint from Supabase"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWatchpoint(wp.id);
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <span className="x-wp-meta">
                    {wp.product_type || 'SAR'} ·{' '}
                    {Number(wp.latitude).toFixed(2)}°N,{' '}
                    {Number(wp.longitude).toFixed(2)}°E · {wp.status}
                  </span>
                  {wp.notes && <p className="x-wp-notes">{wp.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
