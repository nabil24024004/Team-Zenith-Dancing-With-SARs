const PRODUCT_TYPE_BY_LEVEL = Object.freeze({
  L1: 'L1',
  L1A: 'L1A',
  L1B: 'L1B',
  L1C: 'L1C',
  L2: 'L2',
  L2A: 'L2A',
  L2B: 'L2B',
  L2C: 'L2C',
  L3: 'L3',
  L4: 'L4',
});

function normalizeProductType(processingLevel) {
  if (typeof processingLevel !== 'string' || !processingLevel.trim()) return null;

  const level = processingLevel.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return PRODUCT_TYPE_BY_LEVEL[level] ?? level;
}

function normalizeAcquisitionDate(startTime) {
  if (typeof startTime !== 'string' || !startTime.trim()) return null;

  const timestamp = Date.parse(startTime);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10);
}

function parsePolygon(wkt) {
  if (typeof wkt !== 'string') throw new Error('Geometry must be a WKT string.');
  const text = wkt.trim();
  const typeMatch = /^(POLYGON|MULTIPOLYGON)\s*(.*)$/i.exec(text);
  if (!typeMatch) throw new Error('Only WKT POLYGON and MULTIPOLYGON geometry are supported.');

  const body = typeMatch[2].trim();
  const parseRing = (ringText) => {
    const ring = ringText.split(',').map((pair) => {
      const values = pair.trim().split(/\s+/);
      if (values.length < 2) throw new Error('Polygon coordinate must contain longitude and latitude.');
      const longitude = Number(values[0]);
      const latitude = Number(values[1]);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error('Polygon coordinates must be finite numbers.');
      if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) throw new Error('Polygon coordinate is outside valid longitude/latitude bounds.');
      return [longitude, latitude];
    });
    if (ring.length < 4) throw new Error('Polygon linear ring must contain at least four positions.');
    const first = ring[0];
    const last = ring.at(-1);
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error('Polygon linear ring must be closed.');
    return ring;
  };
  const parsePolygonBody = (polygonBody) => {
    const rings = polygonBody.trim().replace(/^\(/, '').replace(/\)$/, '');
    const ringTexts = rings.split(/\)\s*,\s*\(/).map((value) => value.replace(/^\(/, '').replace(/\)$/, ''));
    return ringTexts.map(parseRing);
  };

  if (typeMatch[1].toUpperCase() === 'POLYGON') {
    const bodyMatch = /^\(\s*\((.*)\)\s*\)$/s.exec(body);
    if (!bodyMatch) throw new Error('Invalid WKT POLYGON syntax.');
    return { type: 'Polygon', coordinates: parsePolygonBody(bodyMatch[1]) };
  }

  const multiMatch = /^\(\s*(.*)\s*\)$/s.exec(body);
  if (!multiMatch) throw new Error('Invalid WKT MULTIPOLYGON syntax.');
  const polygonBodies = multiMatch[1].split(/\)\s*\)\s*,\s*\(\s*\(/);
  return { type: 'MultiPolygon', coordinates: polygonBodies.map(parsePolygonBody) };
}

function getGeometry(record) {
  const footprint = record.stringFootprint ?? record.footprint;
  if (typeof footprint !== 'string') throw new Error('Missing WKT footprint.');
  return parsePolygon(footprint);
}

function getRecords(input) {
  if (!Array.isArray(input)) return [];
  // ASF's export wrapper is a single outer array containing the records array.
  if (input.length === 1 && Array.isArray(input[0])) return input[0];
  return input;
}

function stableId(record) {
  const identifier = record.granuleName ?? record.granuleUr;
  return typeof identifier === 'string' && identifier.trim() ? identifier.trim() : null;
}

/**
 * Convert flat or ASF-wrapped records to GeoJSON-compatible features.
 * Unsupported or malformed record geometry is isolated to that record and
 * reported in `errors`; source fields are retained in feature properties.
 */
export function normalizeCatalog(input) {
  const features = [];
  const errors = [];

  getRecords(input).forEach((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push({ index, id: null, message: 'Catalog record must be an object.' });
      return;
    }

    const id = stableId(record);
    try {
      const geometry = getGeometry(record);
      if (!id) throw new Error('Missing granuleName or granuleUr stable identifier.');

      const properties = {
        ...record,
        id,
        productType: normalizeProductType(record.processingLevel),
        acquisitionDate: normalizeAcquisitionDate(record.startTime),
      };
      features.push({ type: 'Feature', id, geometry, properties });
    } catch (error) {
      errors.push({
        index,
        id,
        message: error instanceof Error ? error.message : 'Invalid catalog record.',
      });
    }
  });

  return { type: 'FeatureCollection', features, errors };
}

/**
 * Extract orbital repeat-pass signature for NISAR granules.
 * Granules that share the same orbital track, direction, and frame
 * can be compared directly for multi-temporal change detection.
 */
