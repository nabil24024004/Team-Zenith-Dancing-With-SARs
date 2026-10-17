import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Compass,
  Layers,
  Menu,
  Radar,
  Radio,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ZenithEmblem,
  DotGridMark,
  DiamondCrosshair,
  FrostedCard,
  GlassButton,
} from './components/ZenithElements';
import { EarthHorizonVisual } from './components/EarthHorizonHero';
import { RealEarthGlobe } from './components/RealEarthGlobe';
import {
  SurfaceWaltzSection,
  WALTZ_PHENOMENA,
} from './components/SurfaceWaltzCards';

const NAV_SECTIONS = [
  { id: 'welcome', index: '01', label: 'HOME' },
  { id: 'waltz', index: '02', label: 'THE MISSION' },
  { id: 'nisar', index: '03', label: 'NISAR' },
  { id: 'zenith', index: '04', label: 'TEAM' },
];

export default function App() {
  const [activePhenomenon, setActivePhenomenon] = useState(WALTZ_PHENOMENA[0]);
  const [activeNav, setActiveNav] = useState('welcome');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  const manualScrollLockRef = useRef(false);
  const manualScrollTimerRef = useRef(null);

  // Sync navbar active tab & glass elevation with window scrolling
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 36);

      if (manualScrollLockRef.current) return;

      // If near the very bottom of the page, activate the final section ('zenith')
      const scrolledToBottom =
        window.innerHeight + scrollY >=
        document.documentElement.scrollHeight - 80;
      if (scrolledToBottom) {
        setActiveNav('zenith');
        return;
      }

      // Trigger line at 36% of viewport height from top
      const triggerLine = scrollY + window.innerHeight * 0.36;
      let currentSection = 'welcome';

      for (const section of NAV_SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const elTop = rect.top + scrollY;
          if (triggerLine >= elTop) {
            currentSection = section.id;
          }
        }
      }

      setActiveNav(currentSection);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x: nx, y: ny });
  };

  const scrollTo = (id, navId) => {
    manualScrollLockRef.current = true;
    if (manualScrollTimerRef.current) {
      clearTimeout(manualScrollTimerRef.current);
    }
    setActiveNav(navId);
    setMobileMenuOpen(false);

    const el = document.getElementById(id);
    if (el) {
      const navOffset = 96;
      const top =
        id === 'welcome'
          ? 0
          : el.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    }

    manualScrollTimerRef.current = setTimeout(() => {
      manualScrollLockRef.current = false;
    }, 850);
  };

  const activeSectionObj =
    NAV_SECTIONS.find((s) => s.id === activeNav) || NAV_SECTIONS[0];

  return (
    <div className="min-h-screen bg-[#040406] text-[#F4F4F6] relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* Subtle Ambient Background Texture & Atmospheric Glows (Strictly Zero Cyan, Zero Gold) */}
      <div className="fixed inset-0 bg-dot-matrix opacity-40 pointer-events-none z-0" />
      <div
        className="fixed top-[-18%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full blur-[150px] pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(139,92,246,0.045) 55%, transparent 80%)',
        }}
      />

      {/* ================= FIXED TOP OBSERVATORY NAVBAR ================= */}
      <header className="fixed top-0 inset-x-0 z-50 w-full bg-[#040406]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.65)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
          {/* Left: Minimal Vector Emblem + Team Zenith Brand Identity */}
          <a
            href="#welcome"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('welcome', 'welcome');
            }}
            className="flex items-center gap-2.5 sm:gap-3 group select-none cursor-pointer shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              >
                <path
                  d="M 5 22 A 11 11 0 0 1 27 22"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="16"
                  y1="5"
                  x2="16"
                  y2="27"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex flex-col text-left">
              <span className="font-mono text-xs font-bold tracking-[0.22em] uppercase text-white leading-tight">
                TEAM ZENITH
              </span>
              <span className="font-mono text-[8.5px] sm:text-[9px] tracking-[0.18em] uppercase text-white/45 leading-tight mt-0.5">
                NASA SPACE APPS 2026
              </span>
            </div>
          </a>

          {/* Center: Desktop Navigation Links with Numeric Prefixes & Active Crimson Underline */}
          <div className="hidden lg:flex items-center gap-8 xl:gap-11 font-mono text-[11px] tracking-[0.2em] uppercase">
            {NAV_SECTIONS.map((tab) => {
              const isActive = activeNav === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollTo(tab.id, tab.id)}
                  className={`relative py-1 cursor-pointer transition-colors duration-200 select-none ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  <span className="opacity-40 mr-2 text-[10px]">{tab.index}</span>
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="activeNavUnderline"
                      className="absolute -bottom-1 inset-x-0 h-[2px] bg-[#E11D48] shadow-[0_0_8px_#E11D48]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Dashboard CTA Button With Pulsing Red Beacon + ArrowUpRight */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="/dashboard"
              className="group inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 text-white font-mono text-[9.5px] sm:text-[10px] tracking-[0.16em] uppercase font-medium transition-all duration-200 shadow-sm select-none whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[#E11D48] shadow-[0_0_8px_#E11D48] animate-pulse shrink-0" />
              <span>Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </a>

            {/* Mobile Menu Hamburger (< lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white/80 transition-all active:scale-95 shrink-0"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-white" />
              ) : (
                <Menu className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Expandable Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden w-full overflow-hidden px-4 pb-3 pt-1 border-t border-white/[0.08] bg-[#040406]"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {NAV_SECTIONS.map((tab) => {
                  const isActive = activeNav === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => scrollTo(tab.id, tab.id)}
                      className={`px-3 py-2 rounded-xl font-mono text-[10px] tracking-[0.16em] uppercase flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-white/[0.12] border border-white/25 text-white shadow-sm'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="opacity-40">{tab.index}</span>
                        <span>{tab.label}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ================= HERO SECTION (FULL BLEED, UNBOXED, BALANCED VERTICAL FIT) ================= */}
      <main
        id="welcome"
        onMouseMove={handleHeroMouseMove}
        className="relative z-10 w-full min-h-screen lg:h-screen lg:max-h-[980px] pt-28 sm:pt-32 lg:pt-28 xl:pt-32 pb-6 sm:pb-8 px-4 sm:px-8 lg:px-12 flex flex-col items-center justify-start lg:justify-between overflow-hidden"
      >
        {/* Subtle Ambient Cosmic Glow */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[500px] rounded-full blur-[150px]"
          style={{
            background:
              'radial-gradient(circle, rgba(225,29,72,0.14) 0%, rgba(37,99,235,0.13) 45%, rgba(139,92,246,0.06) 70%, transparent 85%)',
          }}
        />

        {/* 1. CENTER TITLE BLOCK */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-20 text-center mb-1 sm:mb-2 lg:mb-3 shrink-0"
        >
          {/* Mission Eyebrow */}
          <span className="font-mono text-[9.5px] sm:text-[10px] tracking-[0.34em] uppercase text-white/60 block mb-2 sm:mb-2.5">
            NASA-ISRO JOINT EARTH SYSTEM MISSION
          </span>

          {/* Primary Headline with Bold SAR Accent */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] tracking-[0.06em] uppercase text-white leading-tight">
            <span className="font-light">DANCING WITH </span>
            <span className="font-black">SAR</span>
          </h1>

          {/* Centered Crimson Accent Bar */}
          <div className="w-12 h-[2.5px] bg-[#E11D48] shadow-[0_0_10px_#E11D48] mx-auto mt-2 mb-2.5" />

          {/* Subtitle */}
          <p className="font-sans text-xs sm:text-[13px] text-white/65 max-w-xl mx-auto font-light leading-relaxed">
            Discover how radar reveals millimeter-scale changes on Earth’s surface —
            <br className="hidden sm:inline" />
            penetrating clouds, smoke, and polar night.
          </p>
        </motion.div>

        {/* 2. CENTER 3-COLUMN VISUAL STAGE WITH REAL THREE.JS GLOBE (EXPANSIVE & UNCLIPPED) */}
        <div className="relative z-20 flex-1 flex flex-col lg:flex-row items-center justify-between w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-14 gap-6 lg:gap-2 min-h-0">
          {/* Left Column: FROM Sense */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.15 }}
            className="w-full lg:w-[250px] xl:w-[280px] shrink-0 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1"
          >
            <span className="font-mono text-[10.5px] tracking-[0.28em] text-white/45 uppercase mb-1">
              FROM
            </span>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] xl:text-[62px] font-bold text-white tracking-tight leading-none">
              Sense
            </h2>
            <div className="w-8 h-[2.5px] bg-[#E11D48] shadow-[0_0_8px_#E11D48] mt-3 mb-3.5" />
            <p className="font-mono text-[9px] sm:text-[9.5px] tracking-[0.22em] text-white/50 uppercase leading-relaxed max-w-[220px]">
              TRACKING A CHANGING PLANET
              <br />
              THROUGH RADAR WAVES.
            </p>
          </motion.div>

          {/* Center Column: Real Three.js 3D Earth Globe (Generous Unclipped Horizontal Width) */}
          <div className="w-full flex-1 max-w-[780px] flex items-center justify-center order-1 lg:order-2 overflow-visible">
            <RealEarthGlobe mouseOffset={mouseOffset} />
          </div>

          {/* Right Column: TO by Exploring. */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.2 }}
            className="w-full lg:w-[250px] xl:w-[280px] shrink-0 flex flex-col items-center lg:items-start text-center lg:text-left order-3"
          >
            <div className="flex items-center gap-2.5 w-full max-w-[200px] justify-center lg:justify-start mb-1">
              <span className="font-mono text-[10.5px] tracking-[0.28em] text-white/45 uppercase shrink-0">
                TO
              </span>
              <div className="h-px bg-white/20 flex-1" />
            </div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] xl:text-[62px] font-bold text-white tracking-tight leading-tight">
              by
              <br />
              Exploring.
            </h2>
            <div className="w-8 h-[2.5px] bg-[#E11D48] shadow-[0_0_8px_#E11D48] mt-3.5 mb-4" />
            <p className="font-mono text-[9px] sm:text-[9.5px] tracking-[0.22em] text-white/50 uppercase leading-relaxed max-w-[220px]">
              TURNING SURFACE SIGNALS
              <br />
              INTO REAL-WORLD INSIGHTS.
            </p>

            {/* Primary & Secondary Hero CTAs (Vertical Stack) */}
            <div className="mt-5 flex flex-col items-center lg:items-start gap-2.5 w-full max-w-[260px] xl:max-w-[280px]">
              <a
                href="/dashboard"
                className="group w-full inline-flex items-center justify-between px-4 sm:px-5 py-3 rounded-full bg-[#E11D48] hover:bg-[#F43F5E] text-white transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:shadow-[0_0_26px_rgba(225,29,72,0.6)] active:scale-98 select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-pulse" />
                  <span className="font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-white whitespace-nowrap">
                    Launch Dashboard
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white shrink-0 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

              <button
                type="button"
                onClick={() => scrollTo('waltz', 'waltz')}
                className="group w-full inline-flex items-center justify-between px-4 sm:px-5 py-3 rounded-full border border-white/20 hover:border-white/40 bg-white/[0.04] hover:bg-white/[0.08] text-white/85 hover:text-white transition-all select-none"
              >
                <span className="font-mono text-[11px] font-bold tracking-[0.08em] uppercase whitespace-nowrap">
                  Explore Phenomena
                </span>
                <ArrowDown className="w-3.5 h-3.5 text-white/60 group-hover:text-white shrink-0 ml-2 transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ================= THE ENDLESS WALTZ OF SURFACE CHANGES ================= */}
      <SurfaceWaltzSection
        activePhenomenon={activePhenomenon}
        onSelectPhenomenon={(item) => {
          setActivePhenomenon(item);
          scrollTo('welcome', 'welcome');
        }}
        onScrollToNisar={() => scrollTo('nisar', 'nisar')}
      />

      {/* ================= SECTION 03: "S P A C E" — NASA-ISRO NISAR MISSION ================= */}
      <section
        id="nisar"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
        >
          <FrostedCard className="p-8 sm:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <DiamondCrosshair />
                  <span className="font-mono text-[10px] tracking-[0.26em] uppercase text-white/50">
                    03 // THE ORBITAL INSTRUMENT
                  </span>
                </div>
                <DotGridMark />
              </div>

              {/* Editorial Vertical & Horizontal Layout from Reference 1 ("JOHN GLENN / PROJECT MERCURY") */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-between">
                <div className="max-w-2xl">
                  <div>
                    <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-white/45 block mb-2">
                      NASA-ISRO JOINT EARTH SYSTEM MISSION
                    </span>
                    <h2 className="font-display text-2xl sm:text-4xl font-light text-white tracking-tight">
                      Seeing Through Clouds, Canopy,{' '}
                      <span className="font-semibold">and Night.</span>
                    </h2>
                    <p className="mt-4 text-sm sm:text-base text-white/55 font-light leading-relaxed">
                      Earth’s dynamic surface changes are often veiled by cloud
                      cover, wildfire smoke, or polar winter darkness. The
                      NASA-ISRO Synthetic Aperture Radar (NISAR) mission pairs
                      NASA’s 24 cm L-Band radar with ISRO’s 10 cm S-Band radar
                      to image the entire globe every 12 days—revealing
                      millimeter-scale surface motion across wetlands, faults,
                      forests, farmlands, and glaciers.
                    </p>
                  </div>
                </div>

                {/* Minimalist Frosted Spec Pills */}
                <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 min-w-[230px]">
                  {[
                    { label: 'L-BAND RADAR (NASA)', value: '24 cm λ' },
                    { label: 'S-BAND RADAR (ISRO)', value: '10 cm λ' },
                    { label: 'ORBITAL REVISIT', value: '12 Days' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4"
                    >
                      <span className="font-mono text-[9.5px] sm:text-[9px] tracking-[0.2em] uppercase text-white/50">
                        {stat.label}
                      </span>
                      <span className="font-display text-base sm:text-lg font-medium text-white shrink-0">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom "S P A C E" Architectural Signature (Directly from Reference 1) */}
            <div className="mt-10 pt-6 border-t border-white/[0.08] flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="sr-only">Space Segment Remote Sensing Instrument</span>
                <div aria-hidden="true" className="font-display text-2xl sm:text-3xl tracking-[0.45em] uppercase text-white font-light">
                  S P A C E
                </div>
                <div aria-hidden="true" className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-6 h-[2px] bg-white/80" />
                  <span className="w-2 h-[2px] bg-white/80" />
                </div>
              </div>

              <GlassButton
                onClick={() => setWelcomeModalOpen(true)}
                variant="secondary"
                compartment
                icon={ArrowUpRight}
              >
                Mission Specifications
              </GlassButton>
            </div>
          </FrostedCard>
        </motion.div>
      </section>

      {/* ================= SECTION 04: "E A R T H" — TEAM ZENITH IDENTITY & LOGO ================= */}
      <section
        id="zenith"
        className="relative z-10 py-12 sm:py-16 px-4 sm:px-8 max-w-7xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
        >
          <FrostedCard className="p-8 sm:p-12 relative overflow-hidden">
            {/* Top Row */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <DiamondCrosshair />
                <span className="font-mono text-[10px] tracking-[0.26em] uppercase text-white/50">
                  04 // TEAM IDENTITY
                </span>
              </div>
              <DotGridMark />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left: Centerpiece Uploaded Team Zenith Logo Showcase */}
              <div className="lg:col-span-5 py-8 px-6 rounded-2xl bg-black/55 border border-white/[0.08] flex flex-col items-center justify-center relative overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12), transparent 70%)',
                  }}
                />
                <motion.img
                  src="/zenith-logo.png"
                  alt="Team Zenith Official Emblem"
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 object-contain mix-blend-screen"
                />
                <span className="relative z-10 mt-2 font-mono text-[10px] tracking-[0.28em] uppercase text-white/50">
                  NASA SPACE APPS CHALLENGE 2026
                </span>
              </div>

              {/* Right: Team Zenith Welcoming Narrative */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-white/45 block mb-2">
                    DANCING WITH THE SARS · OFFICIAL ENTRY
                  </span>
                  <h2 className="font-display text-2xl sm:text-4xl font-light text-white tracking-tight">
                    Crafted by{' '}
                    <span className="font-semibold">Team Zenith.</span>
                  </h2>
                  <p className="mt-4 text-sm sm:text-base text-white/55 font-light leading-relaxed">
                    Designed and engineered by{' '}
                    <span className="text-white font-medium">Team Zenith</span>{' '}
                    for the{' '}
                    <span className="text-white font-medium">
                      NASA Space Apps Challenge 2026
                    </span>
                    . Our mission is to transform complex NASA-ISRO Synthetic
                    Aperture Radar interferometry into an intuitive, welcoming
                    visual story of our living planet’s constant surface waltz.
                  </p>
                </div>

                {/* Bottom "E A R T H" Architectural Signature (Directly from Reference 1) */}
                <div className="mt-10 pt-6 border-t border-white/[0.08] flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="sr-only">Earth Observation Target</span>
                    <div aria-hidden="true" className="font-display text-2xl sm:text-3xl tracking-[0.45em] uppercase text-white font-light">
                      E A R T H
                    </div>
                    <div aria-hidden="true" className="mt-1.5 flex items-center gap-1.5">
                      <span className="w-6 h-[2px] bg-white/80" />
                      <span className="w-2 h-[2px] bg-white/80" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FrostedCard>
        </motion.div>
      </section>

      {/* ================= MINIMALIST FOOTER ================= */}
      <footer className="relative z-10 mt-8 border-t border-white/[0.07] py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/zenith-logo.png"
              alt="Team Zenith"
              className="w-7 h-7 object-contain mix-blend-screen"
            />
            <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-white/60 text-center sm:text-left">
              TEAM ZENITH · NASA SPACE APPS CHALLENGE 2026 · DANCING WITH THE SARS
            </span>
          </div>

          <GlassButton
            onClick={() => scrollTo('welcome', 'welcome')}
            variant="secondary"
            icon={ArrowUp}
            className="w-full sm:w-auto justify-center"
          >
            Back to Top
          </GlassButton>
        </div>
      </footer>

      {/* ================= FROSTED GLASS MISSION BRIEF MODAL ================= */}
      <AnimatePresence>
        {welcomeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWelcomeModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="relative z-10 w-full max-w-xl rounded-3xl frosted-glass-card p-7 sm:p-9 border border-white/20"
            >
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src="/zenith-logo.png"
                    alt="Team Zenith"
                    className="w-8 h-8 object-contain mix-blend-screen"
                  />
                  <div>
                    <span className="block font-mono text-[10px] tracking-[0.24em] uppercase text-white/45">
                      NASA SPACE APPS CHALLENGE 2026
                    </span>
                    <h3 className="font-display text-lg font-medium text-white">
                      Dancing with SAR — Mission Brief
                    </h3>
                  </div>
                </div>
                <DotGridMark />
              </div>

              <p className="mt-6 text-sm text-white/65 font-light leading-relaxed">
                Earth’s surface is an endless dance of natural processes and
                human activities, but these changes are often difficult to
                visualize, understand, and communicate. From wetland loss to
                forest wildfires, earthquakes, farming activities, glacier
                movement, and more, Earth is in a constant waltz of surface
                changes.
              </p>

              <p className="mt-4 text-sm text-white/65 font-light leading-relaxed">
                <strong className="text-white font-medium">Team Zenith</strong>{' '}
                harnesses radar remote sensing data from the{' '}
                <strong className="text-white font-medium">
                  NASA-ISRO Synthetic Aperture Radar (NISAR)
                </strong>{' '}
                mission to track, visualize, and communicate these surface
                transformations around the world.
              </p>

              <div className="mt-8 flex justify-end">
                <GlassButton
                  onClick={() => setWelcomeModalOpen(false)}
                  variant="primary"
                  compartment
                >
                  Return to Landing
                </GlassButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
