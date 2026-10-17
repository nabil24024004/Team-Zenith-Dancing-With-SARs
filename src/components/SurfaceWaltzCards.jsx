import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Flame,
  Mountain,
  Radar,
  Sprout,
  Waves,
} from 'lucide-react';
import {
  FrostedCard,
  DotGridMark,
  DiamondCrosshair,
  GlassButton,
} from './ZenithElements';

export const WALTZ_PHENOMENA = [
  {
    id: 'glacier',
    index: '01',
    code: 'CRYO // GLACIER',
    title: 'Glacier Movement',
    shortTitle: 'GLACIER MOTION',
    subtitle: 'Polar Ice Streams & Grounding Lines',
    band: 'L-BAND 24 CM',
    location: 'Jakobshavn Isbræ · 69.16° N',
    metric: '38.4 m/day',
    metricDesc: 'Ice-Stream Velocity',
    cx: 215,
    cy: 98,
    description:
      'Penetrating polar darkness and winter cloud cover to trace sub-surface ice flow, calving fronts, and grounding-line retreat.',
    icon: Mountain,
  },
  {
    id: 'earthquake',
    index: '02',
    code: 'TECT // SEISMIC',
    title: 'Earthquakes',
    shortTitle: 'CRUSTAL SLIP',
    subtitle: 'Fault Rupture & Millimeter Strain',
    band: 'L-BAND InSAR',
    location: 'Anatolian Fault · 37.22° N',
    metric: '±14.2 cm',
    metricDesc: 'Line-of-Sight Shift',
    cx: 272,
    cy: 112,
    description:
      'Visualizing millimeter-scale crustal deformation and interferometric phase fringes across vegetated fault zones before and after seismic events.',
    icon: Activity,
  },
  {
    id: 'wildfire',
    index: '03',
    code: 'PYRO // CANOPY',
    title: 'Forest Wildfires',
    shortTitle: 'WILDFIRE SCARS',
    subtitle: 'Through Smoke Plumes to Canopy Loss',
    band: 'L + S DUAL BAND',
    location: 'Boreal & Amazonia · 11.45° S',
    metric: '-6.8 dB',
    metricDesc: 'HV Canopy Backscatter',
    cx: 185,
    cy: 126,
    description:
      'Seeing directly through dense smoke plumes to quantify structural woody biomass loss and post-fire soil vulnerability.',
    icon: Flame,
  },
  {
    id: 'wetland',
    index: '04',
    code: 'HYDR // WETLAND',
    title: 'Wetland Loss',
    shortTitle: 'WETLAND PULSE',
    subtitle: 'Sub-Canopy Inundation & Subsidence',
    band: 'L-BAND HH/VV',
    location: 'Sundarbans Delta · 21.94° N',
    metric: '-18.5 mm/yr',
    metricDesc: 'Deltaic Subsidence',
    cx: 298,
    cy: 124,
    description:
      'Tracking water-level fluctuations beneath dense mangrove canopies via double-bounce radar reflections and coastal subsidence mapping.',
    icon: Waves,
  },
  {
    id: 'farming',
    index: '05',
    code: 'AGRI // MOSAIC',
    title: 'Farming Activities',
    shortTitle: 'CROP RHYTHMS',
    subtitle: 'Phenology, Tillage & Soil Moisture',
    band: 'S-BAND 10 CM',
    location: 'Indo-Gangetic Plain · 30.90° N',
    metric: '12-Day Cycle',
    metricDesc: 'Repeat-Pass Cadence',
    cx: 250,
    cy: 105,
    description:
      'Capturing the seasonal choreography of crop growth, irrigation moisture, and harvest cycles with dual-frequency polarimetric radar.',
    icon: Sprout,
  },
  {
    id: 'radar',
    index: '06',
    code: 'INST // DUAL-BAND',
    title: 'All-Weather Vision',
    shortTitle: 'SWEEP SAR',
    subtitle: 'L & S Dual-Band Synthetic Aperture Radar',
    band: 'L+S DUAL BAND',
    location: 'Global Orbit · 747 km Alt',
    metric: '240 km',
    metricDesc: 'Swath Width / 12-Day',
    cx: 200,
    cy: 80,
    description:
      'Penetrating persistent clouds, volcanic ash, and polar night with dual-frequency microwave pulses to map millimeter-scale displacements.',
    icon: Radar,
  },
];

