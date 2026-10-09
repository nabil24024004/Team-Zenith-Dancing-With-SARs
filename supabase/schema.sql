-- Team Zenith · NASA Space Apps 2026
-- Supabase PostGIS Schema (Installs PostGIS into the `extensions` schema
-- so `spatial_ref_sys` does not appear as UNRESTRICTED in `public`)

create schema if not exists extensions;
drop table if exists public.nisar_granules cascade;
drop extension if exists postgis cascade;
create extension if not exists postgis with schema extensions;

create table if not exists public.nisar_granules (
  granule_id text primary key,
  product_type text not null,
  processing_type text,
  start_time timestamptz,
  stop_time timestamptz,
  flight_direction text,
  path_number integer,
  frame_number integer,
  footprint extensions.geometry(Geometry, 4326),
  browse_urls jsonb default '[]'::jsonb,
  additional_urls jsonb default '[]'::jsonb,
  qa_summary jsonb default '[]'::jsonb,
  raw_metadata jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.mission_watchpoints (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  latitude double precision not null,
  longitude double precision not null,
  pinned_granule_id text,
  product_type text,
  status text default 'ACTIVE WATCHPOINT',
  notes text,
  created_at timestamptz default now()
);

alter table public.nisar_granules enable row level security;
drop policy if exists "Public read nisar_granules" on public.nisar_granules;
create policy "Public read nisar_granules" on public.nisar_granules for select using (true);

alter table public.mission_watchpoints enable row level security;
drop policy if exists "Public read watchpoints" on public.mission_watchpoints;
create policy "Public read watchpoints" on public.mission_watchpoints for select using (true);
drop policy if exists "Public insert watchpoints" on public.mission_watchpoints;
create policy "Public insert watchpoints" on public.mission_watchpoints for insert with check (true);
drop policy if exists "Public delete watchpoints" on public.mission_watchpoints;
create policy "Public delete watchpoints" on public.mission_watchpoints for delete using (true);
