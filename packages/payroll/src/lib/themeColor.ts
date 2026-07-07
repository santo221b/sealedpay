/**
 * Tint the browser chrome (Safari toolbar, Chrome mobile) to match the current
 * screen's top edge, so the toolbar reads as part of the page instead of a
 * separate block. Each top-level screen sets its own top-of-page colour.
 */
export function setThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

/** Top-of-page colours per screen (the very first stop of each background). */
export const THEME_COLORS = {
  onboarding: "#070c0a",
  dashboard: "#0c1310",
  recipient: "#070d0b",
  signedOut: "#0b1210",
} as const;
