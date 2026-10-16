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
