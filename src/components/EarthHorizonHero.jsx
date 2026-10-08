import React from 'react';
import { motion } from 'framer-motion';

/**
 * Minimalist Atmospheric Earth Crescent & NISAR Radar Horizon
 * Clean, spacious, and uncluttered — inspired directly by "Learn by Exploring."
 * Strictly zero cyan and zero gold.
 */
export function EarthHorizonVisual({ activePhenomenon, mouseOffset }) {
  return (
    <div className="relative w-[250px] sm:w-[295px] lg:w-[325px] h-[205px] sm:h-[235px] lg:h-[250px] mx-auto flex items-center justify-center select-none pointer-events-none">
      {/* Soft Atmospheric Rim Halo */}
      <motion.div
        animate={{
          scale: [1, 1.04, 1],
          opacity: [0.3, 0.45, 0.3],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-4 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.20), rgba(139,92,246,0.08) 45%, transparent 75%)',
        }}
      />

      {/* Planetary Crescent SVG */}
      <motion.svg
        viewBox="0 25 500 430"
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{
          x: mouseOffset.x * -12,
          y: mouseOffset.y * -12,
        }}
      >
        <defs>
          {/* Planetary Rim Lighting Gradient (Pure Silver-White to Deep Void) */}
          <linearGradient id="planetRimGrad" x1="50%" y1="0%" x2="50%" y2="78%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.92)" />
            <stop offset="26%" stopColor="rgba(215, 215, 235, 0.35)" />
            <stop offset="55%" stopColor="rgba(139, 92, 246, 0.10)" />
            <stop offset="78%" stopColor="rgba(10, 10, 16, 0.0)" />
          </linearGradient>

          {/* Planet Surface Body Gradient */}
          <radialGradient id="planetBodyGrad" cx="50%" cy="10%" r="70%">
            <stop offset="0%" stopColor="#262632" />
            <stop offset="28%" stopColor="#101017" />
            <stop offset="60%" stopColor="#050508" />
            <stop offset="100%" stopColor="#040406" />
          </radialGradient>

          {/* Subtle Topographic/Radar Texture Mask */}
          <radialGradient id="topCapMask" cx="50%" cy="16%" r="48%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Outer Dashed Polar Orbit Track */}
        <motion.circle
          cx="250"
          cy="245"
          r="208"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
          strokeDasharray="3 8"
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '250px 245px' }}
        />

        {/* Core Planetary Sphere */}
        <circle cx="250" cy="245" r="182" fill="url(#planetBodyGrad)" />

        {/* Subtle Latitude & Longitude SAR Graticule Arcs on Illuminated Cap */}
        <g opacity="0.22" stroke="url(#topCapMask)" fill="none" strokeWidth="0.8">
          <path d="M 92 172 Q 250 112 408 172" />
          <path d="M 122 136 Q 250 88 378 136" />
          <ellipse cx="250" cy="245" rx="92" ry="182" />
        </g>

        {/* Illuminated Continent Stipple Dots along the Top Crescent */}
        <g fill="rgba(255,255,255,0.42)">
          {[
            [192, 92], [202, 88], [214, 90], [225, 86], [236, 84],
            [248, 83], [258, 85], [270, 86], [280, 90], [290, 94],
            [176, 104], [188, 100], [200, 98], [216, 99], [232, 96],
            [266, 96], [278, 99], [292, 103], [304, 108], [314, 114],
            [162, 118], [174, 114], [286, 112], [298, 117], [322, 125],
          ].map(([cx, cy], idx) => (
            <circle key={idx} cx={cx} cy={cy} r={idx % 3 === 0 ? '1.5' : '1'} />
          ))}
        </g>

        {/* Subtle Interferometric SAR Pulse on the Top Rim */}
        {[0, 1].map((ringIdx) => (
          <motion.ellipse
            key={`${activePhenomenon.id}-${ringIdx}`}
            cx={activePhenomenon.cx}
            cy={activePhenomenon.cy - 8}
            rx="15"
            ry="7"
            fill="none"
            stroke={ringIdx === 0 ? 'rgba(255,255,255,0.75)' : 'rgba(225,29,72,0.65)'}
            strokeWidth="1.1"
            initial={{ scale: 0.4, opacity: 0.8 }}
            animate={{ scale: 2.5 + ringIdx * 0.6, opacity: 0 }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              delay: ringIdx * 1.2,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Active Beacon Dot */}
        <motion.circle
          cx={activePhenomenon.cx}
          cy={activePhenomenon.cy - 8}
          r="3"
          fill="#FFFFFF"
          animate={{ cx: activePhenomenon.cx, cy: activePhenomenon.cy - 8 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        />

        {/* Glowing Atmospheric Crescent Rim */}
        <circle
          cx="250"
          cy="245"
          r="182"
          fill="none"
          stroke="url(#planetRimGrad)"
          strokeWidth="2"
        />
      </motion.svg>

      {/* Clean, Uncluttered Vertical Poetic Verse in the Lower Shadow (Direct Homage to Pinterest Reference 2) */}
      <motion.div
        style={{
          x: mouseOffset.x * 6,
          y: mouseOffset.y * 6,
        }}
        className="relative z-10 mt-14 flex flex-col items-start text-left"
      >
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
            className={`font-sans text-[13px] sm:text-sm leading-relaxed tracking-wide ${
              i === 2 || i === 5
                ? 'text-white/85 font-normal'
                : 'text-white/40 font-light'
            }`}
          >
            {line}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
