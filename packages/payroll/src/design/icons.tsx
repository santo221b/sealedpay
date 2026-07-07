/**
 * SealedPay icon set — every distinct inline SVG from the design extraction
 * (docs/design/extracted/data-assets.md §11), verbatim geometry.
 *
 * Conventions:
 * - All glyphs are aria-hidden decorative SVGs.
 * - `size` defaults come from the spec with odd 90%-scaled values rounded
 *   (14.4→14, 15.3→15, 10.8→11, 10.59→11, 11.56→12, 12.6→13, 16.2→16).
 * - `color` defaults to the spec's stroke/fill where it is fixed, and to
 *   `currentColor` where the spec marks the color as contextual.
 * - Rail glyphs (Home/Team/Insights/Bell/Gear/Logout) carry the spec's
 *   `drop-shadow(0 0 5.4px rgba(240,250,245,0.18))` glow; pass `glow={false}`
 *   for the non-rail reuses (modal icons) that omit it.
 */
import type { CSSProperties } from "react";

export interface GlyphProps {
  size?: number;
  className?: string;
  color?: string;
}

interface RailGlyphProps extends GlyphProps {
  /** Rail pucks add a faint white drop-shadow glow; modals reuse without it. */
  glow?: boolean;
}

const railGlow: CSSProperties = {
  filter: "drop-shadow(0 0 5.4px rgba(240,250,245,0.18))",
};

/* ── §11.1 Seal logo — lives in SealLogo.tsx, re-exported here ──────────── */
export { SealLogo } from "./SealLogo";

