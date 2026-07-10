/**
 * Session epoch — the "log out every browser that predates this release"
 * switch. BUMP THE NUMBER when a release breaks previously-stored client
 * state (login shape, cached roster/profile format, onboarding flags): every
 * browser whose stored epoch is older gets a clean slate on its next page
 * load — all sealedpay_*, Privy, wagmi, and WalletConnect keys are cleared
 * BEFORE React mounts, so stale state never renders against the new UI and
 * the user simply lands on the landing page signed out.
 *
 * Deploys that DON'T break stored state should NOT bump this — nobody gets
 * logged out for a copy tweak.
 *
 * A missing epoch counts as stale (pre-epoch browsers carry unknown state).
 * Fresh browsers with no app keys at all just adopt the current epoch.
 */
export const SESSION_EPOCH = 1;

const EPOCH_KEY = "sealedpay_epoch";
const STALE_PREFIXES = ["sealedpay_", "privy:", "wagmi", "wc@", "WALLETCONNECT"];

export function enforceSessionEpoch(): void {
  let store: Storage;
  try {
    store = window.localStorage;
    store.getItem(EPOCH_KEY);
  } catch {
    return; // storage unavailable (privacy mode) — nothing stale to clear
  }

  const stored = Number(store.getItem(EPOCH_KEY) ?? 0);
  if (stored >= SESSION_EPOCH) return;

  // Missing epoch + zero app keys = a genuinely fresh browser: adopt quietly.
  const keys = Object.keys(store);
  const hasAppState = keys.some((k) => k !== EPOCH_KEY && STALE_PREFIXES.some((p) => k.startsWith(p)));
  if (hasAppState) {
    for (const k of keys) {
      if (k !== EPOCH_KEY && STALE_PREFIXES.some((p) => k.startsWith(p))) store.removeItem(k);
    }
  }
  store.setItem(EPOCH_KEY, String(SESSION_EPOCH));
}

/** Future-proofing for OPEN tabs: when a newer tab (new deploy) bumps the
 * epoch, tabs still running this bundle reload themselves and take the
 * page-load path above. (Tabs on builds older than this file can't be
 * reached — nothing in their code listens.) */
export function watchSessionEpoch(): void {
  window.addEventListener("storage", (e) => {
    if (e.key === EPOCH_KEY && Number(e.newValue ?? 0) > SESSION_EPOCH) window.location.reload();
  });
}
