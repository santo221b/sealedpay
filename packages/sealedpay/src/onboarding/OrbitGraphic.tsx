/**
 * OrbitGraphic — a subtle, slowly-constructing globe + orbit rings that floats
 * at the bottom-centre of the landing, mostly below the fold. Deliberately a
 * whisper: small tight rings, low-alpha strokes, one dim travelling node, and
 * a soft halo breathing underneath. All CSS/SVG — no assets, reduced-motion
 * safe.
 */
import { useReducedMotion } from "framer-motion";

export function OrbitGraphic() {
  const reduced = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{ bottom: "-40%", width: 880, height: 880, zIndex: 0 }}
    >
      {/* Soft ground halo */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 460,
          height: 460,
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(78,206,152,0.11), rgba(46,148,116,0.035) 42%, rgba(0,0,0,0) 68%)",
          filter: "blur(10px)",
          animation: reduced ? undefined : "sp-halo 8s ease-in-out infinite",
        }}
      />
      <svg viewBox="0 0 720 720" width="720" height="720" fill="none" className="absolute inset-0">
        <defs>
          <radialGradient id="sp-globe" cx="42%" cy="38%" r="72%">
            <stop offset="0%" stopColor="rgba(120,233,192,0.13)" />
            <stop offset="55%" stopColor="rgba(46,148,116,0.065)" />
            <stop offset="100%" stopColor="rgba(8,20,15,0)" />
          </radialGradient>
          <linearGradient id="sp-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(120,233,192,0.0)" />
            <stop offset="50%" stopColor="rgba(120,233,192,0.30)" />
            <stop offset="100%" stopColor="rgba(120,233,192,0.0)" />
          </linearGradient>
        </defs>

        {/* Orbit rings — tight to the globe, drifting slowly */}
        <g style={{ transformOrigin: "360px 360px" }}>
          <ellipse
            cx="360" cy="360" rx="238" ry="86" stroke="url(#sp-ring)" strokeWidth="1"
            style={{ transformOrigin: "360px 360px", animation: reduced ? undefined : "sp-spin 56s linear infinite" }}
          />
          <ellipse
            cx="360" cy="360" rx="196" ry="120" stroke="rgba(95,230,175,0.09)" strokeWidth="0.9"
            style={{ transformOrigin: "360px 360px", transform: "rotate(24deg)", animation: reduced ? undefined : "sp-spin-rev 74s linear infinite" }}
          />
          {/* A dim travelling node on the outer orbit */}
          <circle r="2.3" fill="rgba(157,243,208,0.75)" style={{ offsetPath: "path('M 122 360 a 238 86 0 1 0 476 0 a 238 86 0 1 0 -476 0')", animation: reduced ? undefined : "sp-orbit-node 56s linear infinite", filter: "drop-shadow(0 0 4px rgba(120,233,192,0.5))" }} />
        </g>

        {/* Wire globe */}
        <g style={{ transformOrigin: "360px 360px" }}>
          <circle cx="360" cy="360" r="118" fill="url(#sp-globe)" stroke="rgba(120,233,192,0.18)" strokeWidth="1" />
          {/* Latitudes (static) */}
          {[-75, -38, 0, 38, 75].map((dy) => {
            const ry = Math.sqrt(Math.max(0, 118 * 118 - dy * dy));
            return <ellipse key={dy} cx="360" cy={360 + dy} rx={ry * 0.98} ry={ry * 0.26} stroke="rgba(95,230,175,0.10)" strokeWidth="0.7" />;
          })}
          {/* Meridians (rotating, so the globe reads as turning) */}
          <g style={{ transformOrigin: "360px 360px", animation: reduced ? undefined : "sp-globe-turn 34s linear infinite" }}>
            {[0.28, 0.62, 0.92].map((k, i) => (
              <ellipse key={i} cx="360" cy="360" rx={118 * k} ry="118" stroke="rgba(120,233,192,0.13)" strokeWidth="0.7" />
            ))}
            <line x1="360" y1="242" x2="360" y2="478" stroke="rgba(120,233,192,0.14)" strokeWidth="0.7" />
          </g>
        </g>
      </svg>
    </div>
  );
}
