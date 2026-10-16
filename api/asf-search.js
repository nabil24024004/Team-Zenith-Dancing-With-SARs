import crypto from 'node:crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = (
    process.env.EARTHDATA_TOKEN ||
    process.env.VITE_EARTHDATA_TOKEN ||
    ''
  ).trim();

  if (!token) {
    return res
      .status(500)
      .json({ error: 'Missing EARTHDATA_TOKEN in server environment' });
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  try {
    const query = req.query || {};
    const params = new URLSearchParams();
    params.set('platform', query.platform || 'NISAR');
    if (query.processingLevel) {
      params.set('processingLevel', query.processingLevel);
    }
    if (query.intersectsWith) {
      params.set('intersectsWith', query.intersectsWith);
    }
    if (query.start) params.set('start', query.start);
    if (query.end) params.set('end', query.end);
    params.set(
      'maxResults',
      String(Math.min(Number(query.maxResults) || 80, 250))
    );
    params.set('output', 'json');

    const cacheKey = crypto
      .createHash('sha1')
      .update(params.toString())
      .digest('hex')
      .slice(0, 12);
    const cacheObject = `asf-query-${cacheKey}.json`;

    const upstreamUrl = `https://api.daac.asf.alaska.edu/services/search/param?${params.toString()}`;
    const response = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'TeamZenith-NISAR-Explorer/1.0',
      },
    });

    if (!response.ok) {
      if (supabaseUrl && supabaseKey) {
        const supaFallback = await fetch(
          `${supabaseUrl}/storage/v1/object/public/nisar-mission-store/${cacheObject}`
        );
        if (supaFallback.ok) {
          const fallbackText = await supaFallback.text();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Zenith-Cache', 'SUPABASE-FALLBACK');
          return res.status(200).send(fallbackText);
        }
      }
      return res.status(response.status).json({
        error: `ASF Search API returned HTTP ${response.status}`,
      });
    }

    const payload = await response.text();

    // Persist the ASF query result into Supabase Storage AND public.nisar_granules PostGIS table
    if (supabaseUrl && supabaseKey) {
      fetch(
        `${supabaseUrl}/storage/v1/object/nisar-mission-store/${cacheObject}`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'x-upsert': 'true',
          },
          body: payload,
        }
      ).catch(() => {});

      try {
        const parsedJson = JSON.parse(payload);
        const records = Array.isArray(parsedJson?.[0])
          ? parsedJson[0]
          : Array.isArray(parsedJson)
            ? parsedJson
            : [];
        if (records.length > 0) {
          const pgRows = records
            .filter((r) => r && r.granuleName)
            .map((r) => ({
              granule_id: r.granuleName,
              product_type: r.processingLevel || 'SAR',
              processing_type: r.processingType || null,
              start_time: r.startTime || null,
              stop_time: r.stopTime || null,
              flight_direction: r.flightDirection || null,
              path_number: Number(r.pathNumber) || null,
              frame_number: Number(r.frameNumber) || null,
              footprint: r.stringFootprint
                ? `SRID=4326;${r.stringFootprint}`
                : null,
              browse_urls: r.browse || [],
              additional_urls: (r.nisar && r.nisar.additionalUrls) || [],
              raw_metadata: r,
            }));
          fetch(`${supabaseUrl}/rest/v1/nisar_granules`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify(pgRows),
          }).catch(() => {});
        }
      } catch {
        // Ignore parse error on background sync
      }
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Zenith-Cache', 'ASF-LIVE-SYNCED-TO-SUPABASE-POSTGIS');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(payload);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error querying NASA ASF Search API',
    });
  }
}
