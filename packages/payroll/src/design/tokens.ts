/**
 * SealedPay design tokens — verbatim from the design handoff README
 * (docs/design/handoff/README.md §Design Tokens). The design is the source
 * of truth; change values there-first, here-second.
 */
export const tokens = {
  bg: {
    body: "#070d0b",
    // Top edge starts at the onboarding's near-black (#070c0a) so the Safari
    // toolbar blends with it, then eases into the dashboard tone by ~7%.
    app: "linear-gradient(180deg, #070c0a 0%, #0c1310 7%, #101915 50%, #0d1411 100%)",
    scrim: "#0D1411F2",
  },
  accent: {
    primary: "#5fe3ab",
    pillText: "#78e9c0",
    liveDot: "#34d399",
    puckBg: "rgba(59,191,142,0.18)",
    pillBorder: "rgba(95,230,175,0.55)",
  },
  warn: {
    pendingText: "#e6c082",
    pendingBorder: "rgba(224,178,95,0.6)",
    dangerBg: "rgba(224,110,98,0.1)",
    dangerBorder: "rgba(224,110,98,0.5)",
    dangerText: "#eb8f85",
  },
  text: {
    heading: "#f2f7f4",
    nearWhite: "#eef4f1",
    secondary: "#cfdcd6",
    muted: "#9db3aa",
    subtle: "#9eada5",
    dimmest: "#7b8f85",
    onAccent: "#f5f8f6",
    onAccentDark: "#14503b",
  },
  glass: {
    card: "rgba(110,196,186,0.16)",
    cardDim: "rgba(110,196,186,0.07)",
    rail: "rgba(110,196,186,0.06)",
    railBorder: "rgba(225,248,238,0.045)",
    cardShadow:
      "inset 0 7.2px 12.6px -7.2px rgba(255,255,255,0.056), inset 8.1px 0 16.2px -10.8px rgba(150,235,255,0.032), inset -8.1px -7.2px 16.2px -10.8px rgba(255,160,225,0.026)",
    buttonGlow: "0 0 0 1px rgba(120,233,192,0.4), 0 6px 22px -6px rgba(59,191,142,0.6)",
  },
  radius: {
    card: 22,
    modal: 26,
    search: 28,
    control: 14,
    pill: 899,
  },
} as const;

/** Framer Motion signatures shared app-wide (README §Animation Inventory). */
export const motionTokens = {
  springPanel: { type: "spring", stiffness: 400, damping: 30 } as const,
  springPop: { type: "spring", stiffness: 500, damping: 30 } as const,
  easeEnter: [0.22, 1, 0.36, 1] as const,
  easeExit: [0.4, 0, 1, 1] as const,
};
