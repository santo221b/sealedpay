/**
 * Persisted preferences + onboarding identity.
 * Keys `sealedpay_name` / `sealedpay_avatar` / `sealedpay_onboarded` are
 * mandated by the design handoff (onboarding writes them; the dashboard
 * profile reads them).
 */
import { useCallback, useEffect, useState } from "react";

export const IDENTITY_KEYS = {
  name: "sealedpay_name",
  avatar: "sealedpay_avatar",
  onboarded: "sealedpay_onboarded",
} as const;

export interface Identity {
  name: string;
  avatar: string; // avatar asset path, e.g. /avatars/avatar-1.svg
  onboarded: boolean;
}

export function loadIdentity(): Identity {
  return {
    name: localStorage.getItem(IDENTITY_KEYS.name) ?? "",
    avatar: localStorage.getItem(IDENTITY_KEYS.avatar) ?? "/avatars/avatar-profile.svg",
    onboarded: localStorage.getItem(IDENTITY_KEYS.onboarded) === "1",
  };
}

export function saveIdentity(name: string, avatar: string) {
  localStorage.setItem(IDENTITY_KEYS.name, name);
  localStorage.setItem(IDENTITY_KEYS.avatar, avatar);
  localStorage.setItem(IDENTITY_KEYS.onboarded, "1");
}

/**
 * Wipe all local demo state (identity, settings, employees, history, seed
 * markers) and reload — so a shared URL starts clean for the next visitor and
 * one judge's edits don't leak into the next.
 */
export function resetDemo() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith("sealedpay_") || k.startsWith("dispersekit.payroll.")) localStorage.removeItem(k);
  }
  location.reload();
}

const SETTINGS_KEY = "sealedpay_settings.v1";

export interface Settings {
  /** Amounts start masked everywhere; reveals still work on top. */
  maskDefault: boolean;
  /** Payout reminder toggle (display-only cadence stays display-only). */
  reminders: boolean;
  /** Run the decrypt-verify step automatically after a payout. */
  autoverify: boolean;
  /** Reminder set on the Next payout card. */
  reminderSet: boolean;
}

const DEFAULT_SETTINGS: Settings = { maskDefault: true, reminders: true, autoverify: true, reminderSet: false };

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);
  return { settings, set };
}
