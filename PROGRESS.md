# TEAM ZENITH // DANCING WITH THE SARs — ENGINEERING PROGRESS & OPERATOR GUIDE

**Last Updated:** October 10, 2026  
**Project:** Team Zenith — *Dancing with the SARs* (NASA Space Apps Challenge 2026)  
**Routes:** `/` (Interactive Observatory Landing Page) · `/dashboard` (NISAR 3D Mission Data Explorer)

---

## 01 // Summary of What We Accomplished Today

### 1. Landing Page & Hero Visual Polish (`/`)
- **Enriched 3D Planetary SAR Globe (`src/components/EarthHorizonHero.jsx`)**:
  - Upgraded the hero globe from a minimal crescent into a full 3D spherical SAR projection featuring 7 latitude parallels, 5 longitude meridian ellipses, continental landmass point-cloud constellations (Arctic/Svalbard, Eurasia/Himalayas/Bengal Delta, Americas, Equatorial archipelagos), interferometric contour loops, an inclined L-Band/S-Band radar swath corridor, geodesic telemetry arcs, and a live phenomenon telemetry pill (`CRYO // GLACIER · 38.4 m/day`).
- **Streamlined Hero CTA (`src/App.jsx`)**:
  - Removed the secondary `EXPLORE MORE` button from the hero bottom bar so the primary **`NISAR DATA ↗`** CTA stands cleanly centered on its own.

### 2. Full Redesign & Widescreen Reorganization of the `/dashboard` Explorer (`src/features/explorer/`)
- **Unified Team Zenith Aesthetic**:
  - Aligned `/dashboard` with the landing page's dark obsidian & alabaster design system (`#040406` Deep Void Black, `#08080C` Obsidian, `#F4F4F6` Alabaster White, `#E11D48` / `#FB7185` Crimson/Rose, `#8B5CF6` / `#A78BFA` Violet/Lavender; `Space Grotesk`, `Plus Jakarta Sans`, `JetBrains Mono`) with **strictly zero cyan/teal and zero gold/amber**.
- **2-Tier Command Center Layout (`ExplorerPage.jsx` & `RecordDetails.jsx`)**:
  - **Tier 1 — Primary Spatial & Temporal Stage (3-Column Grid)**:
    - **Columns 1–2 (`grid-column: span 2`, ~67% width)**: Widescreen **580px-tall 3D Terrain Globe (`GlobeViewer.jsx`)** + legend bar.
    - **Column 3 (`grid-column: span 1`, ~33% width)**: Unified **Controls (`01 // CONTROLS`) + Chronological Observation Timeline (`03 // TIMELINE`)** height-matched (`626px`) flush with the globe.
  - **Tier 2 — Full-Width 3-Column Inspection Deck (`RecordDetails.jsx`)**:
    - **`04 // SELECTED RECORD`**: Granule ID, orbital metadata, `Download HDF5`, `Copy URL`, `Pin to Supabase`, and one-click authenticated companion files (`QA Report PDF`, `QA Summary CSV`, `ISCE3 RunConfig YAML`, `ISO 19115 XML`).
    - **`05 // AUTHENTICATED NISAR SAR IMAGERY`**: Real L-band SAR browse imagery viewer with deduplicated polarization tabs, **`Draped on 3D Globe`** toggle, and full PNG download (or 561-pixel L3 `SME2` stats when inspecting Svalbard).
    - **`06 // TELEMETRY & SUPABASE CLOUD`**: Live parsed `*_QA_SUMMARY.csv` verification checks paired with the synced **Supabase Cloud `mission_watchpoints`** list.
- **High-Contrast Compact Telemetry Metric Strip (`.x-metrics`)**:
  - Reduced metric card height (`min-height: 44px`, single-line layout), formatted same-year acquisition spans compactly (`Jun 18 – Oct 4, 2026`), and boosted label contrast across the entire console.

