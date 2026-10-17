import React from 'react';
import { motion } from 'framer-motion';

// High-density continental landmass point clusters & coastlines
const CONTINENT_CLUSTERS = [
  // Arctic & Greenland Ice Cap
  [225, 105, 1.6], [240, 100, 1.8], [255, 98, 1.5], [270, 102, 1.7], [285, 108, 1.4],
  [210, 118, 1.4], [230, 114, 2.0], [250, 110, 1.6], [268, 112, 1.9], [288, 118, 1.5],

  // Eurasia, Himalayan Ridge, and Tibetan Plateau (Mid-to-Upper Right)
  [280, 132, 1.8], [298, 128, 2.1], [316, 134, 1.9], [334, 142, 1.6], [352, 154, 1.4],
  [270, 146, 1.6], [290, 142, 2.3], [310, 148, 2.4], [330, 156, 2.0], [348, 168, 1.7], [365, 180, 1.5],
  [282, 162, 1.9], [302, 164, 2.2], [322, 172, 2.5], [342, 182, 2.0], [360, 196, 1.6],
  [295, 180, 1.7], [315, 186, 2.1], [335, 196, 2.2], [352, 210, 1.8], [370, 224, 1.5],

  // Bengal Delta, Southeast Asia, & Indo-Pacific (East / Center-Right)
  [318, 204, 2.0], [336, 216, 2.3], [354, 230, 1.9], [372, 246, 1.6],
  [328, 226, 1.8], [346, 240, 2.1], [364, 256, 1.7], [380, 274, 1.4],
  [335, 252, 1.6], [352, 268, 1.9], [368, 286, 1.5], [350, 298, 1.4], [334, 314, 1.3],

  // Americas & Western Continental Arc (Mid-to-Upper Left)
  [185, 128, 1.7], [168, 136, 1.9], [152, 148, 1.6], [138, 162, 1.5], [125, 178, 1.4],
  [196, 142, 1.6], [178, 150, 2.1], [162, 162, 1.8], [146, 176, 1.7], [132, 192, 1.5], [118, 208, 1.3],
  [182, 166, 1.8], [165, 178, 2.2], [148, 192, 1.9], [134, 210, 1.6], [120, 228, 1.4],
  [170, 194, 1.7], [154, 210, 2.0], [140, 228, 1.8], [126, 248, 1.5],
  [158, 232, 1.6], [144, 252, 1.8], [132, 272, 1.5], [122, 292, 1.3],

  // African Landmass & Atlantic Margins (Center / Lower-Center)
  [210, 180, 1.9], [228, 174, 2.2], [248, 182, 2.0], [266, 194, 1.8],
  [202, 202, 1.7], [220, 198, 2.4], [240, 206, 2.3], [258, 218, 2.0], [276, 232, 1.7],
  [208, 226, 1.9], [226, 222, 2.5], [246, 230, 2.2], [264, 244, 1.9],
  [218, 250, 1.8], [236, 248, 2.3], [254, 258, 2.0], [270, 272, 1.7],
  [226, 276, 1.7], [244, 278, 2.1], [260, 292, 1.8], [248, 310, 1.5],

  // Southern Polar Arc
  [220, 362, 1.4], [238, 368, 1.6], [258, 370, 1.8], [278, 366, 1.5], [296, 358, 1.3],
];

