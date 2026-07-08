/**
 * CloseButton — the shared ✕ affordance for modals/popovers.
 *
 * A generous 34px hit area with a spring hover/tap so every close control in
 * the app feels the same and is easy to hit. Reduced-motion drops the springs.
 */
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";

export function CloseButton({
  onClick,
  className = "",
  style,
  size = 34,
}: {
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
  /** Outer hit-area diameter (px). The glyph scales with it. */
  size?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Close"
      whileHover={reduced ? undefined : { scale: 1.12, backgroundColor: "rgba(255,255,255,0.14)" }}
      whileTap={reduced ? undefined : { scale: 0.9 }}
      className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${className}`}
      style={{ width: size, height: size, background: "rgba(255,255,255,0.06)", color: "#9db3aa", ...style }}
    >
      <svg
        width={Math.round(size * 0.44)}
        height={Math.round(size * 0.44)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </motion.button>
  );
}
