import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Compass,
  Globe,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import rawCatalog from '../../../resources/asf-results-2026-10-08_23-06-00.json';
import {
  ZenithEmblem,
  DotGridMark,
  DiamondCrosshair,
} from '../../components/ZenithElements.jsx';
import { filterCatalog, normalizeCatalog, getPartnerGranules } from './catalog.js';
import CatalogFilters from './CatalogFilters.jsx';
import CatalogTimeline from './CatalogTimeline.jsx';
import GlobeViewer from './GlobeViewer.jsx';
import ComparePairBar from './ComparePairBar.jsx';
import RecordDetails from './RecordDetails.jsx';
import { SME2_L3_DATASET } from './sme2Data.js';
import { computeSarChangeProduct } from './sarChangeEngine.js';

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
    id: 'bengal',
    label: 'Bengal Delta',
    tag: '23.81°N · 90.41°E',
    subtitle: 'Monsoon Inundation',
    coords: 'POINT(90.41 23.81)',
  },
  {
    id: 'himalaya',
    label: 'Eastern Himalayas',
    tag: '27.65°N · 91.75°E',
    subtitle: 'Glacial Elevation',
    coords: 'POINT(91.75 27.65)',
  },
  {
    id: 'sundarbans',
    label: 'Sundarbans Coast',
    tag: '21.95°N · 89.18°E',
    subtitle: 'Tidal Mangroves',
    coords: 'POINT(89.18 21.95)',
  },
  {
    id: 'svalbard',
    label: 'Svalbard Arctic',
    tag: '77.52°N · 13.94°E',
    subtitle: 'Permafrost & Cryosphere',
    coords: 'POINT(13.94 77.52)',
  },
  {
    id: 'local',
    label: 'Meghna Baseline',
    tag: 'Calibrated Archive',
    subtitle: '154 Local Swaths',
    coords: null,
  },
];

function coverageLabel(features) {
  const dates = features
    .map((feature) => feature.properties?.acquisitionDate)
    .filter(Boolean)
    .sort();
  if (!dates.length) return null;
  const first = dates[0];
  const last = dates.at(-1);
  return first === last ? first : `${first} – ${last}`;
}

