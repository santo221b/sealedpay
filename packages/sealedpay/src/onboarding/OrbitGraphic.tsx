/**
 * OrbitGraphic — a subtle, slowly-constructing globe + orbit rings that floats
 * at the bottom-centre of the landing, partly below the fold. Deliberately
 * low-glow (a whisper, not the reference's blaze): concentric orbit ellipses
 * drift at different speeds, a wire-globe rotates its meridians, and a soft
 * radial halo breathes underneath. All CSS/SVG — no assets, reduced-motion safe.
 */
import { useReducedMotion } from "framer-motion";

export function OrbitGraphic() {
  const reduced = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{ bottom: "-38%", width: 940, height: 940, zIndex: 0 }}
    >
      {/* Soft ground halo */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 620,
          height: 620,
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(78,206,152,0.16), rgba(46,148,116,0.05) 42%, rgba(0,0,0,0) 68%)",
          filter: "blur(8px)",
          animation: reduced ? undefined : "sp-halo 7s ease-in-out infinite",
        }}
      />
      <svg viewBox="0 0 940 940" width="940" height="940" fill="none" className="absolute inset-0">
        <defs>
          <radialGradient id="sp-globe" cx="42%" cy="38%" r="72%">
            <stop offset="0%" stopColor="rgba(120,233,192,0.20)" />
            <stop offset="55%" stopColor="rgba(46,148,116,0.10)" />
            <stop offset="100%" stopColor="rgba(8,20,15,0)" />
          </radialGradient>
          <linearGradient id="sp-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(120,233,192,0.0)" />
            <stop offset="50%" stopColor="rgba(120,233,192,0.55)" />
            <stop offset="100%" stopColor="rgba(120,233,192,0.0)" />
          </linearGradient>
        </defs>

        {/* Orbit rings — tilted ellipses, each drifting at its own pace */}
        <g style={{ transformOrigin: "470px 470px" }}>
          <ellipse
            cx="470" cy="470" rx="430" ry="150" stroke="url(#sp-ring)" strokeWidth="1.2"
            style={{ transformOrigin: "470px 470px", animation: reduced ? undefined : "sp-spin 46s linear infinite" }}
          />
          <ellipse
            cx="470" cy="470" rx="360" ry="210" stroke="rgba(95,230,175,0.16)" strokeWidth="1"
            style={{ transformOrigin: "470px 470px", transform: "rotate(24deg)", animation: reduced ? undefined : "sp-spin-rev 62s linear infinite" }}
          />
          <ellipse
            cx="470" cy="470" rx="300" ry="300" stroke="rgba(95,230,175,0.10)" strokeWidth="1"
          />
          {/* A travelling node on the outer orbit */}
          <circle r="3.4" fill="#9df3d0" style={{ offsetPath: "path('M 40 470 a 430 150 0 1 0 860 0 a 430 150 0 1 0 -860 0')", animation: reduced ? undefined : "sp-orbit-node 46s linear infinite", filter: "drop-shadow(0 0 6px rgba(120,233,192,0.8))" }} />
        </g>

        {/* Wire globe */}
        <g style={{ transformOrigin: "470px 470px" }}>
          <circle cx="470" cy="470" r="150" fill="url(#sp-globe)" stroke="rgba(120,233,192,0.28)" strokeWidth="1.1" />
          {/* Latitudes (static) */}
          {[-96, -48, 0, 48, 96].map((dy) => {
            const ry = Math.sqrt(Math.max(0, 150 * 150 - dy * dy));
            return <ellipse key={dy} cx="470" cy={470 + dy} rx={ry * 0.98} ry={ry * 0.26} stroke="rgba(95,230,175,0.16)" strokeWidth="0.8" />;
          })}
          {/* Meridians (rotating, so the globe reads as turning) */}
          <g style={{ transformOrigin: "470px 470px", animation: reduced ? undefined : "sp-globe-turn 30s linear infinite" }}>
            {[0.28, 0.62, 0.92].map((k, i) => (
              <ellipse key={i} cx="470" cy="470" rx={150 * k} ry="150" stroke="rgba(120,233,192,0.20)" strokeWidth="0.8" />
            ))}
            <line x1="470" y1="320" x2="470" y2="620" stroke="rgba(120,233,192,0.22)" strokeWidth="0.8" />
          </g>
        </g>
      </svg>
    </div>
  );
}