/**
 * Minimalist Custom Animated Radar Artwork per Surface Change Card
 * Strictly Monochrome White/Silver + Soft Violet/Rose Accents (No Cyan, No Gold)
 */
function PhenomenonRadarGraphic({ id, isActive }) {
  return (
    <div className="relative w-full h-36 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden flex items-center justify-center">
      {/* Subtle Dot Grid Backdrop */}
      <div className="absolute inset-0 bg-dot-matrix opacity-35" />

      <svg
        viewBox="0 0 260 110"
        className="relative z-10 w-full h-full"
        fill="none"
      >
        {id === 'glacier' && (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <motion.path
                key={i}
                d={`M 20 ${28 + i * 18} C 85 ${12 + i * 18}, 165 ${44 + i * 18}, 240 ${22 + i * 18}`}
                stroke={i === 1 ? '#FFFFFF' : 'rgba(255,255,255,0.28)'}
                strokeWidth={i === 1 ? '1.6' : '1'}
                strokeDasharray={i % 2 === 0 ? '4 4' : undefined}
                initial={{ pathLength: 0.3, opacity: 0.5 }}
                animate={{
                  pathLength: [0.6, 1, 0.6],
                  opacity: isActive ? [0.6, 1, 0.6] : 0.65,
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            <circle cx="155" cy="48" r="4" fill="#FFFFFF" />
            <circle
              cx="155"
              cy="48"
              r="14"
              stroke="rgba(244,63,94,0.65)"
              strokeWidth="1"
            />
          </g>
        )}

        {id === 'earthquake' && (
          <g>
            {[16, 30, 46, 64].map((r, i) => (
              <motion.ellipse
                key={i}
                cx="130"
                cy="55"
                rx={r * 1.4}
                ry={r * 0.68}
                stroke={
                  i === 0
                    ? '#F43F5E'
                    : i === 1
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.25)'
                }
                strokeWidth="1.2"
                animate={{
                  scale: [1, 1.08, 1],
                  opacity: [0.45, 0.9, 0.45],
                }}
                transition={{
                  duration: 3.2,
                  delay: i * 0.35,
                  repeat: Infinity,
                }}
              />
            ))}
            {/* Fault Line */}
            <line
              x1="45"
              y1="92"
              x2="215"
              y2="18"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          </g>
        )}

        {id === 'wildfire' && (
          <g>
            {Array.from({ length: 16 }).map((_, i) => {
              const h = 18 + ((i * 19) % 54);
              const x = 32 + i * 13;
              return (
                <motion.line
                  key={i}
                  x1={x}
                  y1={92}
                  x2={x}
                  y2={92 - h}
                  stroke={
                    i > 5 && i < 11
                      ? 'rgba(244,63,94,0.85)'
                      : 'rgba(255,255,255,0.35)'
                  }
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{
                    y2: [92 - h, 92 - h * 0.7, 92 - h],
                  }}
                  transition={{
                    duration: 2.5 + (i % 3),
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              );
            })}
          </g>
        )}

        {id === 'wetland' && (
          <g>
            {[0, 1, 2].map((i) => (
              <motion.path
                key={i}
                d={`M 15 ${40 + i * 16} Q 75 ${20 + i * 16}, 130 ${40 + i * 16} T 245 ${40 + i * 16}`}
                stroke={
                  i === 1 ? 'rgba(167,139,250,0.85)' : 'rgba(255,255,255,0.35)'
                }
                strokeWidth="1.3"
                animate={{
                  y: [0, -4, 0],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            <circle cx="130" cy="56" r="3.5" fill="#FFFFFF" />
          </g>
        )}

        {id === 'farming' && (
          <g>
            {Array.from({ length: 18 }).map((_, idx) => {
              const col = idx % 6;
              const row = Math.floor(idx / 6);
              const highlight = idx === 4 || idx === 7 || idx === 13;
              return (
                <rect
                  key={idx}
                  x={46 + col * 29}
                  y={20 + row * 24}
                  width="23"
                  height="18"
                  rx="2.5"
                  fill={
                    highlight
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(255,255,255,0.05)'
                  }
                  stroke={
                    highlight
                      ? 'rgba(255,255,255,0.75)'
                      : 'rgba(255,255,255,0.16)'
                  }
                  strokeWidth="1"
                />
              );
            })}
          </g>
        )}

        {id === 'radar' && (
          <g>
            <motion.path
              d="M 10 55 Q 65 15, 130 55 T 250 55"
              stroke="#FFFFFF"
              strokeWidth="2"
              animate={{
                d: [
                  'M 10 55 Q 65 15, 130 55 T 250 55',
                  'M 10 55 Q 65 95, 130 55 T 250 55',
                  'M 10 55 Q 65 15, 130 55 T 250 55',
                ],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path
              d="M 10 55 Q 35 30, 70 55 T 130 55 T 190 55 T 250 55"
              stroke="rgba(251,113,133,0.85)"
              strokeWidth="1.4"
            />
            <line x1="130" y1="15" x2="130" y2="95" stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
          </g>
        )}
      </svg>

      {/* Top-Right Band Tag */}
      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 font-mono text-[9px] tracking-[0.18em] text-white/75">
        {id === 'farming' ? 'S-BAND' : id === 'wildfire' || id === 'radar' ? 'L+S BAND' : 'L-BAND'}
      </span>
    </div>
  );
}

export function SurfaceWaltzSection({
  activePhenomenon,
  onSelectPhenomenon,
  onScrollToNisar,
}) {
  return (
    <section
      id="waltz"
      className="relative py-14 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto"
    >
      {/* Section Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3 font-mono text-xs tracking-wider uppercase text-white/65 mb-3">
            <span>02 // EARTH OBSERVATIONS</span>
            <span className="w-8 h-px bg-white/20" />
            <span>SURFACE CHANGE CHOREOGRAPHY</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-light tracking-tight text-white">
            Six Perspectives on a{' '}
            <span className="font-semibold">Dynamic Planet.</span>
          </h2>
        </div>

        <p className="max-w-lg text-[13.5px] sm:text-[14px] text-white/75 font-light leading-relaxed">
          Five global surface processes and human activities paired with NISAR’s all-weather dual-frequency radar capability. Select any card below to focus the orbital horizon on its signature.
        </p>
      </div>

      {/* Frosted Glass Bento Grid (All 6 Unified) */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {WALTZ_PHENOMENA.map((item, idx) => {
          const Icon = item.icon;
          const isSelected = activePhenomenon.id === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
            >
              <FrostedCard
                onClick={() => {
                  onSelectPhenomenon(item);
                  if (item.id === 'radar' && onScrollToNisar) {
                    onScrollToNisar();
                  }
                }}
                className={`p-6 sm:p-7 cursor-pointer flex flex-col justify-between h-full transition-all ${
                  isSelected
                    ? 'ring-1 ring-[#FB7185]/60 bg-white/[0.08] shadow-[0_12px_36px_rgba(225,29,72,0.18)]'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                <div>
                  {/* Card Top Meta Row */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-white/60">
                        {item.index}
                      </span>
                      <span className="w-4 h-px bg-white/30" />
                      <span className="font-mono text-xs tracking-wider uppercase text-white/80 font-medium">
                        {item.code}
                      </span>
                    </div>
                    <DotGridMark />
                  </div>

                  {/* Minimalist Radar Graphic */}
                  <PhenomenonRadarGraphic
                    id={item.id}
                    isActive={isSelected}
                  />

                  {/* Title & Subtitle */}
                  <div className="mt-6 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-white tracking-tight group-hover:text-white transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs font-mono text-white/70 mt-1 font-medium">
                        {item.location}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full frosted-glass-pill flex items-center justify-center text-white/85 group-hover:text-white group-hover:scale-105 transition-all">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Editorial Description (WCAG 2.1 AA 14px compliant) */}
                  <p className="mt-4 text-[13.5px] sm:text-[14px] text-white/80 font-normal leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Card Bottom Telemetry Footer */}
                <div className="mt-7 pt-4 border-t border-white/[0.08]">
                  <span className="block font-mono text-[10px] tracking-wider uppercase text-white/60 font-medium">
                    {item.metricDesc}
                  </span>
                  <span className="font-mono text-base font-semibold text-white">
                    {item.metric}
                  </span>
                </div>
              </FrostedCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
