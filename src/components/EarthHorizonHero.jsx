import React from 'react';
import { motion } from 'framer-motion';

// Continental point-cloud clusters distributed across the spherical projection
const CONTINENT_CLUSTERS = [
  // Arctic & Svalbard Cap
  [215, 78, 1.4], [228, 75, 1.7], [242, 73, 1.3], [256, 74, 1.8], [270, 76, 1.4], [284, 80, 1.2],
  [196, 86, 1.3], [210, 84, 1.6], [234, 82, 1.4], [250, 81, 1.9], [266, 83, 1.5], [280, 86, 1.3], [296, 90, 1.5],
  // Eurasia / Himalayan Arc / Bengal Delta (Upper-Right & Mid-Right Hemisphere)
  [272, 98, 1.6], [286, 96, 1.8], [300, 100, 1.5], [314, 104, 1.9], [328, 110, 1.6], [342, 118, 1.4],
  [262, 110, 1.5], [278, 108, 2.0], [294, 112, 1.7], [310, 116, 2.1], [325, 122, 1.8], [340, 128, 1.5], [354, 136, 1.3],
  [284, 124, 1.6], [300, 126, 1.9], [316, 130, 2.2], [332, 136, 1.7], [348, 144, 1.6], [362, 152, 1.4], [374, 162, 1.2],
  [308, 144, 1.8], [324, 148, 1.6], [338, 154, 1.9], [352, 162, 1.5], [368, 170, 1.7], [382, 180, 1.3],
  [330, 168, 1.4], [346, 174, 1.8], [360, 184, 1.6], [374, 194, 1.4], [388, 206, 1.3],
  [350, 198, 1.5], [364, 208, 1.7], [378, 220, 1.4], [390, 232, 1.2],
  // Western Hemisphere / Americas & Atlantic Ridge (Upper-Left & Mid-Left Hemisphere)
  [184, 96, 1.5], [170, 102, 1.8], [156, 108, 1.6], [142, 116, 1.4], [128, 126, 1.7],
  [196, 108, 1.4], [180, 114, 1.9], [164, 120, 1.7], [148, 128, 1.5], [134, 138, 1.8], [120, 148, 1.4],
  [172, 132, 1.6], [156, 138, 2.0], [140, 146, 1.6], [124, 156, 1.5], [110, 168, 1.3],
  [162, 150, 1.5], [146, 158, 1.7], [130, 168, 1.8], [116, 180, 1.4], [104, 192, 1.2],
  [138, 184, 1.6], [122, 196, 1.5], [110, 210, 1.4], [98, 224, 1.3],
  [128, 218, 1.4], [116, 232, 1.6], [106, 248, 1.3], [114, 264, 1.2],
  // Equatorial & Southern Limb Archipelagos
  [136, 282, 1.4], [148, 298, 1.5], [162, 314, 1.3], [176, 330, 1.2],
  [376, 254, 1.4], [366, 272, 1.6], [354, 290, 1.5], [340, 308, 1.3], [324, 326, 1.2],
  [210, 366, 1.2], [228, 374, 1.4], [248, 378, 1.5], [268, 375, 1.4], [286, 368, 1.2],
];

// Secondary surface observation nodes across the globe
const SECONDARY_SAR_NODES = [
  { id: 'node-svalbard', cx: 246, cy: 84, label: '78.2°N · SVALBARD' },
  { id: 'node-himalaya', cx: 326, cy: 132, label: '27.9°N · HIMALAYA' },
  { id: 'node-amazon', cx: 138, cy: 186, label: '03.4°S · AMAZON' },
  { id: 'node-antarctica', cx: 256, cy: 374, label: '71.8°S · CRYO-RIM' },
];

/**
 * Rich 3D Planetary SAR Globe & NISAR Radar Horizon
 * Features full spherical graticule, continental point-clouds, interferometric
 * radar swath arcs, and orbital telemetry nodes while keeping center verse legible.
 * Strictly zero cyan and zero gold.
 */
