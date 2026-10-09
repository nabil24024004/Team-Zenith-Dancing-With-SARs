import React from 'react';
import { DiamondCrosshair } from '../../components/ZenithElements.jsx';

/**
 * A decorative, generated radar-style scene. It is intentionally independent of
 * mission/catalog data and must not be interpreted as a real observation.
 */
export default function SyntheticPreview() {
  const swaths = [
    'M 36 118 C 74 88, 109 139, 150 112 S 223 88, 274 117 S 352 139, 404 104',
    'M 28 137 C 72 108, 107 156, 153 130 S 230 105, 278 135 S 352 157, 412 121',
    'M 42 96 C 85 67, 111 116, 158 91 S 228 68, 282 98 S 350 117, 400 83',
    'M 24 157 C 72 127, 108 178, 153 151 S 226 127, 278 157 S 351 178, 416 143',
    'M 44 76 C 83 49, 117 94, 160 71 S 233 48, 282 77 S 348 98, 400 63',
  ];

  return (
    <section
      className="synthetic-preview explorer-panel"
      aria-labelledby="synthetic-preview-title"
    >
      <style>{`
        .synthetic-preview {
          --sp-line: rgba(255, 255, 255, 0.09);
          --sp-ink: #F4F4F6;
          --sp-muted: rgba(244, 244, 246, 0.56);
          color: var(--sp-ink);
          border-radius: 20px;
          overflow: hidden;
          font-family: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
          max-width: 920px;
          margin: 0 auto;
          padding: 0 !important;
        }
        .synthetic-preview *, .synthetic-preview *::before, .synthetic-preview *::after { box-sizing: border-box; }
        .sp-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--sp-line);
        }
        .sp-heading-wrap { display: flex; flex-direction: column; gap: 4px; }
        .sp-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .sp-heading {
          margin: 0;
          font-family: "Space Grotesk", sans-serif;
          font-size: 15px;
          letter-spacing: -0.02em;
          font-weight: 500;
          color: #FFFFFF;
        }
        .sp-tag {
          flex: 0 0 auto;
          color: #FDA4AF;
          border: 1px solid rgba(251, 113, 133, 0.35);
          background: rgba(225, 29, 72, 0.12);
          border-radius: 999px;
          padding: 5px 10px;
          font-family: "JetBrains Mono", monospace;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sp-content {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(210px, 0.8fr);
          gap: 14px;
          padding: 16px;
        }
        .sp-visual {
          min-width: 0;
          background: radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.15) 0%, rgba(225, 29, 72, 0.06) 45%, #040406 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          overflow: hidden;
          position: relative;
        }
        .sp-visual svg { display: block; width: 100%; height: auto; min-height: 200px; }
        .sp-aside { display: flex; flex-direction: column; gap: 10px; }
        .sp-note {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--sp-line);
          border-radius: 12px;
          padding: 12px;
        }
        .sp-note strong {
          display: block;
          font-family: "Space Grotesk", sans-serif;
          font-size: 13px;
          color: #FFFFFF;
          margin-bottom: 5px;
        }
        .sp-note p { color: var(--sp-muted); font-size: 11px; line-height: 1.55; margin: 0; }
        .sp-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--sp-muted);
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: auto;
          padding: 4px 2px;
        }
        .sp-legend-mark {
          width: 22px;
          height: 2px;
          border-radius: 3px;
          background: linear-gradient(90deg, #E11D48, #A78BFA);
        }
        .sp-disclaimer {
          border-top: 1px solid var(--sp-line);
          padding: 12px 18px;
          color: rgba(244, 244, 246, 0.62);
          background: rgba(255, 255, 255, 0.02);
          font-size: 10px;
          line-height: 1.55;
        }
        .sp-disclaimer b { color: #FFFFFF; font-weight: 500; }
        @media (max-width: 620px) {
          .sp-topline { align-items: flex-start; padding: 14px; }
          .sp-content { grid-template-columns: 1fr; padding: 12px; gap: 10px; }
          .sp-visual svg { min-height: 170px; }
          .sp-aside { display: grid; grid-template-columns: 1fr; }
          .sp-legend { margin-top: 0; }
          .sp-disclaimer { padding: 11px 14px; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .sp-sweep { transform-origin: 220px 120px; animation: sp-sweep 12s linear infinite; }
          @keyframes sp-sweep { to { transform: rotate(360deg); } }
        }
        @media (prefers-reduced-motion: reduce) {
          .sp-sweep { display: none; }
        }
      `}</style>
      <div className="sp-topline">
        <div className="sp-heading-wrap">
          <span className="sp-kicker">
            <DiamondCrosshair />
            <span>INTERFEROMETRIC PHASE WAVE</span>
          </span>
          <h2 className="sp-heading" id="synthetic-preview-title">
            Radar-style surface preview
          </h2>
        </div>
        <span className="sp-tag">SYNTHETIC DEMO</span>
      </div>
      <div className="sp-content">
        <div className="sp-visual">
          <svg
            viewBox="0 0 440 240"
            role="img"
            aria-labelledby="sp-svg-title sp-svg-desc"
          >
            <title id="sp-svg-title">
              Illustrative radar-like surface pattern
            </title>
            <desc id="sp-svg-desc">
              Generated crimson and violet contour-like strokes and a faint
              radar sweep over an abstract grid. No measured data is shown.
            </desc>
            <defs>
              <pattern
                id="sp-grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="rgba(255,255,255,.06)"
                  strokeWidth=".7"
                />
              </pattern>
              <radialGradient id="sp-wash">
                <stop offset="0" stopColor="#FB7185" stopOpacity=".42" />
                <stop offset=".48" stopColor="#8B5CF6" stopOpacity=".22" />
                <stop offset="1" stopColor="#040406" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sp-trail" x1="0" x2="1">
                <stop stopColor="#E11D48" stopOpacity=".35" />
                <stop offset=".5" stopColor="#A78BFA" stopOpacity=".75" />
                <stop offset="1" stopColor="#F4F4F6" stopOpacity=".95" />
              </linearGradient>
            </defs>
            <rect width="440" height="240" fill="url(#sp-grid)" />
            <g fill="none" stroke="rgba(255,255,255,.11)" strokeWidth=".8">
              <ellipse cx="220" cy="120" rx="62" ry="34" />
              <ellipse cx="220" cy="120" rx="112" ry="62" />
              <ellipse cx="220" cy="120" rx="166" ry="92" />
              <path d="M220 18v204M32 120h376M87 43l266 154M87 197 353 43" />
            </g>
            <ellipse
              cx="220"
              cy="120"
              rx="122"
              ry="69"
              fill="url(#sp-wash)"
              opacity=".75"
            />
            <g
              fill="none"
              stroke="url(#sp-trail)"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {swaths.map((path, index) => (
                <path key={index} d={path} opacity={0.48 + index * 0.1} />
              ))}
            </g>
            <path
              className="sp-sweep"
              d="M220 120 L220 20 A100 100 0 0 1 286 45 Z"
              fill="#FB7185"
              opacity=".14"
            />
            <circle cx="220" cy="120" r="3" fill="#FFFFFF" />
            <circle
              cx="220"
              cy="120"
              r="7"
              fill="none"
              stroke="#FB7185"
              strokeOpacity=".8"
            />
            <text
              x="14"
              y="225"
              fill="rgba(255,255,255,0.48)"
              fontSize="8.5"
              letterSpacing="0.16em"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
            >
              ILLUSTRATIVE PATTERN · NO GEOLOCATION
            </text>
          </svg>
        </div>
        <aside className="sp-aside" aria-label="Preview information">
          <div className="sp-note">
            <strong>A visual placeholder</strong>
            <p>
              Procedurally drawn contours evoke a radar view. Their shapes and
              positions are decorative, not observations.
            </p>
          </div>
          <div className="sp-note">
            <strong>No measurement attached</strong>
            <p>
              This standalone demo uses no catalog, footprint, coordinate, or
              mission data.
            </p>
          </div>
          <div className="sp-legend">
            <span className="sp-legend-mark" aria-hidden="true" /> Generated
            contour strokes
          </div>
        </aside>
      </div>
      <div className="sp-disclaimer" role="note">
        <b>Synthetic / illustrative only.</b> This is not NISAR or ASF imagery
        or observation, and it is not a scientific measurement. Do not interpret
        the visual as real data.
      </div>
    </section>
  );
}