### 3. 3D Terrain Globe & Real Radar Imagery Draping (`src/features/explorer/GlobeViewer.jsx`)
- **Cesium Ion 3D World Terrain + CARTO Basemap Integration**:
  - Configured `GlobeViewer.jsx` to use `VITE_CESIUM_ION_TOKEN` for 3D mountain/basin elevation meshes and `VITE_CARTO_API_KEY` for dark vector basemap tiles, with automatic graceful fallback to OpenStreetMap dark tiles and ellipsoid terrain if offline or restricted.
- **Real L-Band SAR Browse Image Draping on the 3D Globe**:
  - Automatically drapes the selected granule's real NASA Earthdata browse PNG (`*_BROWSE.png`) directly onto the 3D globe over its exact geographic bounding rectangle.
- **561-Pixel L3 Soil Moisture (`SME2`) EASE-Grid 2.0 Point Cloud**:
  - Parsed the local NetCDF4/HDF5 file (`resources/NISAR_L3_PR_SME2_007_165_A_019_4005_DHDH_A_20251202T172546_20251202T172623_X05007_N_P_J_001.h5`) into `src/features/explorer/sme2Data.js` and rendered all **561 valid 200m pixels** (`0.088 – 0.349 cm³/cm³`) over Svalbard (`77.52°N, 13.94°E`) on the 3D globe.
- **De-cluttered Footprint Labels**:
  - Positioned the `SELECTED` label at the northern edge of the active footprint (`bounds.north + 0.14`) and offset unselected `ASC` / `DSC` track badges to the northern/southern borders so labels never overlap in the center of the radar swath.

### 4. NASA Earthdata Login (`EARTHDATA_TOKEN`) & Serverless Cloud Proxy (`api/`)
- **Live ASF CMR Spatial Catalog Search (`api/asf-search.js`)**:
  - Proxies live queries to `https://api.daac.asf.alaska.edu/services/search/param` with the NASA Earthdata Bearer Token (`UID: abrar43`), supporting regional presets (*Bengal Delta*, *Eastern Himalayas*, *Sundarbans Coast*, *Svalbard Arctic*) and custom `Lat / Lon` coordinate searches.
- **Authenticated Earthdata Asset Streaming & Supabase CDN Caching (`api/earthdata-asset.js`)**:
  - Resolves NASA URS OAuth 302 redirects server-side using `EARTHDATA_TOKEN` to stream protected `*_BROWSE.png` radar rasters, `*_QA_SUMMARY.csv` quality logs, `*_QA_REPORT.pdf` reports, and `.h5` science granules, while caching public browse PNGs and QA CSVs into Supabase Storage (`nisar-browse-cache`).

### 5. Supabase Cloud Backend & PostGIS Spatial Database (`supabase/`)
- **PostgreSQL + PostGIS Schema (`supabase/schema.sql`)**:
  - Created `public.nisar_granules` (154 seeded footprints with `GEOGRAPHY(POLYGON, 4326)` spatial GIST index), `public.mission_watchpoints` (synced field watchpoints), and `public.asf_query_cache`.
  - Installed PostGIS in the dedicated `extensions` schema (`create extension if not exists postgis with schema extensions;`) so `spatial_ref_sys` is never exposed as `UNRESTRICTED` in the `public` schema, with Row-Level Security (RLS) enabled on all `public` tables.
- **Supabase Storage Buckets & Seed Script (`scripts/setup-supabase.mjs`)**:
  - Automated bucket provisioning (`nisar-browse-cache` and `nisar-mission-store`) and seeded 154 granules + 3 mission watchpoints into `https://cxfwogzgtwslzviecrtx.supabase.co`.

---

## 02 // How Anyone Can Use This Project

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/nabil24024004/Team-Zenith-Dancing-With-SARs.git
cd "web app"
npm install
```

### Step 2: Configure Environment Variables (`.env`)
Create a `.env` file in the project root (`web app/.env`):

```env
# 3D Terrain & Basemap Keys
VITE_CARTO_API_KEY=your_carto_api_key
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token

