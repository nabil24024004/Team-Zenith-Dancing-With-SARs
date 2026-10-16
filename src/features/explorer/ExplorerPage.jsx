import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Database,
  Globe,
  Loader2,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import rawCatalog from '../../../resources/asf-results-2026-10-08_23-06-00.json';
import {
  ZenithEmblem,
  DotGridMark,
  DiamondCrosshair,
} from '../../components/ZenithElements.jsx';
import { filterCatalog, normalizeCatalog } from './catalog.js';
import CatalogFilters from './CatalogFilters.jsx';
import CatalogTimeline from './CatalogTimeline.jsx';
import GlobeViewer from './GlobeViewer.jsx';
import RecordDetails from './RecordDetails.jsx';
import { SME2_L3_DATASET } from './sme2Data.js';

const INITIAL_FILTERS = { productType: '', startDate: '', endDate: '' };

const SME2_SYNTHESIZED_RECORD = {
  granuleName: SME2_L3_DATASET.granuleId,
  granuleUr: SME2_L3_DATASET.granuleId,
  platform: 'NISAR',
  sensor: 'L-SAR',
  beamMode: 'SM · 200m EASE-Grid 2.0',
  processingLevel: 'SME2',
  processingType: 'L3 Soil Moisture (Parsed HDF5)',
  startTime: SME2_L3_DATASET.startTime,
  stopTime: SME2_L3_DATASET.stopTime,
  flightDirection: 'ASCENDING',
  polarization: 'HH+HV Dual-Pol',
  pathNumber: String(SME2_L3_DATASET.trackNumber),
  frameNumber: String(SME2_L3_DATASET.frameNumber),
  stringFootprint: SME2_L3_DATASET.wkt,
  browse: [],
  nisar: {
    doi: SME2_L3_DATASET.doi,
    additionalUrls: [],
  },
};

const LIVE_REGION_PRESETS = [
  {
    id: 'local',
    label: 'Local Snapshot + L3 SME2',
    coords: null,
    subtitle: 'Meghna-Brahmaputra + Svalbard HDF5 (154 granules)',
  },
  {
    id: 'bengal',
    label: 'Live ASF · Bengal Delta',
    coords: 'POINT(90.41 23.81)',
    subtitle: '23.81°N, 90.41°E · Live NASA Earthdata CMR',
  },
  {
    id: 'himalaya',
    label: 'Live ASF · Eastern Himalayas',
    coords: 'POINT(91.75 27.65)',
    subtitle: '27.65°N, 91.75°E · Alpine Relief & Glacial Basins',
  },
  {
    id: 'sundarbans',
    label: 'Live ASF · Sundarbans Coast',
    coords: 'POINT(89.18 21.95)',
    subtitle: '21.95°N, 89.18°E · Tidal Mangrove Inundation',
  },
  {
    id: 'svalbard',
    label: 'Live ASF · Svalbard Arctic',
    coords: 'POINT(13.94 77.52)',
    subtitle: '77.52°N, 13.94°E · Arctic Permafrost & L3 SME2',
  },
];

function coverageLabel(features) {
  const dates = features
    .map((feature) => feature.properties?.acquisitionDate)
    .filter(Boolean)
    .sort();
  if (!dates.length) return null;
  const first = new Date(`${dates[0]}T00:00:00Z`);
  const last = new Date(`${dates.at(-1)}T00:00:00Z`);
  const fullText = (d) =>
    new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  if (dates[0] === dates.at(-1)) return fullText(first);
  if (first.getUTCFullYear() === last.getUTCFullYear()) {
    const shortFirst = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(first);
    return `${shortFirst} – ${fullText(last)}`;
  }
  return `${fullText(first)} – ${fullText(last)}`;
}