export function EarthHorizonVisual({ activePhenomenon, mouseOffset }) {
  return (
    <div className="relative w-[265px] sm:w-[310px] lg:w-[345px] h-[225px] sm:h-[255px] lg:h-[275px] mx-auto flex items-center justify-center select-none pointer-events-none">
      {/* Multi-Layered Atmospheric Rim Halo */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.42, 0.62, 0.42],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.24), rgba(139,92,246,0.14) 48%, rgba(225,29,72,0.08) 70%, transparent 82%)',
        }}
      />

      {/* Planetary SAR Globe SVG */}
      <motion.svg
        viewBox="0 25 500 440"
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{
          x: mouseOffset.x * -12,
          y: mouseOffset.y * -12,
        }}
      >
        <defs>
          <clipPath id="planetSphereClip">
            <circle cx="250" cy="245" r="184" />
          </clipPath>

          {/* Planetary Rim Lighting Gradient (Pure Silver-White to Violet/Crimson Limb) */}
          <linearGradient id="planetRimGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.96)" />
            <stop offset="28%" stopColor="rgba(228, 228, 244, 0.52)" />
            <stop offset="62%" stopColor="rgba(167, 139, 250, 0.28)" />
            <stop offset="88%" stopColor="rgba(225, 29, 72, 0.22)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.16)" />
          </linearGradient>

          {/* 3D Spherical Surface Shading */}
          <radialGradient id="planetBodyGrad" cx="50%" cy="18%" r="78%">
            <stop offset="0%" stopColor="#2E2E3E" />
            <stop offset="26%" stopColor="#191926" />
            <stop offset="56%" stopColor="#0D0D15" />
            <stop offset="82%" stopColor="#08080E" />
            <stop offset="100%" stopColor="#12101E" />
          </radialGradient>

          {/* Atmospheric Inner Limb Glow */}
          <radialGradient id="planetLimbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="72%" stopColor="rgba(139, 92, 246, 0)" />
            <stop offset="91%" stopColor="rgba(167, 139, 250, 0.12)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.24)" />
          </radialGradient>

          {/* Graticule Stroke Gradient Across Full Sphere */}
          <linearGradient id="graticuleGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.48)" />
            <stop offset="40%" stopColor="rgba(196, 181, 253, 0.24)" />
            <stop offset="75%" stopColor="rgba(251, 113, 133, 0.16)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.22)" />
          </linearGradient>

          {/* Active SAR Swath Corridor Gradient */}
          <linearGradient id="sarSwathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(225, 29, 72, 0.0)" />
            <stop offset="35%" stopColor="rgba(225, 29, 72, 0.22)" />
            <stop offset="65%" stopColor="rgba(139, 92, 246, 0.24)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.0)" />
          </linearGradient>

          {/* Center Readability Vignette for Poetic Typography */}
          <radialGradient id="textReadabilityMask" cx="50%" cy="60%" r="42%">
            <stop offset="0%" stopColor="rgba(4, 4, 6, 0.76)" />
            <stop offset="65%" stopColor="rgba(4, 4, 6, 0.42)" />
            <stop offset="100%" stopColor="rgba(4, 4, 6, 0)" />
          </radialGradient>
        </defs>

        {/* Outer Dashed Polar Orbit Ring */}
        <motion.circle
          cx="250"
          cy="245"
          r="210"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          strokeDasharray="3 7"
          animate={{ rotate: 360 }}
          transition={{ duration: 95, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '250px 245px' }}
        />

        {/* Secondary Inclined Telemetry Ring */}
        <motion.ellipse
          cx="250"
          cy="245"
          rx="222"
          ry="84"
          fill="none"
          stroke="rgba(167, 139, 250, 0.16)"
          strokeWidth="0.9"
          strokeDasharray="6 10"
          transform="rotate(-24 250 245)"
        />

        {/* Degree Tick Marks Around Outer Orbital Compass */}
        <g stroke="rgba(255,255,255,0.22)" strokeWidth="1">
          <line x1="250" y1="28" x2="250" y2="36" />
          <line x1="250" y1="454" x2="250" y2="462" />
          <line x1="34" y1="245" x2="42" y2="245" />
          <line x1="458" y1="245" x2="466" y2="245" />
        </g>

        {/* Core Planetary Sphere */}
        <circle cx="250" cy="245" r="184" fill="url(#planetBodyGrad)" />

        {/* Clipped Interior Spherical Features (Graticule, Continents, SAR Swaths) */}
        <g clipPath="url(#planetSphereClip)">
          {/* Illuminated SAR Swath Band Sweeping Diagonally Across the Globe */}
          <path
            d="M 85 110 Q 250 185 425 310 L 395 352 Q 230 225 60 148 Z"
            fill="url(#sarSwathGrad)"
          />
          <path
            d="M 110 345 Q 255 215 395 95"
            fill="none"
            stroke="rgba(167, 139, 250, 0.22)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />

          {/* Full Spherical 3D Latitude Parallels */}
          <g stroke="url(#graticuleGrad)" fill="none" strokeWidth="0.85">
            {/* Arctic & Northern Parallels */}
            <path d="M 132 104 Q 250 68 368 104" />
            <path d="M 90 146 Q 250 96 410 146" />
            <path d="M 68 194 Q 250 142 432 194" />
            {/* Equatorial Line */}
            <path
              d="M 64 245 Q 250 206 436 245"
              stroke="rgba(255,255,255,0.24)"
              strokeDasharray="2 5"
            />
            {/* Southern Parallels */}
            <path d="M 72 298 Q 250 338 428 298" />
            <path d="M 96 348 Q 250 388 404 348" />
            <path d="M 140 390 Q 250 418 360 390" />

            {/* Full Spherical 3D Longitude Meridians */}
            <ellipse cx="250" cy="245" rx="38" ry="184" />
            <ellipse cx="250" cy="245" rx="84" ry="184" />
            <ellipse cx="250" cy="245" rx="130" ry="184" />
            <ellipse cx="250" cy="245" rx="164" ry="184" />
            <line
              x1="250"
              y1="61"
              x2="250"
              y2="429"
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="2 6"
            />
          </g>

          {/* Subtle Interferometric Topographic Contour Loops on Upper & Eastern Sphere */}
          <g fill="none" stroke="rgba(196, 181, 253, 0.18)" strokeWidth="0.8">
            <ellipse
              cx="326"
              cy="134"
              rx="36"
              ry="16"
              transform="rotate(22 326 134)"
            />
            <ellipse
              cx="326"
              cy="134"
              rx="22"
              ry="9"
              transform="rotate(22 326 134)"
              stroke="rgba(251, 113, 133, 0.25)"
            />
            <ellipse
              cx="152"
              cy="142"
              rx="32"
              ry="14"
              transform="rotate(-24 152 142)"
            />
            <ellipse
              cx="152"
              cy="142"
              rx="18"
              ry="7"
              transform="rotate(-24 152 142)"
            />
          </g>

          {/* Continental Landmass Point-Cloud Matrix */}
          <g>
            {CONTINENT_CLUSTERS.map(([cx, cy, r], idx) => (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={r}
                fill={
                  idx % 7 === 0
                    ? 'rgba(251, 113, 133, 0.72)'
                    : idx % 4 === 0
                      ? 'rgba(196, 181, 253, 0.68)'
                      : 'rgba(255, 255, 255, 0.52)'
                }
              />
            ))}
          </g>

          {/* Geodesic Telemetry Arcs Connecting Active Phenomenon to Global Nodes */}
          <g
            fill="none"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="0.9"
            strokeDasharray="2 4"
          >
            {SECONDARY_SAR_NODES.map((node) => (
              <path
                key={node.id}
                d={`M ${activePhenomenon.cx} ${activePhenomenon.cy - 6} Q 250 155 ${node.cx} ${node.cy}`}
              />
            ))}
          </g>

          {/* Secondary Global SAR Telemetry Nodes */}
          {SECONDARY_SAR_NODES.map((node, i) => (
            <g key={node.id}>
              <circle
                cx={node.cx}
                cy={node.cy}
                r="4.5"
                fill="none"
                stroke={
                  i % 2 === 0
                    ? 'rgba(167, 139, 250, 0.5)'
                    : 'rgba(251, 113, 133, 0.5)'
                }
                strokeWidth="0.9"
              />
              <circle
                cx={node.cx}
                cy={node.cy}
                r="1.8"
                fill="rgba(255, 255, 255, 0.85)"
              />
            </g>
          ))}

          {/* Soft Center Vignette so Foreground Poetic Verse Stays Crisp */}
          <circle cx="250" cy="255" r="145" fill="url(#textReadabilityMask)" />

          {/* Inner Atmospheric Limb Glow */}
          <circle cx="250" cy="245" r="184" fill="url(#planetLimbGlow)" />
        </g>

        {/* Active Phenomenon Interferometric SAR Phase Rings */}
        {[0, 1, 2].map((ringIdx) => (
          <motion.ellipse
            key={`${activePhenomenon.id}-${ringIdx}`}
            cx={activePhenomenon.cx}
            cy={activePhenomenon.cy - 6}
            rx="16"
            ry="8"
            fill="none"
            stroke={
              ringIdx === 0
                ? 'rgba(255,255,255,0.88)'
                : ringIdx === 1
                  ? 'rgba(225,29,72,0.75)'
                  : 'rgba(167,139,250,0.65)'
            }
            strokeWidth="1.2"
            initial={{ scale: 0.35, opacity: 0.9 }}
            animate={{ scale: 2.6 + ringIdx * 0.65, opacity: 0 }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              delay: ringIdx * 1.05,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Active Phenomenon Target Reticle & Beacon */}
        <motion.g
          animate={{
            x: activePhenomenon.cx - 250,
            y: activePhenomenon.cy - 6 - 90,
          }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        >
          <circle
            cx="250"
            cy="90"
            r="9"
            fill="rgba(225, 29, 72, 0.18)"
            stroke="rgba(251, 113, 133, 0.65)"
            strokeWidth="1"
          />
          <circle cx="250" cy="90" r="3.4" fill="#FFFFFF" />
        </motion.g>

        {/* Glowing Full-Circumference Atmospheric Rim */}
        <circle
          cx="250"
          cy="245"
          r="184"
          fill="none"
          stroke="url(#planetRimGrad)"
          strokeWidth="2.2"
        />
      </motion.svg>

      {/* Foreground Vertical Poetic Verse + Subtle Active Phenomenon Telemetry Tag */}
      <motion.div
        style={{
          x: mouseOffset.x * 6,
          y: mouseOffset.y * 6,
        }}
        className="relative z-10 mt-10 flex flex-col items-start text-left px-4 py-2.5 rounded-2xl"
      >
        <div className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.12]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185] animate-pulse" />
          <span className="font-mono text-[8px] tracking-[0.18em] uppercase text-white/85">
            {activePhenomenon.code || 'SAR TRACKING'} · {activePhenomenon.metric || '12D ORBIT'}
          </span>
        </div>
        {[
          'Earth’s surface',
          'is an endless',
          'waltz of',
          'natural forces',
          'and human',
          'motion.',
        ].map((line, i) => (
          <motion.span
            key={line}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 + i * 0.06 }}
            className={`font-sans text-[13px] sm:text-sm leading-snug tracking-wide ${
              i === 2 || i === 5
                ? 'text-white font-medium'
                : 'text-white/65 font-light'
            }`}
          >
            {line}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