export default function ExplorerPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [liveRecords, setLiveRecords] = useState(null);
  const [activePreset, setActivePreset] = useState('local');
  const [customLon, setCustomLon] = useState('90.41');
  const [customLat, setCustomLat] = useState('23.81');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveStatusMsg, setLiveStatusMsg] = useState(
    'Earthdata Bearer Token authenticated · Ready for live ASF CMR search & cloud asset streaming.'
  );
  const [drapeRadarOnGlobe, setDrapeRadarOnGlobe] = useState(true);
  const [sme2FocusTrigger, setSme2FocusTrigger] = useState(0);

  // Multi-temporal SAR change detection & split-curtain comparison state
  const [comparePair, setComparePair] = useState(null);
  const [changeProduct, setChangeProduct] = useState(null);
  const [changeLoading, setChangeLoading] = useState(false);
  const [activeThresholdDb, setActiveThresholdDb] = useState(-18.0);
  const [compareLayerMode, setCompareLayerMode] = useState('floodMask');
  const [compareOpacity, setCompareOpacity] = useState(0.9);
  const [splitRatio, setSplitRatio] = useState(0.5);

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

  // Find repeat-pass partner for the currently selected record (if not already comparing)
  const activePartner = useMemo(() => {
    if (!selected || comparePair) return null;
    const partners = getPartnerGranules(selected, features);
    return partners[0] ?? null;
  }, [selected, features, comparePair]);

  // Handlers for manual or auto multi-temporal pairing
  const handleSelectAsDateA = (feature) => {
    if (!feature) return;
    if (comparePair?.granuleB) {
      const bId = comparePair.granuleB.id ?? comparePair.granuleB.properties?.id;
      const aId = feature.id ?? feature.properties?.id;
      if (bId !== aId) {
        setComparePair({ granuleA: feature, granuleB: comparePair.granuleB });
        return;
      }
    }
    const partners = getPartnerGranules(feature, features);
    setComparePair({ granuleA: feature, granuleB: partners[0] ?? null });
  };

  const handleSelectAsDateB = (feature) => {
    if (!feature) return;
    const bId = feature.id ?? feature.properties?.id;
    if (comparePair?.granuleA) {
      const aId = comparePair.granuleA.id ?? comparePair.granuleA.properties?.id;
      if (aId !== bId) {
        setComparePair({ granuleA: comparePair.granuleA, granuleB: feature });
        return;
      }
    } else if (selected) {
      const selId = selected.id ?? selected.properties?.id;
      if (selId !== bId) {
        setComparePair({ granuleA: selected, granuleB: feature });
        return;
      }
    }
    const partners = getPartnerGranules(feature, features);
    setComparePair({ granuleA: partners[0] ?? null, granuleB: feature });
  };

  const handleStartAutoCompare = (feature, partner) => {
    const fA = feature ?? selected;
    const fB = partner ?? (fA ? getPartnerGranules(fA, features)[0] : null) ?? activePartner;
    if (!fA || !fB) return;

    // Order chronologically: older date as Date A, newer as Date B
    const timeA = Date.parse(fA.properties?.startTime ?? '') || 0;
    const timeB = Date.parse(fB.properties?.startTime ?? '') || 0;
    if (timeA <= timeB) {
      setComparePair({ granuleA: fA, granuleB: fB });
    } else {
      setComparePair({ granuleA: fB, granuleB: fA });
    }
  };

  const handleSwapCompare = () => {
    setComparePair((prev) => {
      if (!prev?.granuleA || !prev?.granuleB) return prev;
      return { granuleA: prev.granuleB, granuleB: prev.granuleA };
    });
  };

  const handleExitCompare = () => {
    setComparePair(null);
    setChangeProduct(null);
  };

  const handleThresholdChange = (newThreshold) => {
    setActiveThresholdDb(newThreshold);
    if (changeProduct?.recomputeAtThreshold) {
      const recomputed = changeProduct.recomputeAtThreshold(newThreshold);
      setChangeProduct((prev) =>
        prev
          ? {
              ...prev,
              waterClassDataUrl: recomputed.waterClassDataUrl,
              stats: recomputed.stats,
              thresholdDb: newThreshold,
            }
          : null
      );
    }
  };

  // Run real-time browser SAR change computation whenever comparePair updates
  useEffect(() => {
    if (!comparePair?.granuleA || !comparePair?.granuleB) {
      setChangeProduct(null);
      return;
    }

    let isCancelled = false;
    setChangeLoading(true);

    const gA = comparePair.granuleA;
    const gB = comparePair.granuleB;
    const pA = gA.properties ?? gA;
    const pB = gB.properties ?? gB;

    const browseListA = Array.isArray(pA.browse) ? pA.browse : [];
    const browseListB = Array.isArray(pB.browse) ? pB.browse : [];
    const rawUrlA =
      browseListA.find((u) => typeof u === 'string' && u.includes('_LATLON')) ??
      browseListA[0] ??
      null;
    const rawUrlB =
      browseListB.find((u) => typeof u === 'string' && u.includes('_LATLON')) ??
      browseListB[0] ??
      null;

    const proxiedUrlA = rawUrlA
      ? `/api/earthdata-asset?url=${encodeURIComponent(rawUrlA)}`
      : null;
    const proxiedUrlB = rawUrlB
      ? `/api/earthdata-asset?url=${encodeURIComponent(rawUrlB)}`
      : null;

    computeSarChangeProduct({
      granuleA: gA,
      granuleB: gB,
      imageUrlA: proxiedUrlA,
      imageUrlB: proxiedUrlB,
      thresholdDb: activeThresholdDb,
    })
      .then((res) => {
        if (!isCancelled) {
          setChangeProduct(res);
          setChangeLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to compute SAR change product:', err);
        if (!isCancelled) setChangeLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    comparePair?.granuleA?.id ?? comparePair?.granuleA?.properties?.id,
    comparePair?.granuleB?.id ?? comparePair?.granuleB?.properties?.id,
  ]);

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
    setActivePreset('sme2');
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
          status: 'SAVED TO DATABASE',
          notes: `Pinned observation ${granuleId} (${p.flightDirection ?? 'Orbit'}, ${p.polarization ?? 'Dual-Pol'}).`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.watchpoints)) {
          setWatchpoints(data.watchpoints);
        }
        setLiveStatusMsg(
          `Saved observation ${granuleId.slice(0, 32)}… to the database.`
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

  const isSme2Active = useMemo(
    () => activePreset === 'sme2',
    [activePreset]
  );

  const activeRegionLabel = useMemo(() => {
    if (activePreset === 'sme2') return 'Svalbard L3 Soil Moisture';
    if (activePreset === 'custom') return `Custom (${customLat}°N, ${customLon}°E)`;
    const preset = LIVE_REGION_PRESETS.find((p) => p.id === activePreset);
    return preset?.label ?? 'Meghna Baseline';
  }, [activePreset, customLat, customLon]);

  return (
    <main className="x-explorer min-h-screen bg-[#040406] text-[#F4F4F6] relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* Ambient Background & Grid Matrix */}
      <div className="fixed inset-0 bg-dot-matrix opacity-40 pointer-events-none z-0" />
      <div
        className="fixed top-[-18%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full blur-[150px] pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(225,29,72,0.035) 55%, transparent 80%)',
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
          --x-muted: rgba(244, 244, 246, 0.72);
          --x-dim: rgba(244, 244, 246, 0.52);
          --x-accent: #F4F4F6;
          --x-crimson: #E11D48;
          --x-rose: #FB7185;
          --x-crimson-dim: rgba(225, 29, 72, 0.2);
          font-family: "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif;
          padding: 0 24px 48px;
        }
        .x-explorer * { box-sizing: border-box; }
        .x-shell { position: relative; z-index: 10; max-width: 1440px; margin: 0 auto; }

        /* Frosted Glass Top Navigation Bar */
        .x-topbar-wrap { padding-top: 16px; margin-bottom: 6px; }
        .x-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 20px;
          border-radius: 16px;
          background: rgba(4, 4, 6, 0.75);
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
          margin-top: 2px;
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
          padding: 8px 16px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.88);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.18);
          transition: all 0.25s ease;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .x-back:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%);
          border-color: rgba(255, 255, 255, 0.32);
          color: #FFFFFF;
        }

        /* Scientific Workspace Header */
        .x-console-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          padding: 18px 4px 14px;
        }
        .x-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
        }
        .x-console-title-group h1 {
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(22px, 2.4vw, 30px);
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 6px 0 4px;
          font-weight: 500;
          color: #FFFFFF;
        }
        .x-console-title-group h1 strong { font-weight: 700; }
        .x-console-title-group p {
          margin: 0;
          color: var(--x-muted);
          font-size: 13px;
          font-weight: 300;
          line-height: 1.5;
          max-width: 680px;
        }
        .x-live-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          padding: 7px 13px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.88);
        }
        .x-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E11D48;
          box-shadow: 0 0 10px rgba(225, 29, 72, 0.85);
        }

        /* Command Station: Live NASA Earthdata Study Region Selector */
        .x-earthdata-bar {
          margin-bottom: 16px;
          padding: 16px 20px;
          border-radius: 18px;
          background: linear-gradient(
            145deg,
            rgba(20, 20, 30, 0.78) 0%,
            rgba(10, 10, 16, 0.88) 60%,
            rgba(32, 14, 24, 0.78) 100%
          );
          backdrop-filter: blur(28px) saturate(140%);
          -webkit-backdrop-filter: blur(28px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 20px 48px -12px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.16);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .x-cmd-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .x-cmd-title-wrap {
          flex: 1 1 320px;
          min-width: 0;
        }
        .x-cmd-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--x-rose);
          font-weight: 600;
          margin-bottom: 4px;
        }
        .x-cmd-title {
          font-family: "Space Grotesk", sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
        }
        .x-cmd-desc {
          margin: 0;
          font-size: 12px;
          line-height: 1.45;
          color: rgba(244, 244, 246, 0.72);
          max-width: 780px;
        }
        .x-cmd-restore-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(244, 244, 246, 0.9);
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .x-cmd-restore-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.28);
          color: #FFFFFF;
        }

        .x-cmd-grid {
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          gap: 12px;
        }
        .x-cmd-presets {
          flex: 1 1 540px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 8px;
        }
        .x-region-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #F4F4F6;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          min-height: 70px;
        }
        .x-region-card:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.075);
          border-color: rgba(255, 255, 255, 0.24);
          transform: translateY(-1px);
        }
        .x-region-card.is-active {
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.24) 0%, rgba(190, 18, 60, 0.16) 100%);
          border-color: rgba(251, 113, 133, 0.75);
          box-shadow: 0 0 20px rgba(225, 29, 72, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        .x-region-card.is-sme2 {
          background: rgba(255, 255, 255, 0.035);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .x-region-card.is-sme2:hover {
          background: rgba(255, 255, 255, 0.075);
          border-color: rgba(255, 255, 255, 0.24);
        }
        .x-region-card.is-sme2.is-active {
          border-color: rgba(251, 113, 133, 0.75);
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.24) 0%, rgba(190, 18, 60, 0.16) 100%);
          box-shadow: 0 0 20px rgba(225, 29, 72, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .x-region-top {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          min-width: 0;
        }
        .x-region-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
        }
        .x-region-name {
          font-family: "Space Grotesk", sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
          flex: 1;
          min-width: 0;
        }
        .x-region-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 100%;
          min-width: 0;
          margin-top: 5px;
        }
        .x-region-tag {
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.72);
          letter-spacing: 0.03em;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .x-region-sub {
          font-size: 10px;
          line-height: 1.3;
          color: rgba(244, 244, 246, 0.72);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Custom Coordinates Search Box */
        .x-coord-tool {
          flex: 0 1 310px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(4, 4, 6, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.12);
          gap: 8px;
          min-height: 70px;
        }
        .x-coord-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(244, 244, 246, 0.75);
          font-weight: 500;
        }
        .x-coord-inputs {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .x-coord-field {
          position: relative;
          flex: 1 1 80px;
          min-width: 0;
        }
        .x-coord-input {
          width: 100%;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #FFFFFF;
          padding: 0 24px 0 8px;
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          outline: none;
          transition: border-color 0.2s ease;
          color-scheme: dark;
        }
        .x-coord-input:focus {
          border-color: rgba(251, 113, 133, 0.7);
          background: rgba(255, 255, 255, 0.08);
        }
        .x-coord-unit {
          position: absolute;
          right: 7px;
          top: 50%;
          transform: translateY(-50%);
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          font-weight: 700;
          color: #FB7185;
          pointer-events: none;
        }
        .x-coord-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          height: 32px;
          padding: 0 12px;
          border-radius: 8px;
          background: linear-gradient(135deg, #E11D48 0%, #BE123C 100%);
          border: 1px solid rgba(251, 113, 133, 0.45);
          color: #FFFFFF;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .x-coord-submit:hover:not(:disabled) {
          filter: brightness(1.15);
          box-shadow: 0 0 12px rgba(225, 29, 72, 0.4);
        }
        .x-coord-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 2-Column Primary Geospatial Workspace (70% Globe / 30% Timeline) */
        .x-primary-stage {
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
          gap: 16px;
          align-items: stretch;
          margin-bottom: 14px;
        }
        .x-globe-column {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }
        .x-globe-viewport {
          position: relative;
          height: 650px;
          min-height: 650px;
          max-height: 650px;
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
        }
        .x-globe-viewport .x-globe-card {
          height: 100% !important;
          min-height: 650px !important;
        }
        .x-timeline-column {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .x-timeline-column .x-timeline {
          height: 650px;
          min-height: 650px;
          max-height: 650px;
          display: flex;
          flex-direction: column;
        }
        .x-timeline-column .x-observation-list {
          flex: 1;
          overflow-y: auto;
        }
        .x-globe-legend {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          z-index: 20;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px 14px;
          padding: 9px 16px;
          border-radius: 12px;
          background: rgba(4, 4, 6, 0.42);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          color: #F4F4F6;
          font-family: "JetBrains Mono", monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          pointer-events: auto;
        }
        .x-globe-legend span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #FFFFFF;
          font-weight: 500;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }
        .x-globe-legend i {
          width: 14px;
          height: 9px;
          border-radius: 2px;
          border: 1px solid #FDA4AF;
          background: rgba(251, 113, 133, 0.6);
          display: inline-block;
          box-shadow: 0 0 8px rgba(251, 113, 133, 0.45);
        }
        .x-globe-legend .x-swatch-desc {
          border: 1px solid #FDA4AF;
          background: rgba(251, 113, 133, 0.6);
          box-shadow: 0 0 8px rgba(251, 113, 133, 0.45);
        }
        .x-globe-legend .x-swatch-selected {
          border: 1.5px solid #FFFFFF;
          background: #E11D48;
          box-shadow: 0 0 12px rgba(225, 29, 72, 0.8);
        }
        .x-globe-legend-hint {
          color: rgba(255, 255, 255, 0.82);
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: none;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        /* Generic Panel Styling */
        .explorer-panel {
          position: relative;
          min-width: 0;
          border-radius: 20px;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.055) 0%,
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
        }
        .x-panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }
        .x-panel-heading h2 {
          font-family: "Space Grotesk", sans-serif;
          font-size: 16px;
          letter-spacing: -0.02em;
          font-weight: 500;
          color: #FFFFFF;
          margin: 4px 0 0;
        }
        .x-product-badge {
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          background: rgba(225, 29, 72, 0.15);
          border: 1px solid rgba(251, 113, 133, 0.4);
          color: #FFE4E6;
          border-radius: 999px;
          padding: 4px 12px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 600;
        }
        .x-sub-eyebrow {
          display: block;
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.65);
        }
        .x-record-id {
          font-family: "JetBrains Mono", monospace;
          font-size: 11.5px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.9);
          overflow-wrap: anywhere;
          margin: 10px 0;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(4, 4, 6, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .x-metadata {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 14px;
          margin: 0;
        }
        .x-metadata > div {
          min-width: 0;
          padding: 7px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .x-metadata dt {
          color: rgba(244, 244, 246, 0.7);
          font-family: "JetBrains Mono", monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .x-metadata dd {
          margin: 0;
          color: #FFFFFF;
          font-size: 12.5px;
          font-weight: 500;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .x-record-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }
        .x-link-button,
        .x-icon-button,
        .x-btn-ghost,
        .x-disabled-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 34px;
          border-radius: 999px;
          padding: 0 14px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: all 0.25s ease;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .x-link-button {
          background: linear-gradient(135deg, #E11D48 0%, #BE123C 100%);
          border: 1px solid rgba(251, 113, 133, 0.55);
          color: #FFFFFF;
          text-decoration: none;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(225, 29, 72, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        .x-link-button:hover {
          background: linear-gradient(135deg, #FB7185 0%, #E11D48 100%);
          border-color: rgba(255, 255, 255, 0.45);
          color: #FFFFFF;
          transform: translateY(-1px);
        }
        .x-icon-button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.9);
        }
        .x-icon-button:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(251, 113, 133, 0.45);
          color: #FFFFFF;
        }
        .x-btn-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.65);
        }
        .x-btn-ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
        }
        .x-disabled-link {
          color: var(--x-dim);
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .x-cloud-assets {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: grid;
          gap: 6px;
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
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.82);
          text-decoration: none;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .x-asset-chip:hover {
          border-color: rgba(251, 113, 133, 0.45);
          background: rgba(225, 29, 72, 0.14);
          color: #FFFFFF;
        }

        /* Browse Panel */
        .x-browse-panel {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .x-browse-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .x-browse-tab {
          display: inline-flex;
          align-items: center;
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(4, 4, 6, 0.6);
          color: rgba(255, 255, 255, 0.68);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .x-browse-tab.is-active {
          border-color: rgba(251, 113, 133, 0.55);
          background: rgba(225, 29, 72, 0.22);
          color: #FFFFFF;
        }
        .x-browse-stage {
          position: relative;
          flex: 1;
          min-height: 220px;
          max-height: 300px;
          border-radius: 14px;
          overflow: hidden;
          background: radial-gradient(circle at center, rgba(225, 29, 72, 0.08), #040406 75%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .x-browse-loading {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          text-align: center;
          font-family: "JetBrains Mono", monospace;
          font-size: 10.5px;
          line-height: 1.5;
          color: rgba(244, 244, 246, 0.85);
          pointer-events: none;
        }
        .x-browse-loading span {
          max-width: 320px;
          display: block;
        }
        .x-browse-img {
          width: 100%;
          max-height: 280px;
          object-fit: contain;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .x-browse-img.is-loaded { opacity: 1; }
        .x-browse-footer {
          margin-top: auto;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--x-dim);
        }
        .x-browse-open {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #FDA4AF;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .x-browse-open:hover { color: #FFFFFF; }

        /* L3 SME2 Soil Moisture Panel */
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
          font-size: 9px;
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
          font-size: 9px;
          color: var(--x-muted);
        }

        /* QA & Database Watchpoints Panel */
        .x-qa-watchpoints-panel {
          padding: 18px 20px;
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
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.75);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .x-qa-pill.is-pass {
          background: rgba(16, 185, 129, 0.16);
          border: 1px solid rgba(52, 211, 153, 0.4);
          color: #6EE7B7;
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
          font-size: 11px;
          font-weight: 500;
          color: #FFFFFF;
        }
        .x-qa-row span {
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          color: var(--x-muted);
        }
        .x-qa-badge {
          padding: 3px 7px;
          border-radius: 999px;
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .x-qa-badge.is-pass {
          background: rgba(16, 185, 129, 0.18);
          border: 1px solid rgba(52, 211, 153, 0.4);
          color: #6EE7B7;
        }
        .x-qa-badge.is-warn {
          background: rgba(225, 29, 72, 0.2);
          border: 1px solid rgba(251, 113, 133, 0.45);
          color: #FFE4E6;
        }

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
          border-color: rgba(251, 113, 133, 0.4);
          background: rgba(255, 255, 255, 0.045);
        }
        .x-wp-card.is-active {
          border-color: rgba(251, 113, 133, 0.75);
          background: linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(190, 18, 60, 0.12) 100%);
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
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #FDA4AF;
        }
        .x-wp-notes {
          font-size: 10.5px;
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
        .x-wp-del:hover { color: #FB7185; }

        .x-empty {
          display: grid;
          place-content: center;
          text-align: center;
          min-height: 150px;
          gap: 8px;
          padding: 22px;
          color: var(--x-muted);
          font-size: 13px;
          font-weight: 300;
          line-height: 1.6;
        }
        .x-empty span:first-child {
          font-family: "Space Grotesk", sans-serif;
          font-size: 15px;
          color: #FFFFFF;
          font-weight: 500;
        }
        .x-details-empty { display: grid; place-items: center; min-height: 250px; }

        @media (max-width: 1180px) {
          .x-primary-stage { grid-template-columns: 1fr; }
          .x-globe-viewport { height: 480px; min-height: 480px; max-height: 480px; }
          .x-globe-viewport .x-globe-card { min-height: 480px !important; }
          .x-timeline-column .x-timeline { height: 420px; min-height: 420px; max-height: 420px; }
          .x-cmd-grid { flex-direction: column; }
          .x-coord-tool { flex: 1 1 100%; }
        }
        @media (max-width: 760px) {
          .x-explorer { padding: 0 12px 28px; }
          .x-topbar { padding: 10px 14px; flex-wrap: wrap; }
          .x-console-header { padding: 16px 0 12px; }
          .x-earthdata-bar { padding: 12px 14px; }
          .x-cmd-presets { grid-template-columns: 1fr; }
          .x-globe-viewport { height: 380px; min-height: 380px; max-height: 380px; }
          .x-globe-viewport .x-globe-card { min-height: 380px !important; }
          .x-timeline-column .x-timeline { height: 350px; min-height: 350px; max-height: 350px; }
          .x-globe-legend {
            bottom: 8px;
            left: 8px;
            right: 8px;
            padding: 8px 12px;
            font-size: 9.5px;
          }
          .x-coord-inputs { flex-wrap: wrap; }
          .x-coord-field { flex: 1 1 calc(50% - 4px); }
          .x-coord-submit { width: 100%; margin-top: 4px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .x-explorer * { scroll-behavior: auto !important; transition: none !important; }
        }
      `}</style>

      <div className="x-shell">
        {/* Top Navbar with Spatial Breadcrumb Anchor */}
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
                  NASA SPACE APPS 2026 · MISSION CONSOLE
                </div>
              </div>
            </a>

            <a className="x-back" href="/">
              <ArrowLeft size={13} aria-hidden="true" />
              <span>Back to Home</span>
            </a>
          </header>
        </div>

        {/* Scientific Console Header */}
        <div className="x-console-header">
          <div className="x-console-title-group">
            <span className="x-eyebrow">
              <DiamondCrosshair />
              <span>MISSION DATA EXPLORER · NASA-ISRO SAR</span>
            </span>
            <h1>
              NISAR Earth Observation <strong>Workspace</strong>
            </h1>
            <p>
              Authenticated L-band radar acquisitions, 561-pixel L3 Soil Moisture EASE-Grid 2.0 telemetry, and real-time multi-temporal surface change detection.
            </p>
          </div>

          <div className="x-console-status-group flex items-center gap-3">
            <DotGridMark className="hidden sm:grid shrink-0" />
          </div>
        </div>

        {/* Command Station: Live NASA Earthdata Study Region Selector */}
        <section
          className="x-earthdata-bar"
          aria-label="Scientific target selector and live NASA Earthdata search"
        >
          {/* Top Bar: Section Header / Guidance */}
          <div className="x-cmd-header">
            <div className="x-cmd-title-wrap">
              <span className="x-cmd-eyebrow">
                <Compass size={12} className="text-[#FB7185]" aria-hidden="true" />
                <span>TARGET OBSERVATION SELECTOR · NASA EARTHDATA CLOUD</span>
              </span>
              <h2 className="x-cmd-title">Select Study Region or Query Global Coordinates</h2>
              <p className="x-cmd-desc">
                Select a scientific testbed to fetch verified NISAR L-band SAR granules from NASA Earthdata Cloud, or query custom coordinates.
              </p>
            </div>
            {liveRecords && (
              <button
                type="button"
                className="x-cmd-restore-btn"
                onClick={() => runLiveAsfQuery(null, 'local', 'Meghna Baseline')}
                title="Restore default 154-granule calibrated Meghna archive"
              >
                <RefreshCw size={11} aria-hidden="true" />
                <span>Restore Baseline Archive</span>
              </button>
            )}
          </div>

          {/* Interactive Row: Region Presets + Featured Product + Coordinate Search */}
          <div className="x-cmd-grid">
            {/* Presets List */}
            <div className="x-cmd-presets" role="group" aria-label="Target observation regions">
              {LIVE_REGION_PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                const isLoadingThis = liveLoading && activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={liveLoading}
                    className={`x-region-card${isActive ? ' is-active' : ''}`}
                    onClick={() =>
                      runLiveAsfQuery(preset.coords, preset.id, preset.label)
                    }
                    title={`${preset.label} — ${preset.subtitle} (${preset.tag})`}
                  >
                    <div className="x-region-top">
                      <span className="x-region-indicator">
                        {isLoadingThis ? (
                          <Loader2 size={11} className="animate-spin text-[#FB7185]" />
                        ) : (
                          <Radar size={11} className={isActive ? 'text-[#FB7185]' : 'text-white/60'} />
                        )}
                      </span>
                      <span className="x-region-name">{preset.label}</span>
                    </div>
                    <div className="x-region-meta">
                      <span className="x-region-tag">{preset.tag}</span>
                      <span className="x-region-sub">{preset.subtitle}</span>
                    </div>
                  </button>
                );
              })}

              {/* Special Featured L3 Product Card */}
              <button
                type="button"
                className={`x-region-card is-sme2${isSme2Active ? ' is-active' : ''}`}
                onClick={handleFocusSme2}
                title="Select and fly to the 561-pixel L3 Soil Moisture (SME2) EASE-Grid 2.0 over Svalbard"
              >
                <div className="x-region-top">
                  <span className="x-region-indicator">
                    <Sparkles size={11} className={isSme2Active ? 'text-[#FB7185]' : 'text-white/60'} />
                  </span>
                  <span className="x-region-name">L3 Soil Moisture</span>
                </div>
                <div className="x-region-meta">
                  <span className="x-region-tag">561 Px · Svalbard</span>
                  <span className="x-region-sub">200m EASE-Grid 2.0</span>
                </div>
              </button>
            </div>

            {/* Custom Coordinates Search Tool */}
            <form className="x-coord-tool" onSubmit={handleCustomSearch}>
              <div className="x-coord-label">
                <Globe size={11} className="text-white/60" aria-hidden="true" />
                <span>Custom Global Coordinates</span>
              </div>
              <div className="x-coord-inputs">
                <div className="x-coord-field">
                  <label htmlFor="custom-lat" className="sr-only">Latitude</label>
                  <input
                    id="custom-lat"
                    type="text"
                    className="x-coord-input"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="Lat (e.g. 23.81)"
                    aria-label="Latitude in decimal degrees"
                  />
                  <span className="x-coord-unit">°N</span>
                </div>
                <div className="x-coord-field">
                  <label htmlFor="custom-lon" className="sr-only">Longitude</label>
                  <input
                    id="custom-lon"
                    type="text"
                    className="x-coord-input"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    placeholder="Lon (e.g. 90.41)"
                    aria-label="Longitude in decimal degrees"
                  />
                  <span className="x-coord-unit">°E</span>
                </div>
                <button
                  type="submit"
                  disabled={liveLoading}
                  className="x-coord-submit"
                  title="Query live NASA Earthdata CMR archive at custom coordinates"
                >
                  {liveLoading && activePreset === 'custom' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Search size={12} aria-hidden="true" />
                  )}
                  <span>Query NASA CMR</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Consolidated Horizontal Filter & Telemetry Bar */}
        <CatalogFilters
          productTypes={types}
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(INITIAL_FILTERS)}
          resultCount={filtered.length}
          totalCount={features.length}
          coverage={coverageLabel(features)}
        />

        {/* 2-Column Primary Geospatial Workspace (70% Globe / 30% Timeline) */}
        <div className="x-primary-stage">
          <div className="x-globe-column">
            <ComparePairBar
              comparePair={comparePair}
              activePartner={activePartner}
              changeProduct={changeProduct}
              onStartAutoCompare={handleStartAutoCompare}
              compareLayerMode={compareLayerMode}
              onSetCompareMode={setCompareLayerMode}
              compareOpacity={compareOpacity}
              onOpacityChange={setCompareOpacity}
              onSwapCompare={handleSwapCompare}
              onExitCompare={handleExitCompare}
            />
            <div className="x-globe-viewport">
              <GlobeViewer
                features={filtered}
                selectedId={activeId}
                onSelect={setSelectedId}
                drapeRadarOnGlobe={drapeRadarOnGlobe}
                sme2FocusTrigger={sme2FocusTrigger}
                comparePair={comparePair}
                changeProduct={changeProduct}
                compareLayerMode={compareLayerMode}
                compareOpacity={compareOpacity}
                onOpacityChange={setCompareOpacity}
                splitRatio={splitRatio}
                onSplitRatioChange={setSplitRatio}
                onExitCompare={handleExitCompare}
                onSetCompareMode={setCompareLayerMode}
                onSwapCompare={handleSwapCompare}
                onStartAutoCompare={handleStartAutoCompare}
                activePartner={activePartner}
              />
              <div className="x-globe-legend" aria-label="Globe legend">
                {comparePair ? (
                  compareLayerMode === 'diffDb' ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <span>
                        <i style={{ background: '#E11D48', border: '1px solid #FB7185' }} aria-hidden="true" /> Drop (≤ -3 dB · Water Expansion)
                      </span>
                      <span>
                        <i style={{ background: 'transparent', border: '1px dashed rgba(244, 244, 246, 0.4)' }} aria-hidden="true" /> Stable Backscatter (±1 dB)
                      </span>
                      <span>
                        <i style={{ background: '#0284C7', border: '1px solid #38BDF8' }} aria-hidden="true" /> Rise (≥ +3 dB · Surface Drying)
                      </span>
                    </div>
                  ) : compareLayerMode === 'curtain' ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <span>
                        <i style={{ background: '#F4F4F6', border: '1px solid #FFFFFF' }} aria-hidden="true" /> Date A ({comparePair.granuleA?.properties?.acquisitionDate ?? 'Ref'})
                      </span>
                      <span>
                        <i style={{ background: '#E11D48', border: '1px solid #FB7185' }} aria-hidden="true" /> Date B ({comparePair.granuleB?.properties?.acquisitionDate ?? 'Sec'})
                      </span>
                      <span>
                        <i style={{ background: '#FB7185', border: '1px solid #FDA4AF' }} aria-hidden="true" /> Interactive 3D Curtain Divider
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <span>
                        <i style={{ background: '#1E3A8A', border: '1px solid #3B82F6' }} aria-hidden="true" /> Permanent Water
                      </span>
                      <span>
                        <i style={{ background: '#E11D48', border: '1px solid #FB7185' }} aria-hidden="true" /> New Water / Flood
                      </span>
                      <span>
                        <i style={{ background: '#38BDF8', border: '1px solid #7DD3FC' }} aria-hidden="true" /> Water Receded / Lost
                      </span>
                      <span>
                        <i style={{ background: 'transparent', border: '1px dashed rgba(244, 244, 246, 0.4)' }} aria-hidden="true" /> Unchanged Land
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <span>
                      <i aria-hidden="true" /> Ascending Track
                    </span>
                    <span>
                      <i className="x-swatch-desc" aria-hidden="true" /> Descending Track
                    </span>
                    <span>
                      <i className="x-swatch-selected" aria-hidden="true" /> Selected + Draped SAR
                    </span>
                  </div>
                )}
                <span className="x-globe-legend-hint">
                  {comparePair
                    ? changeLoading
                      ? 'Computing SAR Co-Registration & Speckle Filter…'
                      : 'Real-time multi-temporal SAR change draped on 3D terrain'
                    : 'Click any SAR frame or Svalbard L3 grid · Drag to orbit · Scroll to zoom'}
                </span>
              </div>
            </div>
          </div>

          <div className="x-timeline-column">
            <CatalogTimeline
              features={filtered}
              selectedId={activeId}
              onSelect={setSelectedId}
              comparePair={comparePair}
              activePartner={activePartner}
              onSelectAsDateA={handleSelectAsDateA}
              onSelectAsDateB={handleSelectAsDateB}
              onAutoPair={handleStartAutoCompare}
            />
          </div>
        </div>

        {/* Secondary Analysis Workbench: Tabbed Observation Inspector */}
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
          comparePair={comparePair}
          changeProduct={changeProduct}
          activeThresholdDb={activeThresholdDb}
          onThresholdChange={handleThresholdChange}
          onExitCompare={handleExitCompare}
        />
      </div>
    </main>
  );
}
