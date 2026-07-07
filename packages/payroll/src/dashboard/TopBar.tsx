/**
 * Floating transparent top bar — shell chrome (dashboard-screens.md §1.3).
 * Logo block, center search field (non-typing trigger for the command
 * palette), right cluster (bell, gear, profile avatar). The scroll-fade
 * backdrop belongs to the App shell.
 */
import { motion, useReducedMotion } from "framer-motion";

import { BellGlyph, GearGlyph, SealLogo, SearchGlyph } from "../design/icons";
import { tokens } from "../design/tokens";

export function TopBar({
  profile,
  onSearchFocus,
  onBell,
  onGear,
  onProfile,
  searchRefCallback,
}: {
  profile: { name: string; avatar: string };
  onSearchFocus: () => void;
  onBell: () => void;
  onGear: () => void;
  onProfile: () => void;
  searchRefCallback?: (el: HTMLElement | null) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-x-0 top-0 z-40 flex items-center" style={{ gap: 22, padding: "16px 32px 9px 32px" }}>
      {/* Logo block */}
      <div className="flex items-center" style={{ gap: 9 }}>
        <SealLogo size={31} />
        <span style={{ fontWeight: 700, fontSize: 14, color: tokens.text.heading }}>SealedPay</span>
      </div>

      {/* Center search field — a trigger, not a real input; the palette owns typing */}
      <div className="relative z-[60]" style={{ marginLeft: 32 }} ref={searchRefCallback}>
        <button
          type="button"
          aria-label="Search employees or payouts"
          onFocus={onSearchFocus}
          onClick={onSearchFocus}
          className="flex items-center text-left"
          style={{
            gap: 9,
            width: 306,
            border: `1px solid ${tokens.glass.railBorder}`,
            background: tokens.glass.rail,
            backdropFilter: "blur(12px)",
            boxShadow: tokens.glass.cardShadow,
            borderRadius: tokens.radius.pill,
            padding: "11px 18px",
            cursor: "text",
          }}
        >
          <SearchGlyph size={14} />
          <span className="flex-1" style={{ fontSize: 12, color: "#566a61" }}>
            Search employees or payouts
          </span>
        </button>
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center" style={{ gap: 13 }}>
        <button
          type="button"
          aria-label="Notifications"
          onClick={onBell}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[rgba(95,230,175,0.1)]"
        >
          <BellGlyph size={15} />
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={onGear}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[rgba(95,230,175,0.1)]"
        >
          <GearGlyph size={15} />
        </button>
        <motion.img
          src={profile.avatar}
          alt={`${profile.name} profile`}
          onClick={onProfile}
          whileHover={
            reduced
              ? undefined
              : { scale: 1.06, rotate: -2.5, filter: "drop-shadow(0 6px 14px rgba(59,191,142,0.45))" }
          }
          transition={{ duration: 0.3 }}
          className="cursor-pointer rounded-full object-cover"
          style={{
            width: 40,
            height: 40,
            border: "2px solid rgba(255,255,255,0.15)",
            background: "linear-gradient(135deg,#34d399,#0e9f6e)",
          }}
        />
      </div>
    </div>
  );
}