/* ── §11.2 Search (magnifier) — top-bar search field ────────────────────── */
export function SearchGlyph({ size = 14, className, color = "#9db3aa" }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.5" />
      <line x1="11" y1="11" x2="15" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── §11.3 Send / payout arrow — search "Payouts" result puck ───────────── */
export function SendGlyph({ size = 15, className, color = "#cfe5d8" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}

/* ── §11.4 Nav — Home (fill: #568570 selected / #9db3aa unselected) ─────── */
export function HomeNav({ size = 15, className, color = "#9db3aa", glow = true }: RailGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={glow ? railGlow : undefined}
      className={className}
      aria-hidden
    >
      <path
        d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732z"
        fill={color}
      />
    </svg>
  );
}

/* ── §11.5 Nav — Team / users (stroke is the dynamic nav color) ─────────── */
export function TeamNav({ size = 15, className, color = "#9db3aa", glow = true }: RailGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={glow ? railGlow : undefined}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/* ── §11.6 Nav — Insights / bar chart ───────────────────────────────────── */
export function InsightsNav({ size = 15, className, color = "#9db3aa", glow = true }: RailGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={glow ? railGlow : undefined}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <line x1="6" y1="20" x2="6" y2="12" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  );
}

/* ── §11.7 Bell — rail / payout reminder / permission prompt ────────────── */
export function BellGlyph({
  size = 15,
  className,
  color = "#9db3aa",
  glow = true,
  strokeWidth = 2,
}: RailGlyphProps & { strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={glow ? railGlow : undefined}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

/* ── §11.8 Gear / settings (rail) ───────────────────────────────────────── */
export function GearGlyph({ size = 15, className, color = "#9db3aa", glow = true }: RailGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={glow ? railGlow : undefined}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/* ── §11.9 Logout (door-arrow, ornate) — rail bottom / logout modal ─────── */
export function LogoutGlyph({ size = 15, className, color = "#9db3aa", glow = true }: RailGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill={color}
      style={glow ? railGlow : undefined}
      className={className}
      aria-hidden
    >
      <path d="M511.9 228.01s-.01-.08-.02-.12c-.06-.59-.15-1.18-.27-1.76 0-.04-.02-.08-.03-.13-.73-3.49-2.44-6.82-5.15-9.53l-68.06-68.06c-3.71-3.71-8.57-5.57-13.44-5.57s-9.72 1.85-13.43 5.56c-7.42 7.42-7.42 19.45 0 26.87l35.66 35.66H316.09c-10.49 0-19 8.51-19 19s8.51 19 19 19h130.99l-35.64 35.64c-7.42 7.42-7.42 19.45 0 26.87 3.71 3.71 8.57 5.57 13.43 5.57s9.72-1.85 13.43-5.57l67.68-67.68c2.42-2.28 4.24-5.17 5.21-8.45v-.02c.17-.57.31-1.15.43-1.74.02-.08.02-.17.04-.25.09-.51.17-1.02.22-1.54.04-.39.04-.77.06-1.16 0-.22.03-.43.03-.66v-.04c0-.63-.03-1.26-.1-1.89z" />
      <path d="M274.74 53.09c22.78 5.09 46.04 26.19 55.35 50.22 2.92 7.53 10.1 12.14 17.72 12.14 2.28 0 4.61-.42 6.86-1.29 9.78-3.79 14.64-14.8 10.85-24.58-14.02-36.18-47.25-65.77-82.68-73.61l-.24-.05c-29.27-6.08-59.57-9.07-92.62-9.13-33.07.06-63.37 3.04-92.69 9.13l-.25.05c-18.62 4.12-36.44 14.21-51.2 27.88-3.82 2.81-7.25 6.44-10.32 10.72-.5.59-.98 1.2-1.43 1.82C21.84 71.23 12.94 88.74 9.41 106.9 4.81 130.02-.4 189.94.02 229.93c-.23 21.46 1.17 48.66 3.22 72.83 1.1 15.5 2.35 28.98 3.56 37.66 5.91 43.73 32.8 92.23 62.56 112.84l.17.12c20.9 14.08 42.5 25.43 66.1 34.71 23.54 9.14 45.15 14.68 66.05 16.94l.17.02c1.32.12 2.65.18 3.96.18 26.52 0 50.05-23.74 57.41-57.72v-.01c6.51-1.04 12.96-2.21 19.36-3.54l.24-.05c35.43-7.84 68.66-37.43 82.68-73.61 3.79-9.78-1.07-20.79-10.85-24.58-2.26-.88-4.58-1.29-6.86-1.29-7.62 0-14.8 4.61-17.72 12.14-9.31 24.02-32.57 45.12-55.35 50.22-2.3.48-4.61.92-6.91 1.36 1.98-25.72 3.48-58.61 3.29-83.98.3-38.76-3.41-98.45-6.7-122.2-5.91-43.73-32.8-92.23-62.56-112.84l-.17-.12c-20.88-14.07-42.49-25.42-66.1-34.71-4.15-1.61-8.24-3.11-12.28-4.5h-.03c21.17-3.35 42.78-4.96 66.7-5 30.33.05 58.08 2.77 84.76 8.31zm-94.43 67.33c9.52 6.63 19.92 19.33 28.54 34.88 9.31 16.79 15.67 35.17 17.91 51.75 0 .04.01.08.02.12 3.09 22.32 6.62 80.55 6.34 116.69v.59c.17 22.14-1.05 53.1-3.18 80.79l-.06.86c-.46 8.39-1.88 24.82-3.74 33.13-.02.08-.03.15-.05.23-3.93 18.12-14.3 27.77-20.28 27.77-.14 0-.28 0-.42-.01-17.42-1.92-35.72-6.67-55.93-14.51-20.91-8.23-40.08-18.29-58.6-30.76-9.51-6.64-19.89-19.33-28.5-34.85-9.31-16.79-15.67-35.17-17.91-51.75 0-.04-.01-.08-.02-.12-1.05-7.55-2.25-20.36-3.29-35.14-.01-.18-.03-.35-.04-.53-2.16-25.41-3.28-50.64-3.09-69.22v-.8c-.41-39.54 4.89-96.26 8.66-115.2.01-.06.02-.12.03-.17 2.3-11.8 8.6-24.19 17.75-34.87.41-.47.8-.96 1.19-1.45.85-.1 2.1-.19 3.83-.19 14.55 0 34.85 5.83 41.48 8.08 3.6 1.24 7.23 2.57 10.8 3.96 20.91 8.23 40.06 18.28 58.55 30.73z" />
    </svg>
  );
}

/* ── §11.10 Chevron-right — "View All" links ────────────────────────────── */
export function ChevronRightGlyph({ size = 11, className, color = "#9db3aa" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ── §11.11 Lock / padlock — Encrypted pucks, pills, Reveal, drifting lock ─ */
export function PadlockGlyph({ size = 11, className, color = "currentColor" }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} className={className} aria-hidden>
      <path d="M75.745 37.602v-9.31c0-14.186-11.59-25.792-25.793-25.792S24.144 14.106 24.144 28.292v9.31c-6.998.602-12.397 6.397-12.397 13.601v32.601A13.65 13.65 0 0 0 25.442 97.5h49.116a13.65 13.65 0 0 0 13.695-13.696v-32.6c0-7.205-5.51-13-12.508-13.602zM54.861 72.12v4.374c0 1.3-1.054 2.355-2.355 2.355h-5.012a2.355 2.355 0 0 1-2.355-2.355V72.12a8.821 8.821 0 0 1-4.021-7.426c0-4.892 3.974-8.882 8.882-8.882s8.882 3.99 8.882 8.882c0 3.12-1.599 5.859-4.021 7.426zm7.79-34.722H37.254v-9.105c0-6.998 5.7-12.698 12.698-12.698 6.999 0 12.699 5.7 12.699 12.698v9.105z" />
    </svg>
  );
}

/* ── §11.12 Verified check-circle (the workhorse glyph) ─────────────────── */
export function CheckGlyph({ size = 12, className, color = "currentColor" }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill={color} className={className} aria-hidden>
      <path d="M16 1C7.72 1 1 7.72 1 16s6.72 15 15 15 15-6.72 15-15S24.28 1 16 1zm7.5 12.32-7 8c-.39.45-.94.68-1.5.68-.44 0-.88-.14-1.25-.44l-5-4a2.001 2.001 0 0 1-.079-3.055c.742-.666 1.889-.617 2.667.005l3.044 2.436a.493.493 0 0 0 .678-.06l5.44-6.206c.72-.83 1.99-.91 2.82-.18.83.72.91 1.99.18 2.82z" />
    </svg>
  );
}

/* ── §11.13 Play triangle — "Run payroll" primary button ────────────────── */
export function PlayGlyph({ size = 14, className, color = "#0b1512" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

/* ── §11.14 Chevron-left — Employee View "Back" button ──────────────────── */
export function ChevronLeftGlyph({ size = 13, className, color = "currentColor" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/* ── §11.15 Receipt-with-check — history pucks + "Payroll run" rows ─────── */
export function ReceiptCheckGlyph({ size = 17, className, color = "#cfe5d8" }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="1 1 22 22" fill={color} className={className} aria-hidden>
      <path d="M17 22.75A5.75 5.75 0 1 1 22.75 17 5.757 5.757 0 0 1 17 22.75zm0-10A4.25 4.25 0 1 0 21.25 17 4.255 4.255 0 0 0 17 12.75z" />
      <path d="M16 22.75H4A2.752 2.752 0 0 1 1.25 20V4A2.752 2.752 0 0 1 4 1.25h12A2.752 2.752 0 0 1 18.75 4v8.1a.75.75 0 1 1-1.5 0V4A1.252 1.252 0 0 0 16 2.75H4A1.252 1.252 0 0 0 2.75 4v16A1.252 1.252 0 0 0 4 21.25h12a.948.948 0 0 0 .229-.021.764.764 0 0 1 .926.731.746.746 0 0 1-.643.743 2.521 2.521 0 0 1-.512.047z" />
      <path d="M13 7.75H6a.75.75 0 0 1 0-1.5h7a.75.75 0 0 1 0 1.5zM11 11.75H6a.75.75 0 0 1 0-1.5h5a.75.75 0 0 1 0 1.5zM16.5 18.75a.744.744 0 0 1-.53-.22l-1-1a.75.75 0 1 1 1.06-1.06l.47.469 1.47-1.469a.75.75 0 1 1 1.06 1.06l-2 2a.744.744 0 0 1-.53.22z" />
    </svg>
  );
}

/* ── §11.16 Eye — wallet balance reveal toggle ──────────────────────────── */
export function EyeGlyph({ size = 13, className, color = "rgba(240,250,245,0.9)" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ── §11.17 Plus — Fund button (white circle on balance card) ───────────── */
export function PlusGlyph({ size = 16, className, color = "#14503b" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ── §11.18 Person-plus — "Employee added" activity row ─────────────────── */
export function PersonPlusGlyph({ size = 16, className, color = "#cfe5d8" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

/* ── §11.19 Key — "Operator authorized" activity row ────────────────────── */
export function KeyGlyph({ size = 16, className, color = "#cfe5d8" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

/* ── §11.20 Deposit-box (box + down-arrow) — "Funds deposited" row ──────── */
export function DepositBoxGlyph({ size = 17, className, color = "#cfe5d8" }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill={color} className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M25 19h2a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3h2V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3zM7 21H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1h-2v2h1a1 1 0 0 1 0 2H6a1 1 0 1 1 0-2h1zm16 2V5a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1v18zm-7.555-2.167-3-2.001a1 1 0 0 1 1.11-1.664l1.445.963V13a1 1 0 0 1 2 0v5.131l1.445-.963a1.001 1.001 0 0 1 1.11 1.663l-3 2.001c-.164.108-.356.168-.555.168s-.391-.06-.555-.168z"
      />
    </svg>
  );
}

/** Alias — the design's only wallet-funds glyph is the deposit box (§11.20). */
export const WalletGlyph = DepositBoxGlyph;

/* ── §11.21 Person-with-key — Run Payroll Authorize hero icon ───────────── */
export function PersonKeyGlyph({ size = 30, className, color = "#78e9c0" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="1 1 22 22"
      fill={color}
      fillRule="evenodd"
      className={className}
      aria-hidden
    >
      <circle cx="11.5" cy="6.744" r="5.5" />
      <path d="M11.25 21.756v-2.055c0-.465.184-.91.513-1.238l1.99-1.99a4.991 4.991 0 0 1 .908-3.106 18.9 18.9 0 0 0-3.161-.261c-3.322 0-6.263.831-8.089 2.076-1.393.95-2.161 2.157-2.161 3.424v1.45a1.697 1.697 0 0 0 1.7 1.7z" />
      <path d="M18.152 20.208a4.003 4.003 0 1 0-2.233-6.786 3.997 3.997 0 0 0-1.127 3.427L12.47 19.17a.75.75 0 0 0-.22.531V22c0 .414.336.75.75.75h2.299a.75.75 0 0 0 .531-.22zm-.17-3.19a1.085 1.085 0 1 1 1.535-1.533 1.085 1.085 0 0 1-1.535 1.533z" />
    </svg>
  );
}

/* ── §11.22 Checkbox check — Run Payroll checklist rows ─────────────────── */
/** Opacity toggling (checked/unchecked) is animated by the consumer. */
export function CheckboxCheckGlyph({ size = 12, className, color = "#0b1512" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Seal-document + check-circle — success finale (56×56) ──────────────── */
/** The check-pop entrance is animated by the consumer (framer-motion). */
export function DocCheckGlyph({ size = 56, className, color = "#5fe3ab" }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill={color} className={className} aria-hidden>
      <path d="M17.75 22a.75.75 0 0 1 .75-.75h28a.75.75 0 0 1 0 1.5h-28a.75.75 0 0 1-.75-.75zm.75-6.25h28a.75.75 0 0 0 0-1.5h-28a.75.75 0 0 0 0 1.5zM60.75 43c0 9.788-7.963 17.75-17.75 17.75H8c-2.62 0-4.75-2.13-4.75-4.75V44a.75.75 0 0 1 .75-.75h7.25V5.74c0-.632.328-1.198.876-1.513a1.737 1.737 0 0 1 1.76.004l3.104 1.822a.235.235 0 0 0 .257.002l4.115-2.403a1.72 1.72 0 0 1 1.78.003l4.097 2.398a.233.233 0 0 0 .258.002l4.104-2.403a1.725 1.725 0 0 1 1.782.003l4.095 2.398c.09.053.175.052.26.002l4.124-2.403a1.692 1.692 0 0 1 1.77.008l4.115 2.392c.084.051.162.05.231.008l3.145-1.829a1.723 1.723 0 0 1 1.745-.008c.552.315.882.882.882 1.517V28.91c4.245 3.246 7 8.346 7 14.09zM8 59.25A3.254 3.254 0 0 0 11.25 56V44.75h-6.5V56A3.254 3.254 0 0 0 8 59.25zm27.884 0a17.839 17.839 0 0 1-8.828-8.5H18.5a.75.75 0 0 1 0-1.5h7.908a17.615 17.615 0 0 1-1.12-5.5H18.5a.75.75 0 0 1 0-1.5h6.788c.081-1.93.468-3.777 1.12-5.5H18.5a.75.75 0 0 1 0-1.5h8.556a17.823 17.823 0 0 1 4.174-5.5H18.5a.75.75 0 0 1 0-1.5h14.641a17.645 17.645 0 0 1 19.11-.37V5.74a.24.24 0 0 0-.127-.214.234.234 0 0 0-.243 0l-3.134 1.823a1.695 1.695 0 0 1-1.77-.01l-4.114-2.39c-.084-.052-.163-.052-.23-.01l-4.135 2.41a1.726 1.726 0 0 1-1.781-.004L32.62 4.947a.233.233 0 0 0-.258-.002l-4.104 2.403a1.726 1.726 0 0 1-1.781-.003L22.38 4.947a.234.234 0 0 0-.258-.002l-4.115 2.403a1.725 1.725 0 0 1-1.78-.003L13.13 5.527a.244.244 0 0 0-.255 0 .238.238 0 0 0-.125.213V56c0 1.26-.501 2.4-1.304 3.25h24.438zM59.25 43c0-8.96-7.29-16.25-16.25-16.25S26.75 34.04 26.75 43 34.04 59.25 43 59.25 59.25 51.96 59.25 43zm-7.588-6.187L41.056 47.419a.25.25 0 0 1-.354 0l-6.364-6.363a.75.75 0 1 0-1.06 1.06l6.364 6.364c.34.341.789.512 1.237.512s.897-.17 1.237-.512l10.607-10.606a.75.75 0 1 0-1.06-1.061z" />
    </svg>
  );
}

/* ── Calendar — named in the handoff icon list (README §Assets) but not ──
   captured in §11; drawn locally to match the 2px round-cap stroke style. */
export function CalendarGlyph({ size = 15, className, color = "currentColor" }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
