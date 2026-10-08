import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown,
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
import {
  SurfaceWaltzSection,
  WALTZ_PHENOMENA,
} from './components/SurfaceWaltzCards';

const NAV_SECTIONS = [
  { id: 'welcome', index: '01', label: 'Welcome' },
  { id: 'waltz', index: '02', label: 'The Waltz' },
  { id: 'nisar', index: '03', label: 'NISAR Mission' },
  { id: 'zenith', index: '04', label: 'Team Zenith' },
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

      {/* ================= SCROLL-SYNCED FROSTED TRANSLUCENT NAVBAR (MOBILE & DESKTOP RESPONSIVE) ================= */}
      <header
        className={`fixed top-0 inset-x-0 z-40 px-3 sm:px-8 transition-all duration-500 ${
          isScrolled ? 'pt-2 sm:pt-3.5' : 'pt-3 sm:pt-6'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <motion.nav
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={`relative rounded-2xl px-3.5 sm:px-6 transition-all duration-500 backdrop-blur-2xl ${
              isScrolled || mobileMenuOpen
                ? 'py-2.5 bg-[#040406]/85 border border-white/[0.12] shadow-[0_16px_44px_rgba(0,0,0,0.85)]'
                : 'py-3 sm:py-3.5 bg-[#040406]/50 border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              {/* Left: Team Zenith Logo & Identity */}
              <a
                href="#welcome"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo('welcome', 'welcome');
                }}
                className="flex items-center gap-2.5 sm:gap-3.5 group min-w-0"
              >
                <div
                  className={`relative shrink-0 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-white/25 transition-all duration-300 ${
                    isScrolled ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9 sm:w-10 sm:h-10'
                  }`}
                >
                  <img
                    src="/zenith-logo.png"
                    alt="Team Zenith Logo"
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain mix-blend-screen"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[11px] sm:text-sm font-semibold tracking-[0.2em] sm:tracking-[0.28em] uppercase text-white truncate">
                    TEAM ZENITH
                  </div>
                  <div className="font-mono text-[8px] sm:text-[9px] tracking-[0.14em] sm:tracking-[0.18em] uppercase text-white/45 flex items-center gap-1.5 truncate">
                    <span className="truncate">NASA SPACE APPS 2026</span>
                    <span className="hidden sm:inline-block text-white/25">·</span>
                    <span className="hidden sm:inline-block text-white/70">
                      {activeSectionObj.index} / 04
                    </span>
                  </div>
                </div>
              </a>

              {/* Center: Scroll-Synced Minimalist Navigation Links (Desktop lg+) */}
              <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-black/40 border border-white/[0.08]">
                {NAV_SECTIONS.map((tab) => {
                  const isActive = activeNav === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => scrollTo(tab.id, tab.id)}
                      className={`relative px-4 py-1.5 rounded-full text-xs font-mono tracking-[0.16em] uppercase transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-white/45 hover:text-white/85'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="navPillIndicator"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                          }}
                          className="absolute inset-0 rounded-full bg-white/[0.11] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span
                          className={`text-[9px] transition-opacity ${
                            isActive ? 'opacity-80' : 'opacity-35'
                          }`}
                        >
                          {tab.index}
                        </span>
                        <span>{tab.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right: Desktop Glass CTA + Mobile/Tablet Section Pill & Hamburger Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:block">
                  <GlassButton
                    onClick={() => setWelcomeModalOpen(true)}
                    variant="primary"
                    icon={ArrowUpRight}
                    className="text-[11px]"
                  >
                    Mission Brief
                  </GlassButton>
                </div>

                {/* Mobile & Tablet Interactive Menu Trigger (< lg) */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label="Toggle navigation menu"
                  aria-expanded={mobileMenuOpen}
                  className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/15 text-white transition-all active:scale-95"
                >
                  <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-white/85">
                    {activeSectionObj.index} · {activeSectionObj.label}
                  </span>
                  {mobileMenuOpen ? (
                    <X className="w-4 h-4 text-white/90" />
                  ) : (
                    <Menu className="w-4 h-4 text-white/90" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile & Tablet Expandable Frosted Glass Drawer (< lg) */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:hidden overflow-hidden"
                >
                  <div className="pt-3 mt-3 border-t border-white/[0.08] flex flex-col gap-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {NAV_SECTIONS.map((tab) => {
                        const isActive = activeNav === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => scrollTo(tab.id, tab.id)}
                            className={`px-3.5 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.16em] uppercase flex items-center justify-between transition-all ${
                              isActive
                                ? 'bg-white/[0.12] border border-white/25 text-white shadow-sm'
                                : 'bg-white/[0.03] border border-white/[0.06] text-white/55 hover:text-white'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span className="text-white/40">{tab.index}</span>
                              <span className="truncate">{tab.label}</span>
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Mobile Mission Brief CTA (< sm) */}
                    <div className="sm:hidden pt-1.5">
                      <GlassButton
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setWelcomeModalOpen(true);
                        }}
                        variant="primary"
                        icon={ArrowUpRight}
                        className="w-full justify-center text-[10px]"
                      >
                        Mission Brief
                      </GlassButton>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.nav>
        </div>
      </header>

      {/* ================= HERO SECTION (FULL VIEWPORT ABOVE THE FOLD) ================= */}
      <main
        id="welcome"
        className="relative z-10 pt-28 sm:pt-32 pb-6 px-4 sm:px-8 lg:h-screen lg:max-h-[980px] flex flex-col justify-center"
      >
        <div
          onMouseMove={handleHeroMouseMove}
          className="max-w-7xl w-full mx-auto h-full relative border border-white/[0.08] rounded-3xl bg-gradient-to-b from-white/[0.02] via-transparent to-white/[0.015] px-5 py-5 sm:px-9 sm:py-6 lg:px-12 lg:py-6 flex flex-col justify-between overflow-hidden"
        >
          {/* Architectural Center Grid Hairlines (Inspired by Pinterest Reference 1) */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/[0.045]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/[0.045]" />

          {/* TOP BAR: Combined Poetic Whisper + Center Zenith Emblem Badge + Space Apps Pill */}
          <div className="relative z-20 grid grid-cols-1 md:grid-cols-12 gap-4 pb-4 border-b border-white/[0.06] items-center">
            {/* Left Whisper */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="md:col-span-5 flex items-center gap-4"
            >
              <DotGridMark className="hidden sm:grid shrink-0" />
              <p className="font-sans text-sm sm:text-base font-light text-white/45 leading-snug">
                Let’s{' '}
                <span className="text-white font-normal">
                  decode the Earth
                </span>{' '}
                <span className="text-white/90 font-normal">together.</span>
              </p>
            </motion.div>

            {/* Center Architectural Emblem Badge (From Reference 1 "ASTRONAUTS") */}
            <div className="hidden md:flex md:col-span-2 justify-center">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/15 flex items-center justify-center shadow-inner">
                <ZenithEmblem className="w-5 h-5" />
              </div>
            </div>

            {/* Right Whisper + Space Apps 2026 Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="md:col-span-5 flex items-center justify-between md:justify-end gap-4"
            >
              <p className="hidden xl:block font-mono text-[10px] leading-snug text-white/45 text-right">
                Look deep into radar waves, and understand{' '}
                <span className="text-white/80">every surface shift.</span>
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full frosted-glass-pill shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] animate-pulse" />
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/80">
                  SPACE APPS 2026
                </span>
              </div>
              <DotGridMark className="hidden sm:grid shrink-0" />
            </motion.div>
          </div>

          {/* CENTER STAGE: Clean Title + Spacious Planetary Horizon */}
          <div className="relative z-20 my-auto py-4 flex flex-col items-center justify-center">
            {/* Wide-Tracked Geometric Challenge Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center relative z-20 mb-2 sm:mb-4"
            >
              <div className="inline-block relative">
                <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.38em] uppercase text-white/45 block mb-2">
                  NASA — ISRO SYNTHETIC APERTURE RADAR MISSION
                </span>
                <h1 className="font-display text-xl sm:text-3xl md:text-4xl lg:text-[42px] font-light tracking-[0.28em] sm:tracking-[0.38em] uppercase text-white pl-[0.28em] leading-none">
                  DANCING WITH THE SARS
                </h1>
                {/* Signature Minimalist Double Bar under lead letter (From Reference 1) */}
                <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2 pl-1">
                  <span className="w-2.5 h-[1.5px] bg-white/80" />
                  <span className="w-7 h-[1.5px] bg-white/80" />
                </div>
              </div>
            </motion.div>

            {/* Centerpiece Planetary Horizon + Split Typography ("Learn by Exploring." Homage) */}
            <div className="relative w-full flex flex-col lg:flex-row items-center justify-center">
              {/* Left Word */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.75, delay: 0.2 }}
                className="lg:w-1/3 flex lg:justify-end lg:pr-8 z-20 text-center lg:text-right"
              >
                <span className="font-display text-4xl sm:text-5xl xl:text-6xl font-semibold tracking-tight text-white">
                  Sense
                </span>
              </motion.div>

              {/* Center Glowing Earth Crescent & Poetic Verse */}
              <div className="lg:w-1/3 w-full z-10">
                <EarthHorizonVisual
                  activePhenomenon={activePhenomenon}
                  mouseOffset={mouseOffset}
                />
              </div>

              {/* Right Phrase */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.75, delay: 0.25 }}
                className="lg:w-1/3 flex lg:justify-start lg:pl-8 z-20 text-center lg:text-left"
              >
                <span className="font-display text-4xl sm:text-5xl xl:text-6xl font-semibold tracking-tight text-white">
                  by Exploring.
                </span>
              </motion.div>
            </div>
          </div>

          {/* BOTTOM ARCHITECTURAL BAR (Direct Homage to Reference 1: Left Micro-Note, Center CTA, Right Telemetry) */}
          <div className="relative z-20 pt-5 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left: 010 // TEAM ZENITH Micro Editorial Note */}
            <div className="md:col-span-4 flex items-start gap-3">
              <span className="writing-vertical font-mono text-[9px] tracking-[0.25em] text-white/60 h-8 shrink-0">
                010
              </span>
              <p className="text-[11px] text-white/45 font-light leading-relaxed max-w-xs">
                Tracking wetland loss, wildfires, earthquakes, farming, and
                glaciers with{' '}
                <span className="text-white/80 font-normal">Team Zenith</span>.
              </p>
            </div>

            {/* Center: Single Clean Glass-Effect CTA (Like "EXPLORE MORE" in Reference 1) */}
            <div className="md:col-span-4 flex justify-center">
              <GlassButton
                onClick={() => scrollTo('waltz', 'waltz')}
                variant="primary"
                compartment
                icon={ArrowDown}
              >
                Explore More
              </GlassButton>
            </div>

            {/* Right: Minimalist Telemetry Signature & Dot Grid */}
            <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-4 text-[9px] font-mono tracking-[0.22em] uppercase text-white/40">
              <span>NISAR // L-BAND & S-BAND SAR</span>
              <DotGridMark />
            </div>
          </div>
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
                <div className="flex gap-6 sm:gap-8 items-start max-w-2xl">
                  <div className="hidden sm:flex flex-col items-center pt-1">
                    <span className="writing-vertical font-display text-xs tracking-[0.3em] uppercase text-white/70 font-semibold">
                      NISAR SAR
                    </span>
                    <span className="w-px h-20 bg-white/15 mt-3" />
                  </div>

                  <div>
                    <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-white/45 block mb-2">
                      NASA — ISRO JOINT EARTH SYSTEM MISSION
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
                <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 min-w-[230px]">
                  {[
                    { label: 'L-BAND RADAR (NASA)', value: '24 cm λ' },
                    { label: 'S-BAND RADAR (ISRO)', value: '10 cm λ' },
                    { label: 'ORBITAL REVISIT', value: '12 Days' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4"
                    >
                      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/45">
                        {stat.label}
                      </span>
                      <span className="font-display text-base sm:text-lg font-medium text-white">
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
                <div className="font-display text-2xl sm:text-3xl tracking-[0.45em] uppercase text-white font-light">
                  S P A C E
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-6 h-[2px] bg-white/80" />
                  <span className="w-2 h-[2px] bg-white/80" />
                </div>
              </div>

              <GlassButton
                onClick={() => setWelcomeModalOpen(true)}
                variant="secondary"
                compartment
              >
                Explore More
              </GlassButton>
            </div>
          </FrostedCard>
        </motion.div>
      </section>

      {/* ================= SECTION 04: "E A R T H" — TEAM ZENITH IDENTITY & LOGO ================= */}
      <section
        id="zenith"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto"
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
                    <div className="font-display text-2xl sm:text-3xl tracking-[0.45em] uppercase text-white font-light">
                      E A R T H
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="w-6 h-[2px] bg-white/80" />
                      <span className="w-2 h-[2px] bg-white/80" />
                    </div>
                  </div>

                  <GlassButton
                    onClick={() => scrollTo('waltz', 'waltz')}
                    variant="primary"
                    compartment
                  >
                    Enter the Waltz
                  </GlassButton>
                </div>
              </div>
            </div>
          </FrostedCard>
        </motion.div>
      </section>

      {/* ================= MINIMALIST FOOTER ================= */}
      <footer className="relative z-10 mt-12 border-t border-white/[0.07] py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/zenith-logo.png"
              alt="Team Zenith"
              className="w-7 h-7 object-contain mix-blend-screen"
            />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-white/60">
              TEAM ZENITH · NASA SPACE APPS CHALLENGE 2026 · DANCING WITH THE
              SARS
            </span>
          </div>

          <GlassButton
            onClick={() => scrollTo('welcome', 'welcome')}
            variant="secondary"
            icon={ArrowUp}
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
                      Dancing with the SARs — Mission Brief
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
