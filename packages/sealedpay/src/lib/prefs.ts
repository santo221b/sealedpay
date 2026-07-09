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
 * Logout returns the employer to the onboarding front door: clear only the
 * onboarded flag (so a reload stays on onboarding) while keeping name and
 * avatar, so the flow pre-fills for a returning employer.
 */
export function clearOnboarded() {
  localStorage.removeItem(IDENTITY_KEYS.onboarded);
}

/**
 * Once the employer clears the pre-loaded demo team + history, the dashboard
 * shows only their real data. Persisted so it survives reloads.
 */
const SAMPLES_CLEARED_KEY = "sealedpay_samples_cleared";

/**
 * Which door the user came through on the landing page. One email can be both
 * an employer and an employee; the door only picks the default surface — a
 * switcher in the profile menu flips it any time.
 */
export type Door = "employer" | "employee";
const DOOR_KEY = "sealedpay_door";

export function loadDoor(): Door | null {
  const v = localStorage.getItem(DOOR_KEY);
  return v === "employer" || v === "employee" ? v : null;
}

export function saveDoor(door: Door) {
  localStorage.setItem(DOOR_KEY, door);
}

export function clearDoor() {
  localStorage.removeItem(DOOR_KEY);
}

/** Employee-side onboarding flag — separate from the employer's, so someone
 * who is both sees each flow exactly once. */
const EMPLOYEE_ONBOARDED_KEY = "sealedpay_employee_onboarded";

export function loadEmployeeOnboarded(): boolean {
  return localStorage.getItem(EMPLOYEE_ONBOARDED_KEY) === "1";
}

export function setEmployeeOnboarded(v: boolean) {
  if (v) localStorage.setItem(EMPLOYEE_ONBOARDED_KEY, "1");
  else localStorage.removeItem(EMPLOYEE_ONBOARDED_KEY);
}

export function loadSamplesCleared(): boolean {
  return localStorage.getItem(SAMPLES_CLEARED_KEY) === "1";
}

export function setSamplesClearedPref(value: boolean) {
  if (value) localStorage.setItem(SAMPLES_CLEARED_KEY, "1");
  else localStorage.removeItem(SAMPLES_CLEARED_KEY);
}

/**
 * First-run guided tour: shown once after onboarding, then remembered so it
 * does not reappear on reload. `resetDemo` clears it (fresh visitor gets it).
 */
const TOUR_SEEN_KEY = "sealedpay_tour_seen";

export function loadTourSeen(): boolean {
  return localStorage.getItem(TOUR_SEEN_KEY) === "1";
}

export function setTourSeenPref(value: boolean) {
  if (value) localStorage.setItem(TOUR_SEEN_KEY, "1");
  else localStorage.removeItem(TOUR_SEEN_KEY);
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
