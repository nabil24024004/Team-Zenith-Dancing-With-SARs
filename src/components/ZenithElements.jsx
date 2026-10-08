import React, { useRef } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'framer-motion';

/**
 * Precision Vector SVG & Image Hybrid of the uploaded Team Zenith Logo
 * (Central sharp spire piercing a broken semicircular orbital arc + Z E N I T H)
 */
export function ZenithEmblem({ className = 'w-12 h-12', showText = false }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 200 155"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <radialGradient id="zenithGlow" cx="50%" cy="75%" r="48%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.26)" />
            <stop offset="65%" stopColor="rgba(167,139,250,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="105" r="54" fill="url(#zenithGlow)" />

        {/* Left broken orbital dome arc */}
        <motion.path
          d="M 33 118 A 68 68 0 0 1 91 51"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="butt"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        />

        {/* Right broken orbital dome arc */}
        <motion.path
          d="M 109 51 A 68 68 0 0 1 167 118"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="butt"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />

        {/* Central sharp spire & flared horizon base */}
        <motion.path
          d="M 100 10 L 103.5 104 Q 104.2 119 116 120.5 L 182 122 L 18 122 L 84 120.5 Q 95.8 119 96.5 104 Z"
          fill="#FFFFFF"
          initial={{ opacity: 0, scaleY: 0.75 }}
          animate={{ opacity: 1, scaleY: 1 }}
          style={{ transformOrigin: '100px 122px' }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />

        {showText && (
          <text
            x="102"
            y="147"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="16.5"
            fontWeight="400"
            letterSpacing="0.55em"
          >
            ZENITH
          </text>
        )}
      </svg>
    </motion.div>
  );
}

/**
 * 3x3 Architectural Dot-Matrix Grid Marker (From Pinterest Inspiration 1)
 */
export function DotGridMark({ className = '' }) {
  return (
    <div
      className={`grid grid-cols-3 gap-[3.5px] opacity-45 group-hover:opacity-85 transition-opacity duration-300 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: 9 }).map((_, idx) => (
        <span
          key={idx}
          className="w-[2.5px] h-[2.5px] rounded-full bg-white/80 block"
        />
      ))}
    </div>
  );
}

/**
 * Four-Dot Diamond / Crosshair Marker (From Pinterest Inspiration 1)
 */
export function DiamondCrosshair({ className = '' }) {
  return (
    <div
      className={`relative w-3.5 h-3.5 inline-flex items-center justify-center opacity-50 ${className}`}
      aria-hidden="true"
    >
      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[2.5px] h-[2.5px] rounded-full bg-white" />
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2.5px] h-[2.5px] rounded-full bg-white" />
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-[2.5px] rounded-full bg-white" />
      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[2.5px] h-[2.5px] rounded-full bg-white" />
    </div>
  );
}

/**
 * Interactive Minimalist Frosted Glass Card with Cursor Spotlight & Spring Micro-Tilt
 */
export function FrostedCard({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.09)',
  borderGlow = 'rgba(255, 255, 255, 0.28)',
  tilt = true,
  onClick,
}) {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(0, { stiffness: 260, damping: 26 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 26 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX.set(x);
    mouseY.set(y);

    if (tilt) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      rotateX.set(((y - cy) / cy) * -2.8);
      rotateY.set(((x - cx) / cx) * 2.8);
    }
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const radialBg = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)`;
  const radialBorder = useMotionTemplate`radial-gradient(240px circle at ${mouseX}px ${mouseY}px, ${borderGlow}, transparent 75%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={
        tilt
          ? {
              rotateX,
              rotateY,
              transformPerspective: 1100,
            }
          : undefined
      }
      className={`group relative rounded-2xl frosted-glass-card overflow-hidden transition-colors duration-300 hover:border-white/20 ${className}`}
    >
      {/* Cursor-following frosted spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: radialBg }}
      />

      {/* Cursor-following border highlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: radialBorder,
          maskImage:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />

      {/* Specular top glass edge */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

/**
 * Glass-Effect CTA Button with Magnetic Pull & Split-Compartment Option
 * (Inspired by the rectangular "EXPLORE MORE" + crosshair buttons in Pinterest Inspiration 1)
 */
export function GlassButton({
  children,
  onClick,
  href,
  variant = 'primary',
  compartment = false,
  icon: Icon,
  className = '',
}) {
  const btnRef = useRef(null);
  const x = useSpring(0, { stiffness: 300, damping: 20 });
  const y = useSpring(0, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * 0.16);
    y.set(dy * 0.16);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Tag = href ? motion.a : motion.button;

  return (
    <Tag
      ref={btnRef}
      href={href}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.975 }}
      className={`group inline-flex items-center justify-center overflow-hidden select-none cursor-pointer ${
        compartment ? 'rounded-xl' : 'rounded-full'
      } ${variant === 'primary' ? 'glass-cta text-white' : 'glass-cta-secondary text-white/85 hover:text-white'} ${className}`}
    >
      {/* Internal Specular Shimmer Sweep on Hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

      {compartment ? (
        <span className="relative z-10 flex items-center">
          <span className="px-3.5 py-3.5 border-r border-white/15 flex items-center justify-center group-hover:bg-white/[0.06] transition-colors">
            <DiamondCrosshair className="opacity-80 group-hover:rotate-90 transition-transform duration-500" />
          </span>
          <span className="px-6 py-3.5 text-[11px] font-mono tracking-[0.26em] uppercase font-medium flex items-center gap-2.5">
            {children}
            {Icon && (
              <Icon className="w-3.5 h-3.5 opacity-75 transition-transform duration-300 group-hover:translate-x-0.5" />
            )}
          </span>
        </span>
      ) : (
        <span className="relative z-10 px-6 py-3 text-xs font-mono tracking-[0.2em] uppercase font-medium flex items-center gap-2.5">
          {children}
          {Icon && (
            <Icon className="w-3.5 h-3.5 opacity-80 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </span>
      )}
    </Tag>
  );
}
