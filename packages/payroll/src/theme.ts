/**
 * Engine-facing theme: DisperseKit CSS variables + the RainbowKit accent,
 * matched to the SealedPay design tokens (wallet modals pick up the green).
 */
import type { DisperseTheme } from "@dispersekit/widget";

export const sealedTheme: DisperseTheme = {
  accent: "#5fe3ab",
  accentText: "#0b1512",
  background: "#121d1a",
  surface: "#0f1815",
  text: "#f2f7f4",
  muted: "#9db3aa",
  border: "rgba(255,255,255,0.11)",
  radius: "16px",
};
