/**
 * Floating transparent top bar (dashboard handoff §Top bar).
 * ONLY three things: the logo block (left), the search field (center), and
 * the profile avatar (right, pushed by margin-left:auto). Notifications and
 * Settings live in the side rail, NOT here.
 *
 * The search field is a real input in a `position:relative; z-index:60`
 * container; the results dropdown renders inside it (see SearchPalette), with
 * its dimming overlay at z-index -1 so the bar stays visible above the dim.
 */
import { motion, useReducedMotion } from "framer-motion";

import { SealLogo, SearchGlyph } from "../design/icons";
import { tokens } from "../design/tokens";
import type { Person, RunView } from "./contracts";
import { SearchPalette } from "./modals/SearchPalette";

export function TopBar({
  profile,
  onProfile,
  walletControl,
  search,
}: {
  profile: { name: string; avatar: string };
  onProfile: () => void;
  /** Connect / reconnect / switch-network control (owns the wallet state). */
  walletControl?: React.ReactNode;
  search: {
    open: boolean;
    query: string;
    setQuery: (q: string) => void;
    onOpen: () => void;
    onClose: () => void;
    people: Person[];
    runs: RunView[];
    onPickPerson: (id: string) => void;
    onPickRun: (month: string) => void;
  };
}) {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-x-0 top-0 z-40 flex items-center" style={{ gap: 22, padding: "16px 32px 9px 45px" }}>
      {/* Logo block */}
      <div className="flex items-center" style={{ gap: 9 }}>
        <SealLogo size={31} />
        <span style={{ fontWeight: 700, fontSize: 14, color: tokens.text.heading }}>SealedPay</span>
      </div>

      {/* Search field + its dropdown, lifted above the dimming overlay via z-60 */}
      <div className="relative" style={{ zIndex: 60, marginLeft: 32 }}>
        <div
          className="flex items-center"
          style={{
            gap: 9,
            width: 306,
            border: `1px solid ${tokens.glass.railBorder}`,
            background: tokens.glass.rail,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: tokens.glass.cardShadow,
            borderRadius: tokens.radius.pill,
            padding: "11px 18px",
          }}
        >
          <SearchGlyph size={14} />
          <input
            value={search.query}
            onFocus={search.onOpen}
            onChange={(e) => search.setQuery(e.target.value)}
            placeholder="Search employees or payouts"
            aria-label="Search employees or payouts"
            className="flex-1 bg-transparent outline-none"
            style={{ color: "#e8f0ec", fontSize: 12, fontFamily: "'Manrope', sans-serif" }}
          />
        </div>

        <SearchPalette
          open={search.open}
          onClose={search.onClose}
          query={search.query}
          setQuery={search.setQuery}
          people={search.people}
          runs={search.runs}
          onPickPerson={search.onPickPerson}
          onPickRun={search.onPickRun}
        />
      </div>

      {/* Right cluster: wallet control (connect / switch network) + profile avatar */}
      <div className="ml-auto flex items-center" style={{ gap: 14 }}>
        {walletControl}
        <motion.img
          src={profile.avatar}
          alt={`${profile.name} profile`}
          onClick={onProfile}
          whileHover={reduced ? undefined : { scale: 1.06, rotate: -2.5, filter: "drop-shadow(0 6px 14px rgba(59,191,142,0.45))" }}
          transition={{ duration: 0.3 }}
          className="cursor-pointer rounded-full object-cover"
          style={{ width: 40, height: 40, border: "2px solid rgba(255,255,255,0.15)", background: "linear-gradient(135deg,#34d399,#0e9f6e)" }}
        />
      </div>
    </div>
  );
}
