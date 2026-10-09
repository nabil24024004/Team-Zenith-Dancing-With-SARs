const DEFAULT_WATCHPOINTS = [
  {
    title: 'Meghna-Brahmaputra Subsidence & Flood Node',
    latitude: 23.81,
    longitude: 90.41,
    pinned_granule_id:
      'NISAR_L2_PR_GCOV_021_069_A_008_2005_DHDH_A_20261006T120416_20261006T120452_P05024_N_F_J_001',
    product_type: 'GCOV',
    status: 'ACTIVE INTERFEROMETRY',
    notes:
      'Dual-pol L-band geocoded covariance (HHHH/HVHV) monitoring monsoon floodplain inundation across the Dhaka-Meghna basin.',
  },
  {
    title: 'Jamuna-Padma Unwrapped Phase Pair',
    latitude: 24.18,
    longitude: 89.82,
    pinned_granule_id:
      'NISAR_L2_PR_GUNW_031_069_A_015_032_4000_SH_20260922T232205_20260922T232240_20261004T232205_20261004T232240_P05023_N_F_J_001',
    product_type: 'GUNW',
    status: 'PHASE COHERENT',
    notes:
      '12-day repeat-pass unwrapped interferogram (Track 069, Frame 015) measuring millimeter-scale levee subsidence.',
  },
  {
    title: 'Svalbard Arctic Permafrost Soil Moisture Array',
    latitude: 77.521,
    longitude: 13.945,
    pinned_granule_id:
      'NISAR_L3_PR_SME2_031_141_A_045_0005_NASV_A_20260927T233048_20260927T233132_P05023_N_F_J_001',
    product_type: 'SME2',
    status: 'L3 EASE-GRID 200M',
    notes:
      '561-pixel L3 SME2 volumetric soil moisture grid (mean 12.1% m³/m³, peak 41.3% m³/m³) over Arctic permafrost.',
  },
];

async function queryTableWatchpoints(supabaseUrl, serviceKey) {
  const url = `${supabaseUrl}/rest/v1/mission_watchpoints?select=*&order=created_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length === 0) {
    // Seed initial watchpoints into public.mission_watchpoints
    const seedRes = await fetch(`${supabaseUrl}/rest/v1/mission_watchpoints`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(DEFAULT_WATCHPOINTS),
    });
    if (seedRes.ok) {
      return await seedRes.json();
    }
  }
  return Array.isArray(rows) ? rows : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !serviceKey) {
    return res.status(200).json({
      source: 'local-fallback',
      watchpoints: DEFAULT_WATCHPOINTS,
    });
  }

  try {
    if (req.method === 'GET') {
      const rows = await queryTableWatchpoints(supabaseUrl, serviceKey);
      return res.status(200).json({
        source: 'supabase-postgres',
        projectRef: 'cxfwogzgtwslzviecrtx',
        watchpoints: rows ?? DEFAULT_WATCHPOINTS,
      });
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string'
          ? JSON.parse(req.body || '{}')
          : req.body || {};
      const newEntry = {
        title: String(body.title || 'Pinned NISAR Watchpoint').slice(0, 90),
        latitude: Number(body.latitude) || 23.81,
        longitude: Number(body.longitude) || 90.41,
        pinned_granule_id: body.pinned_granule_id || null,
        product_type: body.product_type || 'SAR',
        status: body.status || 'PINNED OBSERVATION',
        notes: String(
          body.notes || 'Pinned from Team Zenith NISAR Mission Console.'
        ).slice(0, 280),
      };

      await fetch(`${supabaseUrl}/rest/v1/mission_watchpoints`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(newEntry),
      });

      const updated = await queryTableWatchpoints(supabaseUrl, serviceKey);
      return res.status(200).json({
        source: 'supabase-postgres',
        watchpoints: updated ?? DEFAULT_WATCHPOINTS,
      });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (id) {
        await fetch(
          `${supabaseUrl}/rest/v1/mission_watchpoints?id=eq.${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          }
        );
      }
      const updated = await queryTableWatchpoints(supabaseUrl, serviceKey);
      return res.status(200).json({
        source: 'supabase-postgres',
        watchpoints: updated ?? [],
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Supabase watchpoint error',
      watchpoints: DEFAULT_WATCHPOINTS,
    });
  }
}