export function EarthHorizonVisual({ activePhenomenon, mouseOffset = { x: 0, y: 0 } }) {
  return (
    <div className="relative w-[300px] sm:w-[380px] lg:w-[440px] xl:w-[480px] h-[300px] sm:h-[380px] lg:h-[440px] xl:h-[480px] mx-auto flex items-center justify-center select-none pointer-events-none">
      {/* Ambient Red & Indigo Atmospheric Glow */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.55, 0.75, 0.55],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full blur-[80px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(225,29,72,0.22) 0%, rgba(37,99,235,0.22) 42%, rgba(139,92,246,0.12) 65%, transparent 78%)',
        }}
      />

      {/* Planetary 3D SAR SVG Globe */}
      <motion.svg
        viewBox="0 0 500 500"
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{
          x: mouseOffset.x * -10,
          y: mouseOffset.y * -10,
        }}
      >
        <defs>
          <clipPath id="heroPlanetSphereClip">
            <circle cx="250" cy="250" r="176" />
          </clipPath>

          {/* Deep Ocean Photorealistic Spherical Base Gradient */}
          <radialGradient id="oceanSphereGrad" cx="44%" cy="32%" r="76%">
            <stop offset="0%" stopColor="#1E447E" />
            <stop offset="24%" stopColor="#122A54" />
            <stop offset="54%" stopColor="#0A1832" />
            <stop offset="78%" stopColor="#050E1E" />
            <stop offset="100%" stopColor="#02060E" />
          </radialGradient>

          {/* Atmospheric Rim Gradient with Electric Blue / Ice Accent */}
          <radialGradient id="atmosphericRimGrad" cx="50%" cy="50%" r="50%">
            <stop offset="74%" stopColor="rgba(56, 189, 248, 0)" />
            <stop offset="88%" stopColor="rgba(56, 189, 248, 0.18)" />
            <stop offset="96%" stopColor="rgba(96, 165, 250, 0.45)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.85)" />
          </radialGradient>

          {/* High-Contrast Luminous Circumference Gradient */}
          <linearGradient id="circumferenceGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
            <stop offset="28%" stopColor="rgba(96, 165, 250, 0.8)" />
            <stop offset="65%" stopColor="rgba(147, 197, 253, 0.4)" />
            <stop offset="85%" stopColor="rgba(225, 29, 72, 0.4)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.2)" />
          </linearGradient>

          {/* SAR Range/Azimuth Swath Radar Fill Pattern */}
          <pattern id="sarRadarGridPattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(251, 113, 133, 0.45)" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="12" y2="0" stroke="rgba(251, 113, 133, 0.45)" strokeWidth="0.8" />
          </pattern>

          {/* Diagonal SAR Corridor Background Gradient */}
          <linearGradient id="sarCorridorBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(225, 29, 72, 0.0)" />
            <stop offset="25%" stopColor="rgba(225, 29, 72, 0.28)" />
            <stop offset="75%" stopColor="rgba(225, 29, 72, 0.35)" />
            <stop offset="100%" stopColor="rgba(225, 29, 72, 0.05)" />
          </linearGradient>
        </defs>

        {/* ================= 3D INCLINED ORBITAL TRACKS & SATELLITE NODES ================= */}
        {/* Orbital Track 1 (Inclined -24°) */}
        <motion.ellipse
          cx="250"
          cy="250"
          rx="275"
          ry="110"
          transform="rotate(-24 250 250)"
          fill="none"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="1"
          strokeDasharray="4 7"
        />

        {/* Orbital Track 2 (Inclined +34°) */}
        <motion.ellipse
          cx="250"
          cy="250"
          rx="265"
          ry="96"
          transform="rotate(34 250 250)"
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="0.9"
          strokeDasharray="3 6"
        />

        {/* Orbital Track 3 (Subtle Equatorial -6°) */}
        <motion.ellipse
          cx="250"
          cy="250"
          rx="282"
          ry="84"
          transform="rotate(-6 250 250)"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="0.8"
          strokeDasharray="2 5"
        />

        {/* Orbiting Satellite Telemetry Beacons (Matching Exact Design Placement) */}
        {[
          { x: 55, y: 198, r: 2.2 },
          { x: 172, y: 122, r: 2.0 },
          { x: 345, y: 112, r: 2.5 },
          { x: 438, y: 198, r: 2.2 },
          { x: 472, y: 254, r: 2.4 },
          { x: 424, y: 326, r: 2.3 },
          { x: 265, y: 394, r: 2.1 },
          { x: 135, y: 366, r: 2.4 },
        ].map((node, i) => (
          <g key={i} transform={`translate(${node.x}, ${node.y})`}>
            <circle cx="0" cy="0" r={node.r * 2.2} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.8" />
            <circle cx="0" cy="0" r={node.r} fill="#FFFFFF" />
          </g>
        ))}

        {/* ================= CORE EARTH SPHERE & TEXTURED FEATURES ================= */}
        {/* Photorealistic Ocean Base */}
        <circle cx="250" cy="250" r="176" fill="url(#oceanSphereGrad)" />

        {/* Clipped Globe Interior Features */}
        <g clipPath="url(#heroPlanetSphereClip)">
          {/* Subtle Latitude Graticule */}
          <g fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8">
            <ellipse cx="250" cy="170" rx="146" ry="34" />
            <ellipse cx="250" cy="215" rx="170" ry="38" />
            <ellipse cx="250" cy="265" rx="172" ry="38" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 4" />
            <ellipse cx="250" cy="315" rx="155" ry="34" />
            <ellipse cx="250" cy="360" rx="122" ry="26" />

            {/* Longitude Meridians */}
            <ellipse cx="250" cy="250" rx="48" ry="176" />
            <ellipse cx="250" cy="250" rx="98" ry="176" />
            <ellipse cx="250" cy="250" rx="142" ry="176" />
          </g>

          {/* Continents & Landmass Point Matrix */}
          <g>
            {CONTINENT_CLUSTERS.map(([cx, cy, r], idx) => (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={r}
                fill={
                  idx % 8 === 0
                    ? 'rgba(255, 255, 255, 0.85)'
                    : idx % 3 === 0
                      ? 'rgba(165, 180, 252, 0.72)'
                      : 'rgba(96, 165, 250, 0.55)'
                }
              />
            ))}
          </g>

          {/* Swirling Atmospheric Cloud Bands */}
          <g fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeLinecap="round">
            <path d="M 120 160 Q 220 120 320 140 Q 380 150 410 170" strokeWidth="8" opacity="0.45" />
            <path d="M 90 220 Q 180 190 280 200 Q 360 210 400 230" strokeWidth="6" opacity="0.38" />
            <path d="M 140 290 Q 240 260 340 300 Q 380 320 400 340" strokeWidth="10" opacity="0.42" />
            <path d="M 180 340 Q 250 325 330 350" strokeWidth="7" opacity="0.3" />
          </g>

          {/* ================= DIAGONAL RED SAR RADAR SWATH CORRIDOR ================= */}
          {/* Swath Translucent Background Polygon */}
          <path
            d="M 195 110 L 400 280 L 365 320 L 160 150 Z"
            fill="url(#sarCorridorBg)"
          />

          {/* Radar Azimuth/Range Grid Texture inside the Swath */}
          <path
            d="M 195 110 L 400 280 L 365 320 L 160 150 Z"
            fill="url(#sarRadarGridPattern)"
          />

          {/* Swath Glowing Radar Edge Lines */}
          <line
            x1="195"
            y1="110"
            x2="400"
            y2="280"
            stroke="rgba(251, 113, 133, 0.8)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <line
            x1="160"
            y1="150"
            x2="365"
            y2="320"
            stroke="rgba(251, 113, 133, 0.8)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />

          {/* Inner Atmospheric Rim Glow */}
          <circle cx="250" cy="250" r="176" fill="url(#atmosphericRimGrad)" />
        </g>

        {/* ================= TWO GLOWING RED RADAR TARGET RETICLES ================= */}
        {/* Target 1: Northern / Asian Himalayan Radar Target (Upper Right) */}
        <g transform="translate(348, 172)">
          {/* Outer Pulsing Radar Ring */}
          <motion.circle
            cx="0"
            cy="0"
            r="16"
            fill="rgba(225, 29, 72, 0.12)"
            stroke="#E11D48"
            strokeWidth="1.2"
            animate={{ scale: [1, 1.45, 1], opacity: [0.85, 0.25, 0.85] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Concentric Middle Ring */}
          <circle cx="0" cy="0" r="9" fill="none" stroke="#FB7185" strokeWidth="1" />
          {/* Core Target Dot */}
          <circle cx="0" cy="0" r="3.2" fill="#E11D48" />
          {/* Crosshair Ticks */}
          <line x1="-12" y1="0" x2="-6" y2="0" stroke="#FB7185" strokeWidth="1" />
          <line x1="6" y1="0" x2="12" y2="0" stroke="#FB7185" strokeWidth="1" />
          <line x1="0" y1="-12" x2="0" y2="-6" stroke="#FB7185" strokeWidth="1" />
          <line x1="0" y1="6" x2="0" y2="12" stroke="#FB7185" strokeWidth="1" />
        </g>

        {/* Target 2: Southern Oceanic / Coastal Radar Target (Lower Left) */}
        <g transform="translate(222, 344)">
          {/* Outer Pulsing Radar Ring */}
          <motion.circle
            cx="0"
            cy="0"
            r="14"
            fill="rgba(225, 29, 72, 0.12)"
            stroke="#E11D48"
            strokeWidth="1.2"
            animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 3.2, repeat: Infinity, delay: 0.8, ease: 'easeInOut' }}
          />
          {/* Concentric Middle Ring */}
          <circle cx="0" cy="0" r="8" fill="none" stroke="#FB7185" strokeWidth="1" />
          {/* Core Target Dot */}
          <circle cx="0" cy="0" r="2.8" fill="#E11D48" />
        </g>

        {/* Full Luminous Circumference Atmospheric Rim */}
        <circle
          cx="250"
          cy="250"
          r="176"
          fill="none"
          stroke="url(#circumferenceGrad)"
          strokeWidth="2.2"
        />
      </motion.svg>
    </div>
  );
}