# NASA Earthdata Login JWT Bearer Token
EARTHDATA_TOKEN=your_nasa_earthdata_jwt_token

# Supabase Cloud Backend
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> **Note:** Even without API keys configured, the app runs out-of-the-box using the bundled 153-granule ASF catalog snapshot, the parsed 561-pixel Svalbard L3 Soil Moisture (`SME2`) dataset, OpenStreetMap dark basemap tiles, and local fallback watchpoints.

### Step 3: Initialize Supabase Database & Storage (Optional for New Supabase Projects)
1. Open your **Supabase Dashboard → SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql).
2. Seed the 154 NISAR granules, 3 default watchpoints, and create the storage buckets by running:
   ```bash
   node scripts/setup-supabase.mjs
   ```

### Step 4: Start the Development Server
```bash
npm run dev
```
- Visit **`http://localhost:5173/`** for the **Team Zenith Observatory Landing Page**.
- Visit **`http://localhost:5173/dashboard`** (or click **`Field Console`** / **`NISAR Data ↗`**) for the **3D NISAR Mission Data Explorer**.

---

## 03 // Step-by-Step Guide to Using the `/dashboard` Explorer

1. **Switch Regions or Query Live NASA ASF Data (Top Command Bar)**:
   - Click **`Local Snapshot + L3 SME2`** to explore the 153 Meghna–Brahmaputra SAR footprints + 1 Svalbard L3 Soil Moisture granule.
   - Click **`Live ASF · Bengal Delta`**, **`Live ASF · Eastern Himalayas`**, **`Live ASF · Sundarbans Coast`**, or **`Live ASF · Svalbard Arctic`** to query live NISAR granules from NASA's ASF CMR API.
   - Or enter any **`Lat (°N)`** and **`Lon (°E)`** and click **`Query ASF`**.
   - Click **`561-Pixel L3 Soil Moisture Grid`** at any time to fly the 3D camera directly to Svalbard (`77.52°N, 13.94°E`) and inspect the 200m EASE-Grid 2.0 soil moisture point cloud.
2. **Interact with the Widescreen 3D Terrain Globe (`Columns 1–2`)**:
   - **Left-click + drag** to orbit the globe; **scroll wheel** to zoom; **Ctrl/Cmd + drag** to tilt the camera and view 3D mountain relief.
   - **Click any footprint polygon** on the globe to select that NISAR granule, fly to its swath, and drape its real L-band SAR radar browse image over the terrain.
3. **Filter & Browse Chronological Acquisitions (`Column 3`)**:
   - In **`01 // CONTROLS`**, filter by **Product Type** (`GCOV`, `GUNW`, `GOFF`, `GSLC`, `RSLC`, `SME2`, etc.) or **Acquisition Window** (`Start date` / `End date`).
   - In **`03 // TIMELINE`**, scroll through matching acquisitions ordered newest-first and click any row to inspect it.
4. **Inspect Granule Metadata, SAR Imagery & Cloud Telemetry (`Bottom 3-Column Deck`)**:
   - **`04 // SELECTED RECORD`**: View orbital parameters, click **`Download HDF5`** or **`Copy URL`**, click **`Pin to Supabase`** to save the granule as a shared watchpoint, or download companion **`QA Report PDF`**, **`QA Summary CSV`**, **`ISCE3 RunConfig YAML`**, and **`ISO 19115 XML`** files.
   - **`05 // AUTHENTICATED NISAR SAR IMAGERY`**: View the real NASA Earthdata browse PNG, switch polarization channels, or toggle **`Draped on 3D Globe`**.
   - **`06 // TELEMETRY & SUPABASE CLOUD`**: Inspect live parsed quality verification checks (`PASS` / `WARN`) from the granule's `*_QA_SUMMARY.csv` and click or manage saved **Supabase Cloud Mission Watchpoints**.