export function getGranuleSignature(recordOrFeature) {
  const p = recordOrFeature?.properties ?? recordOrFeature ?? {};
  const name = String(p.granuleName ?? p.granuleUr ?? p.fileName ?? p.id ?? '');

  let track = p.track ?? p.pathNumber;
  let direction = p.flightDirection;
  let frame = p.frameNumber ?? p.finalFrame ?? p.firstFrame;
  let productType = p.processingLevel ?? p.productType;

  // Try extracting from standard NISAR filename if missing
  // Format: NISAR_L<lvl>_<cfg>_<prod>_<cycle>_<track>_<dir>_<frame>_...
  const match = /^NISAR_[A-Z0-9]+_[A-Z0-9]+_([A-Z0-9]+)_(\d+)_(\d+)_([AD])_([A-Z0-9]+)/i.exec(name);
  if (match) {
    if (!productType) productType = match[1];
    if (track == null) track = match[3];
    if (!direction) direction = match[4].toUpperCase() === 'A' ? 'ASCENDING' : 'DESCENDING';
    if (frame == null) frame = match[5];
  }

  const trackStr = track != null && track !== '' ? String(parseInt(track, 10)) : '0';
  const dirStr = direction ? String(direction).toUpperCase().slice(0, 3) : 'ASC';
  const frameStr = frame != null && frame !== '' ? String(frame).replace(/^0+/, '') || '0' : '0';
  const prodStr = productType ? String(productType).toUpperCase() : 'SAR';

  return {
    track: trackStr,
    direction: dirStr,
    frame: frameStr,
    productType: prodStr,
    key: `${prodStr}_TRK${trackStr}_${dirStr}_FRM${frameStr}`,
    spatialKey: `TRK${trackStr}_${dirStr}_FRM${frameStr}`,
    date: p.acquisitionDate ?? (p.startTime ? String(p.startTime).slice(0, 10) : ''),
  };
}

/**
 * Group records or features into comparable multi-temporal repeat-pass pairs.
 * Returns an array of group objects with { groupKey, track, direction, frame, productType, items }.
 */
export function findComparablePairs(recordsOrFeatures = []) {
  if (!Array.isArray(recordsOrFeatures)) return [];
  const groups = new Map();

  recordsOrFeatures.forEach((item) => {
    if (!item) return;
    const sig = getGranuleSignature(item);
    const groupKey = sig.spatialKey;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        track: sig.track,
        direction: sig.direction,
        frame: sig.frame,
        productType: sig.productType,
        items: [],
      });
    }
    groups.get(groupKey).items.push(item);
  });

  const comparableGroups = [];
  groups.forEach((grp) => {
    const dates = new Set(
      grp.items.map((it) => {
        const p = it.properties ?? it;
        return p.acquisitionDate ?? (p.startTime ? p.startTime.slice(0, 10) : it.id);
      })
    );
    if (grp.items.length >= 2 && dates.size >= 2) {
      grp.items.sort((a, b) => {
        const timeA = Date.parse((a.properties ?? a).startTime ?? '') || 0;
        const timeB = Date.parse((b.properties ?? b).startTime ?? '') || 0;
        return timeB - timeA;
      });
      comparableGroups.push(grp);
    }
  });

  return comparableGroups;
}

/**
 * Find partner granules for a specific record from a list of records.
 * Returns all granules that share the same orbital track and frame on a different acquisition date.
 */
export function getPartnerGranules(selectedRecord, allRecords = []) {
  if (!selectedRecord || !Array.isArray(allRecords)) return [];
  const selId = selectedRecord.id ?? selectedRecord.properties?.id ?? selectedRecord.granuleName;
  const selSig = getGranuleSignature(selectedRecord);
  const selDate = selSig.date;

  return allRecords.filter((cand) => {
    const candId = cand.id ?? cand.properties?.id ?? cand.granuleName;
    if (candId === selId) return false;
    const candSig = getGranuleSignature(cand);
    // Same spatial track/frame
    const isSamePass = candSig.spatialKey === selSig.spatialKey;
    // Prefer different dates if available
    return isSamePass;
  }).sort((a, b) => {
    const timeA = Date.parse((a.properties ?? a).startTime ?? '') || 0;
    const timeB = Date.parse((b.properties ?? b).startTime ?? '') || 0;
    // Prioritize different date first, then newest
    const dateA = (a.properties ?? a).acquisitionDate;
    const dateB = (b.properties ?? b).acquisitionDate;
    const diffDateA = dateA !== selDate ? 1 : 0;
    const diffDateB = dateB !== selDate ? 1 : 0;
    if (diffDateA !== diffDateB) return diffDateB - diffDateA;
    return timeB - timeA;
  });
}

function dateBound(value, endOfDay = false) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;

  const timestamp = Date.parse(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return NaN;
  return timestamp;
}

/** Filter normalized features by exact product type and inclusive UTC calendar dates. */
export function filterCatalog(features, { productType, startDate, endDate } = {}) {
  if (!Array.isArray(features)) return [];

  const start = dateBound(startDate);
  const end = dateBound(endDate, true);
  const hasProductType = typeof productType === 'string' && productType.length > 0;

  return features.filter((feature) => {
    const properties = feature?.properties ?? {};
    if (hasProductType && properties.productType !== productType) return false;

    const date = properties.acquisitionDate;
    if (startDate != null && startDate !== '') {
      const timestamp = dateBound(date);
      if (!Number.isFinite(start) || !Number.isFinite(timestamp) || timestamp < start) return false;
    }
    if (endDate != null && endDate !== '') {
      const timestamp = dateBound(date);
      if (!Number.isFinite(end) || !Number.isFinite(timestamp) || timestamp > end) return false;
    }
    return true;
  });
}