export default function ExplorerPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [liveRecords, setLiveRecords] = useState(null);
  const [activePreset, setActivePreset] = useState('local');
  const [customLon, setCustomLon] = useState('90.41');
  const [customLat, setCustomLat] = useState('23.81');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveStatusMsg, setLiveStatusMsg] = useState(
    'Earthdata Bearer Token authenticated (UID: abrar43) · Ready for live ASF CMR search & cloud asset streaming.'
  );
  const [drapeRadarOnGlobe, setDrapeRadarOnGlobe] = useState(true);
  const [sme2FocusTrigger, setSme2FocusTrigger] = useState(0);

  const catalog = useMemo(() => {
    const baseRecords = Array.isArray(rawCatalog?.[0])
      ? rawCatalog[0]
      : Array.isArray(rawCatalog)
        ? rawCatalog
        : [];
    const sourceRecords = liveRecords ?? [
      SME2_SYNTHESIZED_RECORD,
      ...baseRecords,
    ];
    return normalizeCatalog(sourceRecords);
  }, [liveRecords]);

  const features = useMemo(
    () =>
      [...catalog.features].sort((a, b) => {
        const timeA = Date.parse(a.properties?.startTime ?? '') || 0;
        const timeB = Date.parse(b.properties?.startTime ?? '') || 0;
        return timeB - timeA || String(a.id).localeCompare(String(b.id));
      }),
    [catalog]
  );

  // Default to the newest GCOV or GUNW observation so real SAR browse imagery and QA CSV load immediately
  const defaultFeatureId = useMemo(() => {
    const withBrowse = features.find(
      (f) =>
        (f.properties?.processingLevel === 'GCOV' ||
          f.properties?.processingLevel === 'GUNW') &&
        Array.isArray(f.properties?.browse) &&
        f.properties.browse.length > 0
    );
    return withBrowse?.id ?? features[0]?.id ?? null;
  }, [features]);

  const [selectedId, setSelectedId] = useState(null);
  const effectiveSelectedId = selectedId ?? defaultFeatureId;

  const types = useMemo(
    () =>
      [
        ...new Set(
          features.map((feature) => feature.properties?.productType).filter(Boolean)
        ),
      ].sort(),
    [features]
  );

  const filtered = useMemo(
    () => filterCatalog(features, filters),
    [features, filters]
  );

  const selected =
    filtered.find(
      (feature) => (feature.id ?? feature.properties?.id) === effectiveSelectedId
    ) ??
    filtered[0] ??
    null;
  const activeId = selected?.id ?? null;
  const dateCoverage = coverageLabel(features);
  const generatedAt = rawCatalog?.[0]?.[0]?.processingDate;
  const snapshotDate = generatedAt
    ? new Intl.DateTimeFormat('en', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(generatedAt))
    : 'Oct 08, 2026';

  const runLiveAsfQuery = async (wktPoint, presetId, label) => {
    if (!wktPoint) {
      setLiveRecords(null);
      setActivePreset('local');
      setSelectedId(null);
      setLiveStatusMsg(
        'Restored local ASF snapshot (153 granules) + Svalbard L3 SME2 HDF5 dataset (561 pixels).'
      );
      return;
    }

    setLiveLoading(true);
    setActivePreset(presetId);
    setLiveStatusMsg(`Querying live NASA ASF CMR API for ${label} (${wktPoint})…`);

    try {
      const params = new URLSearchParams({
        platform: 'NISAR',
        intersectsWith: wktPoint,
        maxResults: '100',
      });
      const res = await fetch(`/api/asf-search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`ASF API HTTP ${res.status}`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data?.[0])
        ? data[0]
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
      const merged = [SME2_SYNTHESIZED_RECORD, ...rawList];
      setLiveRecords(merged);
      setFilters(INITIAL_FILTERS);
      setSelectedId(rawList[0]?.granuleName ?? SME2_SYNTHESIZED_RECORD.granuleName);
      setLiveStatusMsg(
        `Live NASA ASF Search complete · ${rawList.length} NISAR granules streamed via Earthdata Bearer Token (+1 L3 SME2 grid).`
      );
    } catch (err) {
      setLiveStatusMsg(
        `Live ASF search error (${err instanceof Error ? err.message : 'network error'}) · Showing local catalog fallback.`
      );
    } finally {
      setLiveLoading(false);
    }
  };

  const handleCustomSearch = (e) => {
    e.preventDefault();
    const lon = Number(customLon);
    const lat = Number(customLat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    runLiveAsfQuery(
      `POINT(${lon.toFixed(4)} ${lat.toFixed(4)})`,
      'custom',
      `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
    );
  };

  const handleFocusSme2 = () => {
    setFilters((prev) =>
      prev.productType && prev.productType !== 'SME2'
        ? INITIAL_FILTERS
        : prev
    );
    setSelectedId(SME2_L3_DATASET.granuleId);
    setSme2FocusTrigger((c) => c + 1);
  };

  const [watchpoints, setWatchpoints] = useState([]);
  const [pinning, setPinning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/watchpoints')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.watchpoints)) {
          setWatchpoints(data.watchpoints);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePinWatchpoint = async (featureToPin) => {
    if (!featureToPin || pinning) return;
    const p = featureToPin.properties ?? {};
    const granuleId = p.granuleName ?? p.granuleUr ?? featureToPin.id;
    const ring = featureToPin.geometry?.coordinates?.[0] ?? [];
    const pts = ring.slice(0, -1);
    const [lonSum, latSum] = pts.reduce(
      (acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat],
      [0, 0]
    );
    const lon = pts.length ? lonSum / pts.length : 90.41;
    const lat = pts.length ? latSum / pts.length : 23.81;

    setPinning(true);
    try {
      const res = await fetch('/api/watchpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${p.processingLevel ?? p.productType ?? 'SAR'} · Track ${p.pathNumber ?? '—'} Frame ${p.frameNumber ?? '—'} (${p.acquisitionDate ?? 'NISAR'})`,
          latitude: Number(lat.toFixed(4)),
          longitude: Number(lon.toFixed(4)),
          pinned_granule_id: granuleId,
          product_type: p.processingLevel ?? p.productType ?? 'SAR',
          status: 'PINNED IN SUPABASE',
          notes: `Pinned observation ${granuleId} (${p.flightDirection ?? 'Orbit'}, ${p.polarization ?? 'Dual-Pol'}).`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.watchpoints)) {
          setWatchpoints(data.watchpoints);
        }
        setLiveStatusMsg(
          `Saved observation ${granuleId.slice(0, 32)}… to Supabase Cloud (cxfwogzgtwslzviecrtx).`
        );
      }
    } finally {
      setPinning(false);
    }
  };

  const handleDeleteWatchpoint = async (id) => {
    try {
      const res = await fetch(`/api/watchpoints?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.watchpoints)) {
          setWatchpoints(data.watchpoints);
        }
      }
    } catch {
      // Ignore network errors
    }
  };

  const handleSelectWatchpoint = (wp) => {
    if (!wp) return;
    if (wp.pinned_granule_id === SME2_L3_DATASET.granuleId) {
      handleFocusSme2();
      return;
    }
    setFilters(INITIAL_FILTERS);
    if (wp.pinned_granule_id) {
      setSelectedId(wp.pinned_granule_id);
    }
  };

  const isSelectedPinned = useMemo(
    () =>
      Boolean(
        activeId &&
          watchpoints.some((w) => w.pinned_granule_id === activeId)
      ),
    [activeId, watchpoints]
  );

  return (
    <main className="x-explorer min-h-screen bg-[#040406] text-[#F4F4F6] relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* Subtle Ambient Background Texture & Atmospheric Glows (Matching Landing Page — Strictly Zero Cyan, Zero Gold) */}
      <div className="fixed inset-0 bg-dot-matrix opacity-40 pointer-events-none z-0" />
      <div
        className="fixed top-[-18%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full blur-[150px] pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(139,92,246,0.045) 55%, transparent 80%)',
        }}
      />

      <style>{`
        .x-explorer {
          --x-bg: #040406;
          --x-panel: rgba(12, 12, 18, 0.65);
          --x-panel-raised: rgba(20, 20, 28, 0.78);
          --x-border: rgba(255, 255, 255, 0.09);
          --x-border-hover: rgba(255, 255, 255, 0.22);
          --x-text: #F4F4F6;
          --x-muted: rgba(244, 244, 246, 0.74);
          --x-dim: rgba(244, 244, 246, 0.58);
          --x-accent: #F4F4F6;
          --x-crimson: #E11D48;
          --x-rose: #FB7185;
          --x-violet: #A78BFA;
          font-family: "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif;
          padding: 0 24px 48px;
        }
        .x-explorer * { box-sizing: border-box; }
        .x-shell { position: relative; z-index: 10; max-width: 1440px; margin: 0 auto; }

        /* Frosted Glass Floating Navbar (Matches App.jsx) */
        .x-topbar-wrap { padding-top: 16px; margin-bottom: 8px; }
        .x-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 22px;
          border-radius: 16px;
          background: rgba(4, 4, 6, 0.72);
          backdrop-filter: blur(28px) saturate(140%);
          -webkit-backdrop-filter: blur(28px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }
        .x-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; min-width: 0; }
        .x-brand-mark {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
        }
        .x-brand-name {
          font-family: "Space Grotesk", sans-serif;
          font-size: 13px;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          font-weight: 600;
          color: #FFFFFF;
        }
        .x-brand-sub {
          margin-top: 3px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--x-muted);
        }
        .x-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          border-radius: 9999px;
          padding: 9px 18px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.88);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 10px 28px -8px rgba(0, 0, 0, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .x-back:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%);
          border-color: rgba(255, 255, 255, 0.32);
          color: #FFFFFF;
          transform: translateY(-1px);
        }
        .x-back:focus-visible,
        .x-explorer button:focus-visible,
        .x-explorer select:focus-visible,
        .x-explorer input:focus-visible,
        .x-explorer a:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.85);
          outline-offset: 3px;
        }

        /* Editorial Hero Title Row */
        .x-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          padding: 24px 4px 18px;
        }
        .x-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.68);
        }
        .x-sub-eyebrow {
          display: block;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.65);
        }
        .x-title-row h1 {
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(26px, 3.2vw, 40px);
          letter-spacing: -0.03em;
          line-height: 1.12;
          margin: 10px 0 0;
          font-weight: 300;
          color: #FFFFFF;
        }
        .x-title-row h1 strong {
          font-weight: 600;
        }
        .x-title-bars {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .x-title-row p {
          margin: 10px 0 0;
          color: var(--x-muted);
          font-size: 13px;
          font-weight: 300;
          line-height: 1.6;
          max-width: 620px;
        }
        .x-live-tag {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          white-space: nowrap;
          padding: 8px 14px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.025) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.18);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.86);
        }
        .x-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E11D48;
          box-shadow: 0 0 12px rgba(225, 29, 72, 0.85);
        }

        /* Live NASA Earthdata CMR Command Bar */
        .x-earthdata-bar {
          margin-bottom: 12px;
          padding: 12px 16px;
          border-radius: 16px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.055) 0%, rgba(139, 92, 246, 0.04) 55%, rgba(225, 29, 72, 0.04) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 18px 40px -15px rgba(0, 0, 0, 0.75), inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .x-earthdata-presets {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
        }
        .x-preset-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(4, 4, 6, 0.6);
          color: rgba(255, 255, 255, 0.82);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .x-preset-btn:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.28);
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.08);
        }
        .x-preset-btn.is-active {
          border-color: rgba(251, 113, 133, 0.48);
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(139, 92, 246, 0.14) 100%);
          color: #FFFFFF;
        }
        .x-preset-btn.is-sme2 {
          border-color: rgba(167, 139, 250, 0.42);
          background: rgba(139, 92, 246, 0.14);
          color: #DDD6FE;
        }
        .x-preset-btn.is-sme2:hover {
          background: rgba(139, 92, 246, 0.24);
          color: #FFFFFF;
        }
        .x-custom-coord-form {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .x-coord-input {
          width: 82px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(4, 4, 6, 0.72);
          color: #FFFFFF;
          padding: 0 10px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
        }
        .x-earthdata-status {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.06em;
          color: rgba(244, 244, 246, 0.78);
        }

        /* Compact, High-Contrast Frosted Telemetry Metric Strip */
        .x-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 0 0 14px;
        }
        .x-metrics > div {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
          min-height: 44px;
          padding: 9px 15px;
          border-radius: 12px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.025) 55%, rgba(255, 255, 255, 0.04) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.13);
          box-shadow: 0 12px 28px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 0 rgba(255, 255, 255, 0.16);
        }
        .x-metrics span {
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: rgba(244, 244, 246, 0.84);
          white-space: nowrap;
        }
        .x-metrics strong {
          font-family: "Space Grotesk", sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #FFFFFF;
          text-align: right;
          white-space: nowrap;
        }

        /* 2-Row × 3-Column Widescreen Bento Command Center */
        .x-workspace {
          display: grid;
          gap: 18px;
        }
        .x-primary-stage {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
        }
        .x-globe-column {
          grid-column: span 2;
          display: grid;
          grid-template-rows: 580px auto;
          gap: 10px;
          min-width: 0;
        }
        .x-navigator-column {
          grid-column: span 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
          height: 626px;
        }
        .x-globe-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(244, 244, 246, 0.82);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }
        .x-globe-legend span { display: inline-flex; align-items: center; gap: 7px; }
        .x-globe-legend i {
          width: 12px;
          height: 8px;
          border-radius: 2px;
          border: 1px solid #C4B5FD;
          background: rgba(167, 139, 250, 0.28);
          display: inline-block;
        }
        .x-globe-legend .x-swatch-desc {
          border: 1px solid #FDA4AF;
          background: rgba(251, 113, 133, 0.24);
        }
        .x-globe-legend .x-swatch-selected {
          border: 1.5px solid #FFFFFF;
          background: rgba(225, 29, 72, 0.45);
        }

        /* Signature Zenith Frosted Glass Panels */
        .explorer-panel {
          position: relative;
          min-width: 0;
          border-radius: 20px;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.018) 55%,
            rgba(255, 255, 255, 0.035) 100%
          );
          backdrop-filter: blur(28px) saturate(140%);
          -webkit-backdrop-filter: blur(28px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow:
            0 24px 60px -15px rgba(0, 0, 0, 0.85),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.16),
            inset 0 -1px 0 0 rgba(255, 255, 255, 0.04);
          padding: 18px 20px;
          transition: border-color 0.3s ease;
        }
        .explorer-panel:hover {
          border-color: rgba(255, 255, 255, 0.16);
        }
        .explorer-panel::before {
          content: "";
          pointer-events: none;
          position: absolute;
          left: 32px;
          right: 32px;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
        }
        .x-panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .x-panel-heading h2 {
          font-family: "Space Grotesk", sans-serif;
          font-size: 16px;
          letter-spacing: -0.02em;
          font-weight: 500;
          color: #FFFFFF;
          margin: 5px 0 0;
        }

        /* Compact Filter Controls in Right Navigator Column */
        .x-filter-panel { flex-shrink: 0; padding: 16px 18px; }
        .x-filter-fields { display: grid; gap: 10px; margin: 12px 0 12px; }
        .x-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .x-field > span {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.78);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .x-field select,
        .x-field input {
          width: 100%;
          min-width: 0;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          background: rgba(4, 4, 6, 0.65);
          color: #F4F4F6;
          padding: 0 10px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10.5px;
          color-scheme: dark;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .x-field select:hover,
        .x-field input:hover {
          border-color: rgba(255, 255, 255, 0.25);
          background: rgba(8, 8, 12, 0.85);
        }
        .x-field select { appearance: auto; }
        .x-date-field { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .x-reset {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.72);
          padding: 5px 10px;
          border-radius: 999px;
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .x-reset:hover:not(:disabled) {
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.1);
        }
        .x-reset:disabled { opacity: 0.35; cursor: not-allowed; }
        .x-filter-summary {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 10px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 6px 12px;
        }
        .x-filter-summary p {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          color: var(--x-muted);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.06em;
        }
        .x-filter-summary strong { color: #FFFFFF; font-weight: 600; }
        .x-filter-summary p:first-child strong { color: #FB7185; }

        /* Timeline Panel (Fills Remaining Height of Right Column Flush with Globe) */
        .x-timeline {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .x-count-pill {
          padding: 5px 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: #FFFFFF;
        }
        .x-helper-text {
          color: var(--x-muted);
          font-size: 11px;
          font-weight: 300;
          line-height: 1.55;
          margin: 10px 0 6px;
        }
        .x-observation-list {
          list-style: none;
          overflow: auto;
          margin: 6px -8px 0;
          padding: 0 8px;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
          scrollbar-width: thin;
        }
        .x-observation-list li { min-width: 0; }
        .x-observation {
          position: relative;
          display: grid;
          grid-template-columns: 20px 1fr;
          text-align: left;
          width: 100%;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          padding: 10px 10px;
          color: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .x-observation:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .x-observation.is-selected {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.14) 0%, rgba(139, 92, 246, 0.08) 100%);
          border-color: rgba(251, 113, 133, 0.38);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }
        .x-observation-rail { position: relative; display: flex; justify-content: center; }
        .x-observation-rail:after {
          position: absolute;
          content: "";
          top: 15px;
          bottom: -19px;
          width: 1px;
          background: rgba(255, 255, 255, 0.1);
        }
        .x-observation-list li:last-child .x-observation-rail:after { display: none; }
        .x-timeline-dot {
          position: relative;
          z-index: 1;
          margin-top: 4px;
          width: 7px;
          height: 7px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          background: #08080C;
          transition: all 0.2s ease;
        }
        .is-selected .x-timeline-dot {
          border-color: #FFE4E6;
          background: #E11D48;
          box-shadow: 0 0 10px rgba(225, 29, 72, 0.8);
        }
        .x-observation-copy { display: grid; gap: 4px; min-width: 0; }
        .x-observation-date {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 500;
        }
        .x-observation-date span {
          color: var(--x-dim);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
        }
        .x-observation-copy > strong {
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #C4B5FD;
        }
        .is-selected .x-observation-copy > strong {
          color: #FDA4AF;
        }
        .x-granule-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--x-muted);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
        }
        .x-list-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: 8px;
          color: var(--x-dim);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .x-empty {
          display: grid;
          place-content: center;
          text-align: center;
          min-height: 150px;
          gap: 8px;
          padding: 22px;
          color: var(--x-muted);
          font-size: 12px;
          font-weight: 300;
          line-height: 1.6;
        }
        .x-empty span:first-child {
          font-family: "Space Grotesk", sans-serif;
          font-size: 14px;
          color: #FFFFFF;
          font-weight: 500;
        }

        /* Row 2: 3-Column Inspection Deck (04 Selected Record | 05 SAR Imagery | 06 QA & Supabase) */
        .x-inspection-deck {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
          min-width: 0;
        }
        .x-details {
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        .x-details-empty { display: grid; place-items: center; min-height: 250px; }
        .x-product-badge {
          max-width: 145px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(167, 139, 250, 0.32);
          color: #DDD6FE;
          border-radius: 999px;
          padding: 5px 10px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .x-record-id {
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.78);
          overflow-wrap: anywhere;
          margin: 12px 0 10px;
          padding: 9px 11px;
          border-radius: 10px;
          background: rgba(4, 4, 6, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .x-metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; margin: 0; }
        .x-metadata > div {
          min-width: 0;
          padding: 8px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }
        .x-metadata dt {
          color: rgba(244, 244, 246, 0.72);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .x-metadata dd {
          margin: 0;
          color: #FFFFFF;
          font-size: 11px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .x-record-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
        .x-link-button,
        .x-icon-button,
        .x-disabled-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 34px;
          border-radius: 999px;
          padding: 0 13px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .x-link-button {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 60%, rgba(225, 29, 72, 0.18) 100%);
          border: 1px solid rgba(255, 255, 255, 0.26);
          color: #FFFFFF;
          text-decoration: none;
          font-weight: 500;
          box-shadow: 0 10px 28px -8px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .x-link-button:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(225, 29, 72, 0.25) 100%);
          border-color: rgba(255, 255, 255, 0.42);
        }
        .x-icon-button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.85);
        }
        .x-icon-button:hover {
          background: rgba(255, 255, 255, 0.11);
          border-color: rgba(255, 255, 255, 0.28);
          color: #FFFFFF;
        }
        .x-disabled-link {
          color: var(--x-dim);
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* Companion Cloud Assets & QA Telemetry Matrix */
        .x-cloud-assets {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: grid;
          gap: 8px;
        }
        .x-asset-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .x-asset-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.82);
          text-decoration: none;
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.2s ease;
        }
        .x-asset-chip:hover {
          border-color: rgba(167, 139, 250, 0.45);
          background: rgba(139, 92, 246, 0.14);
          color: #FFFFFF;
        }

        /* Panel 06: Telemetry & Supabase Cloud Watchpoints */
        .x-telemetry-panel {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .x-qa-box {
          padding: 12px;
          border-radius: 12px;
          background: rgba(4, 4, 6, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: grid;
          gap: 9px;
        }
        .x-qa-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .x-qa-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 999px;
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.75);
        }
        .x-qa-pill.is-pass {
          background: rgba(139, 92, 246, 0.16);
          border: 1px solid rgba(167, 139, 250, 0.35);
          color: #DDD6FE;
        }
        .x-qa-list {
          display: grid;
          gap: 6px;
          max-height: 155px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
          scrollbar-width: thin;
        }
        .x-qa-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 6px 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .x-qa-row strong {
          display: block;
          font-size: 10.5px;
          font-weight: 500;
          color: #FFFFFF;
        }
        .x-qa-row span {
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          color: var(--x-muted);
        }
        .x-qa-badge {
          padding: 3px 7px;
          border-radius: 999px;
          font-family: "JetBrains Mono", monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .x-qa-badge.is-pass {
          background: rgba(139, 92, 246, 0.18);
          border: 1px solid rgba(167, 139, 250, 0.4);
          color: #DDD6FE;
        }
        .x-qa-badge.is-warn {
          background: rgba(225, 29, 72, 0.2);
          border: 1px solid rgba(251, 113, 133, 0.45);
          color: #FFE4E6;
        }

        /* Panel 05: Real NISAR SAR Browse Imagery Card */
        .x-browse-panel {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .x-drape-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.78);
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .x-drape-btn.is-active {
          border-color: rgba(251, 113, 133, 0.48);
          background: rgba(225, 29, 72, 0.18);
          color: #FFE4E6;
        }
        .x-browse-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .x-browse-tab {
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(4, 4, 6, 0.6);
          color: rgba(255, 255, 255, 0.68);
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .x-browse-tab.is-active {
          border-color: rgba(167, 139, 250, 0.45);
          background: rgba(139, 92, 246, 0.18);
          color: #FFFFFF;
        }
        .x-browse-stage {
          position: relative;
          flex: 1;
          min-height: 220px;
          max-height: 290px;
          border-radius: 14px;
          overflow: hidden;
          background: radial-gradient(circle at center, rgba(139, 92, 246, 0.12), #040406 75%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .x-browse-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          text-align: center;
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          color: var(--x-muted);
        }
        .x-browse-img {
          width: 100%;
          max-height: 280px;
          object-fit: contain;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .x-browse-img.is-loaded {
          opacity: 1;
        }
        .x-browse-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--x-dim);
        }
        .x-browse-open {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #DDD6FE;
          text-decoration: none;
        }
        .x-browse-open:hover {
          color: #FFFFFF;
        }

        /* L3 SME2 Soil Moisture Stats Card */
        .x-sme2-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 10px;
        }
        .x-sme2-stats > div {
          padding: 10px;
          border-radius: 12px;
          background: rgba(4, 4, 6, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: grid;
          gap: 3px;
        }
        .x-sme2-stats span {
          font-family: "JetBrains Mono", monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--x-dim);
        }
        .x-sme2-stats strong {
          font-family: "Space Grotesk", sans-serif;
          font-size: 16px;
          color: #FFFFFF;
        }
        .x-sme2-stats small {
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          color: var(--x-muted);
        }

        .x-inspection-deck .synthetic-preview { max-width: none; border-radius: 20px; height: 100%; }
        .x-inspection-deck .sp-content { grid-template-columns: 1fr; padding: 14px; }
        .x-inspection-deck .sp-aside { display: none; }
        .x-inspection-deck .sp-visual svg { min-height: 150px; }
        .x-inspection-deck .sp-topline { padding: 14px 18px; }
        .x-inspection-deck .sp-heading { font-size: 14px; }
        .x-inspection-deck .sp-tag { font-size: 8px; padding: 5px 8px; }
        .x-inspection-deck .sp-disclaimer { padding: 11px 16px; font-size: 10px; }

        /* Watchpoints Sub-section inside Panel 06 */
        .x-watchpoints-sub {
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: grid;
          gap: 8px;
        }
        .x-wp-list {
          display: grid;
          gap: 7px;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
          scrollbar-width: thin;
        }
        .x-wp-card {
          position: relative;
          display: grid;
          gap: 4px;
          padding: 9px 11px;
          border-radius: 12px;
          background: rgba(4, 4, 6, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .x-wp-card:hover {
          border-color: rgba(167, 139, 250, 0.35);
          background: rgba(255, 255, 255, 0.045);
        }
        .x-wp-card.is-active {
          border-color: rgba(251, 113, 133, 0.48);
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.14) 0%, rgba(139, 92, 246, 0.08) 100%);
        }
        .x-wp-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .x-wp-title {
          font-size: 11px;
          font-weight: 500;
          color: #FFFFFF;
          line-height: 1.35;
        }
        .x-wp-meta {
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #C4B5FD;
        }
        .x-wp-notes {
          font-size: 10px;
          line-height: 1.45;
          color: var(--x-muted);
          margin: 2px 0 0;
        }
        .x-wp-del {
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          padding: 2px;
          cursor: pointer;
        }
        .x-wp-del:hover {
          color: #FB7185;
        }

        /* Compact Bottom Telemetry Footer Bar */
        .x-footer-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
        }
        .x-source-note {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--x-muted);
          font-size: 11px;
          line-height: 1.5;
        }
        .x-source-note strong { color: #FFFFFF; font-weight: 500; }
        .x-parse-warning { color: #FDA4AF; }
        .x-footnote {
          margin: 0;
          color: var(--x-dim);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          line-height: 1.5;
        }

        @media (max-width: 1180px) {
          .x-primary-stage { grid-template-columns: 1fr; }
          .x-globe-column { grid-column: 1 / -1; grid-template-rows: 500px auto; }
          .x-navigator-column { grid-column: 1 / -1; height: auto; }
          .x-timeline { max-height: 400px; }
          .x-inspection-deck { grid-template-columns: 1fr 1fr; }
          .x-telemetry-panel { grid-column: 1 / -1; }
        }
        @media (max-width: 760px) {
          .x-explorer { padding: 0 14px 28px; }
          .x-topbar { padding: 10px 14px; }
          .x-brand-name { font-size: 11px; }
          .x-title-row { padding: 20px 0 14px; align-items: flex-start; flex-direction: column; }
          .x-live-tag { font-size: 8px; }
          .x-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .x-metrics > div { padding: 12px; }
          .x-globe-column { grid-template-rows: 380px auto; }
          .x-globe-card { min-height: 360px !important; }
          .x-inspection-deck { grid-template-columns: 1fr; }
          .x-metadata { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 380px) {
          .x-explorer { padding-inline: 10px; }
          .x-date-field { grid-template-columns: 1fr; }
          .x-metadata { grid-template-columns: 1fr; }
          .x-live-tag { white-space: normal; }
        }
        @media (prefers-reduced-motion: reduce) {
          .x-explorer * { scroll-behavior: auto !important; transition: none !important; }
        }
      `}</style>

      <div className="x-shell">
        {/* Top Floating Frosted Glass Navbar (Matches Landing Page Header) */}
        <div className="x-topbar-wrap">
          <header className="x-topbar">
            <a className="x-brand" href="/">
              <span className="x-brand-mark">
                <img
                  src="/zenith-logo.png"
                  alt="Team Zenith Logo"
                  className="w-6 h-6 object-contain mix-blend-screen"
                />
              </span>
              <div>
                <div className="x-brand-name">TEAM ZENITH</div>
                <div className="x-brand-sub">
                  NASA SPACE APPS 2026 · FIELD CONSOLE
                </div>
              </div>
            </a>

            <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
              <ZenithEmblem className="w-5 h-4" />
              <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-white/65">
                05 // NISAR ORBITAL CATALOG · SUPABASE + EARTHDATA CLOUD
              </span>
            </div>

            <a className="x-back" href="/">
              <ArrowLeft size={13} aria-hidden="true" />
              <span>Back to Mission</span>
            </a>
          </header>
        </div>

        {/* Section Title Row with Zenith Architectural Signature */}
        <div className="x-title-row">
          <div>
            <div className="x-eyebrow">
              <DiamondCrosshair />
              <span>05 // MISSION DATA EXPLORER · NASA-ISRO SAR</span>
            </div>
            <h1>
              Surface signals, <strong>in context.</strong>
            </h1>
            <div className="x-title-bars" aria-hidden="true">
              <span className="w-2.5 h-[1.5px] bg-white/80 block" />
              <span className="w-7 h-[1.5px] bg-white/80 block" />
            </div>
            <p>
              Explore authenticated NISAR acquisitions, stream real L-band SAR
              browse imagery &amp; QA telemetry via Supabase CDN + NASA Earthdata
              Cloud, or inspect the 561-pixel L3 Soil Moisture grid on 3D terrain.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="x-live-tag"
              aria-label={`Supabase Cloud and NASA Earthdata Login authenticated, snapshot ${snapshotDate}`}
            >
              <span className="x-live-dot animate-pulse" aria-hidden="true" />
              <span>
                SUPABASE + EARTHDATA ACTIVE · UID ABRAR43
              </span>
            </div>
            <DotGridMark className="hidden sm:grid shrink-0" />
          </div>
        </div>

        {/* Live NASA Earthdata CMR Search & Svalbard L3 Soil Moisture Command Bar */}
        <section
          className="x-earthdata-bar"
          aria-label="Live NASA Earthdata and ASF CMR query controls"
        >
          <div className="x-earthdata-presets">
            {LIVE_REGION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={liveLoading}
                className={`x-preset-btn${
                  activePreset === preset.id ? ' is-active' : ''
                }`}
                onClick={() =>
                  runLiveAsfQuery(preset.coords, preset.id, preset.label)
                }
                title={preset.subtitle}
              >
                {liveLoading && activePreset === preset.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Radar size={11} aria-hidden="true" />
                )}
                <span>{preset.label}</span>
              </button>
            ))}

            <button
              type="button"
              className="x-preset-btn is-sme2"
              onClick={handleFocusSme2}
              title="Select and fly to the 561-pixel L3 Soil Moisture (SME2) EASE-Grid 2.0 over Svalbard"
            >
              <Sparkles size={11} aria-hidden="true" />
              <span>561-Pixel L3 Soil Moisture Grid</span>
            </button>
          </div>

          <form className="x-custom-coord-form" onSubmit={handleCustomSearch}>
            <input
              type="text"
              className="x-coord-input"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              placeholder="Lat (°N)"
              aria-label="Custom latitude"
            />
            <input
              type="text"
              className="x-coord-input"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              placeholder="Lon (°E)"
              aria-label="Custom longitude"
            />
            <button
              type="submit"
              disabled={liveLoading}
              className="x-preset-btn"
              title="Query live NASA ASF CMR catalog at custom coordinates"
            >
              <Globe size={11} aria-hidden="true" />
              <span>Query ASF</span>
            </button>
          </form>

          <div className="x-earthdata-status" role="status" aria-live="polite">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={12} className="text-[#A78BFA] shrink-0" />
              <span>{liveStatusMsg}</span>
            </span>
            {liveRecords && (
              <button
                type="button"
                className="x-preset-btn"
                onClick={() => runLiveAsfQuery(null, 'local', 'Local Snapshot')}
              >
                <RefreshCw size={10} />
                <span>Restore Local Catalog</span>
              </button>
            )}
          </div>
        </section>

        {/* Telemetry Summary Strip */}
        <div className="x-metrics" aria-label="Catalog summary">
          <div>
            <span>Catalog records</span>
            <strong>{features.length}</strong>
          </div>
          <div>
            <span>Visible results</span>
            <strong>{filtered.length}</strong>
          </div>
          <div>
            <span>Product types</span>
            <strong>{types.length}</strong>
          </div>
          <div>
            <span>Acquisition span</span>
            <strong>{dateCoverage || '—'}</strong>
          </div>
        </div>

        {/* Organized 2-Tier Command Center Workspace */}
        <div className="x-workspace">
          {/* Row 1: Primary Stage — 2-Column Widescreen 3D Globe (Left) + 1-Column Filter & Timeline Navigator (Right) */}
          <div className="x-primary-stage">
            <div className="x-globe-column">
              <GlobeViewer
                features={filtered}
                selectedId={activeId}
                onSelect={setSelectedId}
                drapeRadarOnGlobe={drapeRadarOnGlobe}
                sme2FocusTrigger={sme2FocusTrigger}
              />
              <div className="x-globe-legend" aria-label="Globe legend">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    <i aria-hidden="true" /> Ascending Track
                  </span>
                  <span>
                    <i className="x-swatch-desc" aria-hidden="true" /> Descending
                    Track
                  </span>
                  <span>
                    <i className="x-swatch-selected" aria-hidden="true" />{' '}
                    Selected + Draped SAR
                  </span>
                </div>
                <span className="text-white/45">
                  Click any SAR frame or Svalbard L3 grid · Drag to orbit · Scroll to zoom
                </span>
              </div>
            </div>

            <div className="x-navigator-column">
              <CatalogFilters
                productTypes={types}
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(INITIAL_FILTERS)}
                resultCount={filtered.length}
                totalCount={features.length}
                coverage={coverageLabel(features)}
              />
              <CatalogTimeline
                features={filtered}
                selectedId={activeId}
                onSelect={setSelectedId}
              />
            </div>
          </div>

          {/* Row 2: 3-Column Inspection Deck — 04 Selected Record | 05 Authenticated SAR Imagery | 06 QA & Supabase Cloud */}
          <RecordDetails
            feature={selected}
            drapeRadarOnGlobe={drapeRadarOnGlobe}
            onToggleDrapeRadar={() => setDrapeRadarOnGlobe((prev) => !prev)}
            onFlyToSme2={handleFocusSme2}
            onPinWatchpoint={handlePinWatchpoint}
            isPinned={isSelectedPinned}
            pinning={pinning}
            watchpoints={watchpoints}
            onSelectWatchpoint={handleSelectWatchpoint}
            onDeleteWatchpoint={handleDeleteWatchpoint}
            activeId={activeId}
          />

          {/* Row 3: Compact Telemetry Source Footer */}
          <footer className="x-footer-bar">
            <div className="x-source-note">
              <Database
                size={14}
                className="text-[#A78BFA] shrink-0"
                aria-hidden="true"
              />
              <span>
                <strong>{features.length} valid footprints</strong> loaded (
                {liveRecords ? 'Live NASA ASF CMR API' : '153 ASF + 1 L3 SME2'}
                )
                {catalog.errors.length > 0 && (
                  <span className="x-parse-warning">
                    {' '}
                    · {catalog.errors.length} record
                    {catalog.errors.length === 1 ? '' : 's'} skipped due to
                    invalid geometry
                  </span>
                )}
              </span>
            </div>
            <p className="x-footnote">
              Supabase Storage CDN (`nisar-browse-cache`) + Earthdata Cloud
              active · Real SAR browse rasters, QA CSV checks, and L3 SME2 grid.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
