/**
 * White-label theming. A partner passes a small object; we translate it to
 * CSS variables scoped to the widget root, so restyling never needs a
 * stylesheet override or an iframe.
 */
export interface DisperseTheme {
  /** Primary action color (buttons, focus, progress). */
  accent?: string;
  /** Text color on top of `accent`. */
  accentText?: string;
  /** Card background. */
  background?: string;
  /** Inset surfaces: inputs, table rows, code chips. */
  surface?: string;
  /** Primary text. */
  text?: string;
  /** Secondary text. */
  muted?: string;
  /** Hairline borders. */
  border?: string;
  /** Corner radius of the card and controls, e.g. "16px". */
  radius?: string;
  /** Font stack; inherits the host app's font by default. */
  font?: string;
}

/** DisperseKit default: warm, calm, trustworthy (peach / coral / cream). */
export const defaultTheme: Required<DisperseTheme> = {
  accent: "#f97316",
  accentText: "#ffffff",
  background: "#fffbf5",
  surface: "#fff3e4",
  text: "#3d2c23",
  muted: "#a08877",
  border: "#f3e3d3",
  radius: "18px",
  font: "inherit",
};

export function themeToCssVars(theme: DisperseTheme | undefined): Record<string, string> {
  const t = { ...defaultTheme, ...theme };
  return {
    "--dk-accent": t.accent,
    "--dk-accent-text": t.accentText,
    "--dk-bg": t.background,
    "--dk-surface": t.surface,
    "--dk-text": t.text,
    "--dk-muted": t.muted,
    "--dk-border": t.border,
    "--dk-radius": t.radius,
    "--dk-font": t.font,
  };
}
