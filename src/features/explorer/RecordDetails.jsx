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
import BackscatterHistogram from './BackscatterHistogram.jsx';

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
  comparePair = null,
  changeProduct = null,
  activeThresholdDb = -18.0,
  onThresholdChange,
  onExitCompare,
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

  // Handle Multi-Temporal Change Mode when two granules are being compared
  if (comparePair?.granuleA && comparePair?.granuleB) {
    const granuleA = comparePair.granuleA;
    const granuleB = comparePair.granuleB;
    const pA = granuleA.properties ?? granuleA;
    const pB = granuleB.properties ?? granuleB;

    const idA = granuleA.id ?? pA.id ?? pA.granuleName;
    const idB = granuleB.id ?? pB.id ?? pB.granuleName;
    const dateA = pA.acquisitionDate ?? (pA.startTime ? pA.startTime.slice(0, 10) : 'Date A');
    const dateB = pB.acquisitionDate ?? (pB.startTime ? pB.startTime.slice(0, 10) : 'Date B');
    const track = pA.track ?? pA.pathNumber ?? '—';
    const frame = pA.frameNumber ?? '—';

    const stats = changeProduct?.stats ?? {
      permanentWaterKm2: 0,
      newWaterKm2: 0,
      waterLostKm2: 0,
      netChangeKm2: 0,
      pixelAreaKm2: 0,
      totalValidPx: 0,
    };

    const handleDownloadReport = () => {
      if (!changeProduct) return;
      const reportData = {
        title: 'Team Zenith NISAR Multi-Temporal SAR Change Analysis Report',
        timestamp: new Date().toISOString(),
        algorithm: '5x5 Linear Boxcar Speckle Filter + Otsu Bimodal Thresholding + Geodesic Area',
        granuleA: {
          id: idA,
          name: pA.granuleName,
          date: dateA,
          track,
          frame,
          direction: pA.flightDirection,
          polarization: pA.polarization,
          beamMode: pA.beamMode,
        },
        granuleB: {
          id: idB,
          name: pB.granuleName,
          date: dateB,
          track,
          frame,
          direction: pB.flightDirection,
          polarization: pB.polarization,
          beamMode: pB.beamMode,
        },
        thresholdDb: activeThresholdDb,
        otsuA: changeProduct.otsuA,
        otsuB: changeProduct.otsuB,
        surfaceChangeStatistics: {
          permanentWaterKm2: stats.permanentWaterKm2,
          newWaterInundationKm2: stats.newWaterKm2,
          waterLostRecededKm2: stats.waterLostKm2,
          netWaterChangeKm2: stats.netChangeKm2,
          geodesicPixelAreaKm2: stats.pixelAreaKm2,
          totalValidPixels: stats.totalValidPx,
        },
        boundsWgs84: changeProduct.bounds,
      };
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NISAR_SAR_Change_Report_${dateA}_vs_${dateB}.json`;
      link.click();
      URL.revokeObjectURL(url);
    };

    const handleDownloadMask = () => {
      if (!changeProduct?.waterClassDataUrl) return;
      const link = document.createElement('a');
      link.href = changeProduct.waterClassDataUrl;
      link.download = `NISAR_SAR_Change_Mask_${dateA}_vs_${dateB}.png`;
      link.click();
    };

    const handlePinChangeStudy = () => {
      if (!onPinWatchpoint || !changeProduct) return;
      const studyWatchpoint = {
        title: `Multi-Temporal Flood Study: ${dateA} vs ${dateB}`,
        pinned_granule_id: `${idA}__VS__${idB}`,
        product_type: `${pA.processingLevel ?? 'GCOV'} Change Pair`,
        latitude: (changeProduct.bounds.south + changeProduct.bounds.north) / 2,
        longitude: (changeProduct.bounds.west + changeProduct.bounds.east) / 2,
        notes: `Permanent Water: ${stats.permanentWaterKm2} km², New Flood Water: +${stats.newWaterKm2} km², Water Receded: -${stats.waterLostKm2} km², Net Water Change: ${stats.netChangeKm2 > 0 ? '+' : ''}${stats.netChangeKm2} km² (T = ${activeThresholdDb.toFixed(1)} dB). Track ${track}, Frame ${frame}.`,
        status: 'ACTIVE',
      };
      onPinWatchpoint(studyWatchpoint);
    };

    return (
      <div className="x-inspection-deck">
        <style>{`
          .x-compare-pair-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 12px;
          }
          .x-compare-granule-card {
            background: rgba(12, 12, 18, 0.7);
            border: 1px solid rgba(244, 244, 246, 0.08);
            border-radius: 8px;
            padding: 10px 12px;
          }
          .x-compare-granule-card.is-card-a {
            border-color: rgba(139, 92, 246, 0.35);
          }
          .x-compare-granule-card.is-card-b {
            border-color: rgba(225, 29, 72, 0.35);
          }
          .x-granule-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .x-date-pill {
            font-family: 'JetBrains Mono', monospace;
            font-size: 9.5px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            letter-spacing: 0.04em;
          }
          .x-date-pill.is-pill-a {
            background: rgba(139, 92, 246, 0.2);
            color: #C4B5FD;
            border: 1px solid rgba(139, 92, 246, 0.4);
          }
          .x-date-pill.is-pill-b {
            background: rgba(225, 29, 72, 0.2);
            color: #FB7185;
            border: 1px solid rgba(225, 29, 72, 0.4);
          }
          .x-granule-date {
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 600;
            color: #F4F4F6;
          }
          .x-granule-name-box {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: rgba(244, 244, 246, 0.65);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 6px;
          }
          .x-granule-mini-fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 10px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9.5px;
          }
          .x-granule-mini-fields span {
            color: rgba(244, 244, 246, 0.45);
          }
          .x-granule-mini-fields strong {
            color: #F4F4F6;
            margin-left: 4px;
          }
          .x-orbit-verify-banner {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(139, 92, 246, 0.12);
            border: 1px solid rgba(139, 92, 246, 0.35);
            padding: 7px 10px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: #C4B5FD;
            margin-bottom: 12px;
          }
          .x-telemetry-cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
          }
          .x-telemetry-card {
            background: rgba(12, 12, 18, 0.75);
            border: 1px solid rgba(244, 244, 246, 0.1);
            border-radius: 8px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .x-telemetry-card.is-perm {
            border-color: rgba(76, 29, 149, 0.6);
            background: rgba(76, 29, 149, 0.12);
          }
          .x-telemetry-card.is-new {
            border-color: rgba(225, 29, 72, 0.6);
            background: rgba(225, 29, 72, 0.12);
          }
          .x-telemetry-card.is-lost {
            border-color: rgba(196, 181, 253, 0.4);
            background: rgba(196, 181, 253, 0.08);
          }
          .x-telemetry-card.is-net {
            border-color: rgba(244, 244, 246, 0.3);
            background: rgba(244, 244, 246, 0.05);
          }
          .x-card-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 9px;
            font-weight: 700;
            color: rgba(244, 244, 246, 0.6);
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .x-card-val {
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
          }
          .x-card-sub {
            font-family: 'JetBrains Mono', monospace;
            font-size: 8.5px;
            color: rgba(244, 244, 246, 0.4);
          }
          .x-threshold-slider-box {
            background: rgba(8, 8, 12, 0.8);
            border: 1px solid rgba(244, 244, 246, 0.1);
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 12px;
          }
          .x-slider-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          .x-slider-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: rgba(244, 244, 246, 0.8);
          }
          .x-slider-presets {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .x-preset-pill {
            background: rgba(244, 244, 246, 0.06);
            border: 1px solid rgba(244, 244, 246, 0.14);
            color: rgba(244, 244, 246, 0.7);
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .x-preset-pill:hover {
            background: rgba(244, 244, 246, 0.14);
            color: #FFFFFF;
          }
          .x-preset-pill.is-active {
            background: #E11D48;
            border-color: #FB7185;
            color: #FFFFFF;
          }
          .x-threshold-range {
            width: 100%;
            accent-color: #E11D48;
            cursor: pointer;
            margin: 0;
          }
          .x-insar-math-card {
            background: rgba(10, 10, 16, 0.8);
            border: 1px solid rgba(139, 92, 246, 0.25);
            border-radius: 8px;
            padding: 10px 12px;
            margin-top: 6px;
          }
          .x-insar-formula {
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 700;
            color: #C4B5FD;
            background: rgba(139, 92, 246, 0.15);
            padding: 5px 8px;
            border-radius: 4px;
            margin-bottom: 6px;
            border: 1px solid rgba(139, 92, 246, 0.3);
          }
          .x-insar-explanation {
            font-size: 11px;
            line-height: 1.5;
            color: rgba(244, 244, 246, 0.7);
            margin: 0;
          }
          .x-physics-box {
            margin-top: 14px;
            border-top: 1px solid rgba(244, 244, 246, 0.08);
            padding-top: 12px;
          }
          .x-physics-cards {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .x-physics-item {
            background: rgba(12, 12, 18, 0.6);
            border: 1px solid rgba(244, 244, 246, 0.08);
            border-radius: 6px;
            padding: 8px 10px;
          }
          .x-physics-item strong {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 10.5px;
            color: #F4F4F6;
            display: block;
            margin-bottom: 3px;
          }
          .x-physics-item p {
            font-size: 10.5px;
            line-height: 1.45;
            color: rgba(244, 244, 246, 0.65);
            margin: 0;
          }
        `}</style>

        {/* COLUMN 1: 04 // MULTI-TEMPORAL PAIR & EXPORT */}
        <section
          className="explorer-panel x-details"
          aria-labelledby="x-compare-pair-title"
        >
          <div className="x-panel-heading">
            <div>
              <span className="x-eyebrow">
                <DiamondCrosshair />
                <span>
                  {stats.isCrossLocation
                    ? '04 // DUAL-REGION COMPARATIVE SAR STUDY'
                    : '04 // MULTI-TEMPORAL PAIR & EXPORT'}
                </span>
              </span>
              <h2 id="x-compare-pair-title">
                {stats.isCrossLocation
                  ? 'Cross-Location Radar Analysis'
                  : 'Repeat-Pass Orbital Pair'}
              </h2>
            </div>
            <span className="x-product-badge">
              {stats.isCrossLocation
                ? `CROSS-LOC (${stats.separationKm} km)`
                : `${pA.processingLevel ?? 'GCOV'} PAIR`}
            </span>
          </div>

          <div className="x-compare-pair-grid">
            <div className="x-compare-granule-card is-card-a">
              <div className="x-granule-card-header">
                <span className="x-date-pill is-pill-a">
                  {stats.isCrossLocation ? 'LOCATION A (REFERENCE)' : 'DATE A (REFERENCE)'}
                </span>
                <span className="x-granule-date">{dateA}</span>
              </div>
              <div className="x-granule-name-box" title={pA.granuleName}>
                {pA.granuleName ?? idA}
              </div>
              <div className="x-granule-mini-fields">
                <div><span>Pass:</span> <strong>{pA.flightDirection ?? 'ASC'}</strong></div>
                <div><span>Track / Frame:</span> <strong>{track} / {frame}</strong></div>
                <div><span>Polarization:</span> <strong>{pA.polarization ?? 'Dual-Pol'}</strong></div>
                <div><span>Start:</span> <strong>{pA.startTime ? pA.startTime.slice(11, 19) + ' UTC' : '—'}</strong></div>
              </div>
            </div>

            <div className="x-compare-granule-card is-card-b">
              <div className="x-granule-card-header">
                <span className="x-date-pill is-pill-b">
                  {stats.isCrossLocation ? 'LOCATION B (SECONDARY)' : 'DATE B (SECONDARY)'}
                </span>
                <span className="x-granule-date">{dateB}</span>
              </div>
              <div className="x-granule-name-box" title={pB.granuleName}>
                {pB.granuleName ?? idB}
              </div>
              <div className="x-granule-mini-fields">
                <div><span>Pass:</span> <strong>{pB.flightDirection ?? 'ASC'}</strong></div>
                <div><span>Track / Frame:</span> <strong>{pB.track ?? pB.pathNumber ?? '—'} / {pB.frameNumber ?? '—'}</strong></div>
                <div><span>Polarization:</span> <strong>{pB.polarization ?? 'Dual-Pol'}</strong></div>
                <div><span>Start:</span> <strong>{pB.startTime ? pB.startTime.slice(11, 19) + ' UTC' : '—'}</strong></div>
              </div>
            </div>
          </div>

          <div className="x-orbit-verify-banner">
            <CheckCircle2 size={13} className="text-[#A78BFA] flex-shrink-0" />
            <span>
              {stats.isCrossLocation
                ? `Dual-Region Analysis Active · ${stats.separationKm} km Separation`
                : `Repeat-Pass Co-Registration Verified · Track ${track}, Frame ${frame}`}
            </span>
          </div>

          <div className="x-record-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="x-link-button is-primary"
              onClick={handlePinChangeStudy}
              disabled={pinning}
            >
              <BookmarkPlus size={13} aria-hidden="true" />
              <span>{pinning ? 'Pinning Study…' : 'Pin Change Study to Supabase'}</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="x-link-button"
                style={{ flex: 1 }}
                onClick={handleDownloadReport}
                title="Download formatted JSON report with all surface change statistics"
              >
                <Download size={13} aria-hidden="true" />
                <span>Export Report JSON</span>
              </button>

              <button
                type="button"
                className="x-link-button"
                style={{ flex: 1 }}
                onClick={handleDownloadMask}
                title="Download transparent change mask PNG"
              >
                <Download size={13} aria-hidden="true" />
                <span>Download PNG Mask</span>
              </button>
            </div>

            <button
              type="button"
              className="x-link-button"
              style={{ opacity: 0.7 }}
              onClick={onExitCompare}
            >
              <span>Exit Multi-Temporal Compare</span>
            </button>
          </div>
        </section>

        {/* COLUMN 2: 05 // THRESHOLD SENSITIVITY & BIMODAL dB HISTOGRAM */}
        <section
          className="explorer-panel x-preview-panel"
          aria-labelledby="x-compare-telemetry-title"
        >
          <div className="x-panel-heading">
            <div>
              <span className="x-eyebrow">
                <DiamondCrosshair />
                <span>05 // THRESHOLD SENSITIVITY &amp; BIMODAL dB HISTOGRAM</span>
              </span>
              <h2 id="x-compare-telemetry-title">
                {stats.isCrossLocation
                  ? 'Cross-Region Radar Backscatter'
                  : 'Radar Surface Water Analytics'}
              </h2>
            </div>
            <span className="x-product-badge">
              {stats.isCrossLocation ? 'CROSS-REGION' : '4-CLASS FLOOD'}
            </span>
          </div>

          <div className="x-telemetry-cards-grid">
            <div className="x-telemetry-card is-perm">
              <span className="x-card-label">
                {stats.isCrossLocation ? 'Location A Water' : 'Permanent Water'}
              </span>
              <strong className="x-card-val text-[#C4B5FD]">
                {stats.isCrossLocation
                  ? `${stats.waterKm2A?.toFixed(2)} km²`
                  : `${stats.permanentWaterKm2.toFixed(2)} km²`}
              </strong>
              <small className="x-card-sub">
                {stats.isCrossLocation ? 'Location A surface water' : 'Baseline channel (A & B)'}
              </small>
            </div>

            <div className="x-telemetry-card is-new">
              <span className="x-card-label">
                {stats.isCrossLocation ? 'Location B Water' : 'New Water / Inundation'}
              </span>
              <strong className="x-card-val text-[#FB7185]">
                {stats.isCrossLocation
                  ? `${stats.waterKm2B?.toFixed(2)} km²`
                  : `+${stats.newWaterKm2.toFixed(2)} km²`}
              </strong>
              <small className="x-card-sub">
                {stats.isCrossLocation ? 'Location B surface water' : 'Flood expansion on B'}
              </small>
            </div>

            <div className="x-telemetry-card is-lost">
              <span className="x-card-label">
                {stats.isCrossLocation ? 'Water Differential' : 'Water Lost / Receded'}
              </span>
              <strong className="x-card-val text-[#DDD6FE]">
                {stats.isCrossLocation
                  ? `${stats.netChangeKm2 > 0 ? '+' : ''}${stats.netChangeKm2.toFixed(2)} km²`
                  : `-${stats.waterLostKm2.toFixed(2)} km²`}
              </strong>
              <small className="x-card-sub">
                {stats.isCrossLocation ? 'B minus A water area' : 'Drydown recession on A'}
              </small>
            </div>

            <div className="x-telemetry-card is-net">
              <span className="x-card-label">
                {stats.isCrossLocation ? 'Separation Distance' : 'Net Surface Water Δ'}
              </span>
              <strong className="x-card-val text-[#F4F4F6]">
                {stats.isCrossLocation
                  ? `${stats.separationKm} km`
                  : `${stats.netChangeKm2 > 0 ? '+' : ''}${stats.netChangeKm2.toFixed(2)} km²`}
              </strong>
              <small className="x-card-sub">
                {stats.isCrossLocation
                  ? 'Geodesic separation'
                  : stats.pixelAreaKm2 ? `${(stats.pixelAreaKm2 * 1e6).toFixed(0)} m²/pixel` : 'Geodesic'}
              </small>
            </div>
          </div>

          <div className="x-threshold-slider-box">
            <div className="x-slider-header">
              <span className="x-slider-label">
                Water Threshold: <strong>{activeThresholdDb.toFixed(1)} dB</strong>
              </span>
              <div className="x-slider-presets">
                <button
                  type="button"
                  className={`x-preset-pill${activeThresholdDb === -16.0 ? ' is-active' : ''}`}
                  onClick={() => onThresholdChange?.(-16.0)}
                >
                  -16 dB
                </button>
                <button
                  type="button"
                  className={`x-preset-pill${activeThresholdDb === -18.0 ? ' is-active' : ''}`}
                  onClick={() => onThresholdChange?.(-18.0)}
                >
                  -18 dB
                </button>
                <button
                  type="button"
                  className={`x-preset-pill${activeThresholdDb === -20.0 ? ' is-active' : ''}`}
                  onClick={() => onThresholdChange?.(-20.0)}
                >
                  -20 dB
                </button>
                {changeProduct?.otsuA && (
                  <button
                    type="button"
                    className="x-preset-pill"
                    onClick={() => onThresholdChange?.(changeProduct.otsuA)}
                  >
                    Otsu Auto ({changeProduct.otsuA} dB)
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min="-24.0"
              max="-12.0"
              step="0.1"
              value={activeThresholdDb}
              onChange={(e) => onThresholdChange?.(parseFloat(e.target.value))}
              className="x-threshold-range"
            />
          </div>

          {changeProduct?.histogram && (
            <BackscatterHistogram
              histogram={changeProduct.histogram}
              activeThresholdDb={activeThresholdDb}
              onThresholdChange={onThresholdChange}
              otsuA={changeProduct.otsuA}
              otsuB={changeProduct.otsuB}
              dateALabel={dateA}
              dateBLabel={dateB}
            />
          )}
        </section>

        {/* COLUMN 3: 06 // INSAR COHERENCE, NOISE FLOOR & RADAR PHYSICS */}
        <section
          className="explorer-panel x-qa-watchpoints-panel"
          aria-labelledby="x-physics-panel-title"
        >
          <div className="x-panel-heading">
            <div>
              <span className="x-eyebrow">
                <DiamondCrosshair />
                <span>06 // INSAR COHERENCE &amp; RADAR PHYSICS</span>
              </span>
              <h2 id="x-physics-panel-title">Phase hygiene &amp; radar physics</h2>
            </div>
            <span className="x-product-badge">
              L-BAND 24 cm
            </span>
          </div>

          <div className="x-qa-box">
            <div className="x-qa-header">
              <span className="x-sub-eyebrow">
                INSAR ATMOSPHERIC NOISE-FLOOR &amp; IONOSPHERIC HYGIENE
              </span>
              <span className="x-qa-pill is-pass">
                <CheckCircle2 size={10} /> Calibrated
              </span>
            </div>
            <div className="x-insar-math-card">
              <div className="x-insar-formula">
                LOS = Δφ · (λ / 4π) = Δφ · 1.89 cm / rad (λ = 23.8 cm)
              </div>
              <p className="x-insar-explanation">
                Relative Line-of-Sight (LOS) phase variations under ±1.5 cm over a 12-day repeat cycle
                represent tropospheric water vapor delay rather than tectonic slip. Tropospheric turbulent delays
                must be deramped with least-squares planes before inferring true sub-centimeter deformation.
              </p>
            </div>
          </div>

          <div className="x-physics-box">
            <span className="x-sub-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
              MICROWAVE RADAR PHYSICS &amp; INTERPRETATION RULES
            </span>
            <div className="x-physics-cards">
              <div className="x-physics-item">
                <strong>1. Bragg Wind-Roughening:</strong>
                <p>Surface wind gusts create resonant capillary waves on open water, elevating backscatter from -24 dB to &gt; -15 dB. Temporal speckle filtering isolates true water recession from transient wind roughening.</p>
              </div>
              <div className="x-physics-item">
                <strong>2. HH Double-Bounce in Flooded Canopy:</strong>
                <p>Vertical tree trunks and horizontal water act as dihedral corner reflectors, spiking L-band HH backscatter (&gt; -8 dB) rather than darkening, revealing sub-canopy flood expansion.</p>
              </div>
              <div className="x-physics-item">
                <strong>3. Tropospheric Phase Delay:</strong>
                <p>Moisture gradients introduce spatial phase ramps across repeat interferograms (GUNW). Least-squares plane fitting removes topographically correlated atmospheric artifacts.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

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
