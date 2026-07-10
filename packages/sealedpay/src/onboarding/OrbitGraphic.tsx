/**
 * OrbitGraphic — a planet horizon rising from the bottom-centre of the landing.
 *
 * The globe sits mostly below the viewport edge like a sunrise and SCALES UP
 * from the bottom on entry (transform-origin at its base). Deliberately a
 * whisper: the sphere is clean (a soft fill + an atmospheric rim — a wide
 * blurred glow band under a faint hairline, no lines inside) — the detail
 * lives OUTSIDE, in the drifting orbit rings and one dim travelling node.
 * Reduced-motion safe.
 */
import { motion, useReducedMotion } from "framer-motion";

export function OrbitGraphic() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2"
      style={{ bottom: "-69%", width: 1150, height: 1150, x: "-50%", zIndex: 0, transformOrigin: "50% 100%" }}
      initial={reduced ? false : { scale: 0.72, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.75 }}
      transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Soft horizon halo */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 720,
          height: 720,
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(78,206,152,0.063), rgba(46,148,116,0.018) 44%, rgba(0,0,0,0) 68%)",
          filter: "blur(12px)",
          animation: reduced ? undefined : "sp-halo 8s ease-in-out infinite",
        }}
      />
      <svg viewBox="0 0 1150 1150" width="1150" height="1150" fill="none" className="absolute inset-0">
        <defs>
          <radialGradient id="sp-globe" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="rgba(120,233,192,0.072)" />
            <stop offset="55%" stopColor="rgba(46,148,116,0.036)" />
            <stop offset="100%" stopColor="rgba(8,20,15,0)" />
          </radialGradient>
          <linearGradient id="sp-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(120,233,192,0.0)" />
            <stop offset="50%" stopColor="rgba(120,233,192,0.099)" />
            <stop offset="100%" stopColor="rgba(120,233,192,0.0)" />
          </linearGradient>
          {/* Soft blur for the atmospheric rim band. */}
          <filter id="sp-atmo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Orbit rings — the detail lives out here */}
        <g style={{ transformOrigin: "575px 575px" }}>
          <ellipse
            cx="575" cy="575" rx="430" ry="150" stroke="url(#sp-ring)" strokeWidth="1"
            style={{ transformOrigin: "575px 575px", animation: reduced ? undefined : "sp-spin 60s linear infinite" }}
          />
          <ellipse
            cx="575" cy="575" rx="352" ry="212" stroke="rgba(95,230,175,0.036)" strokeWidth="0.9"
            style={{ transformOrigin: "575px 575px", transform: "rotate(24deg)", animation: reduced ? undefined : "sp-spin-rev 80s linear infinite" }}
          />
          {/* A dim travelling node on the outer orbit */}
          <circle r="2.4" fill="rgba(157,243,208,0.55)" style={{ offsetPath: "path('M 145 575 a 430 150 0 1 0 860 0 a 430 150 0 1 0 -860 0')", animation: reduced ? undefined : "sp-orbit-node 60s linear infinite", filter: "drop-shadow(0 0 4px rgba(120,233,192,0.35))" }} />
        </g>

        {/* The globe — a clean sphere with an ATMOSPHERIC rim: a wide blurred
            glow band hugging the edge, capped by a faint hairline. Nothing
            drawn inside the sphere. */}
        <g style={{ transformOrigin: "575px 575px" }}>
          <circle cx="575" cy="575" r="215" fill="url(#sp-globe)" />
          <circle cx="575" cy="575" r="214" fill="none" stroke="rgba(120,233,192,0.126)" strokeWidth="5" filter="url(#sp-atmo)" />
          <circle cx="575" cy="575" r="215" fill="none" stroke="rgba(150,240,205,0.09)" strokeWidth="1" />
        </g>
      </svg>
    </motion.div>
  );
}
