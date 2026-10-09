import crypto from 'node:crypto';

const ALLOWED_HOSTS = new Set([
  'nisar.asf.earthdatacloud.nasa.gov',
  'datapool.asf.alaska.edu',
  'cumulus.asf.earthdatacloud.nasa.gov',
  'urs.earthdata.nasa.gov',
]);

function inferContentType(urlPath, upstreamType) {
  const lower = urlPath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml'))
    return 'text/yaml; charset=utf-8';
  if (lower.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (
    upstreamType &&
    upstreamType !== 'binary/octet-stream' &&
    upstreamType !== 'application/octet-stream'
  ) {
    return upstreamType;
  }
  return 'application/octet-stream';
}

function cacheKeyForUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  const basename = parsed.pathname.split('/').pop() || 'asset';
  const hash = crypto.createHash('sha1').update(rawUrl).digest('hex').slice(0, 10);
  return `${hash}_${basename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query?.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing required ?url= parameter' });
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid target URL' });
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(403).json({
      error: `Host ${parsed.hostname} is not in the allowed NASA Earthdata domain list.`,
    });
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
  const isCacheableAsset = /\.(png|csv|yaml|yml|xml|pdf)$/i.test(
    parsed.pathname
  );
  const cacheObjectName = cacheKeyForUrl(parsed.toString());

  try {
    // 1. Check Supabase Storage CDN cache first (`nisar-browse-cache`)
    if (supabaseUrl && supabaseKey && isCacheableAsset) {
      const supaCacheUrl = `${supabaseUrl}/storage/v1/object/public/nisar-browse-cache/${cacheObjectName}`;
      const cacheRes = await fetch(supaCacheUrl);
      if (cacheRes.ok) {
        const buffer = Buffer.from(await cacheRes.arrayBuffer());
        const contentType = inferContentType(
          parsed.pathname,
          cacheRes.headers.get('content-type')
        );
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Zenith-Cache', 'SUPABASE-CDN-HIT');
        res.setHeader(
          'Cache-Control',
          'public, max-age=86400, s-maxage=86400'
        );
        return res.status(200).send(buffer);
      }
    }

    // 2. Fetch live from NASA Earthdata Cloud using Earthdata Login Bearer Token
    const upstream = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'TeamZenith-NISAR-Explorer/1.0',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `NASA Earthdata Cloud returned HTTP ${upstream.status}`,
      });
    }

    const contentType = inferContentType(
      parsed.pathname,
      upstream.headers.get('content-type')
    );
    const buffer = Buffer.from(await upstream.arrayBuffer());

    // 3. Asynchronously persist in Supabase Storage CDN (`nisar-browse-cache`) if < 12 MB
    if (
      supabaseUrl &&
      supabaseKey &&
      isCacheableAsset &&
      buffer.byteLength < 12 * 1024 * 1024
    ) {
      fetch(
        `${supabaseUrl}/storage/v1/object/nisar-browse-cache/${cacheObjectName}`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': contentType,
            'x-upsert': 'true',
          },
          body: buffer,
        }
      ).catch(() => {});
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Zenith-Cache', 'EARTHDATA-LIVE-CACHED-TO-SUPABASE');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error proxying NASA Earthdata asset',
    });
  }
}
