/**
 * Left icon rail — fixed shell chrome (dashboard handoff §Side rail).
 * Three nav pucks (Home / Team / Insights), then a bell + gear cluster whose
 * Notifications / Settings popovers open ANCHORED beside their icon
 * (left ~50px, top ~-7px), and a logout button pinned to the bottom.
 *
 * The popover content is passed in as ReactNodes so the rail stays
 * presentation-only; when either is open a transparent full-screen catcher
 * closes it on an outside click (no dimming, per the design).
 */
import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

import { BellGlyph, GearGlyph, HomeNav, InsightsNav, LogoutGlyph, TeamNav } from "../design/icons";
import { tokens } from "../design/tokens";

const SELECTED_ICON = "#568570";
const IDLE_ICON = "#9db3aa";

const clusterStyle: CSSProperties = {
  border: `1px solid ${tokens.glass.railBorder}`,
  background: tokens.glass.rail,
  boxShadow: tokens.glass.cardShadow,
  borderRadius: tokens.radius.pill,
};

export function Rail({
  navSel,
  onNav,
  onBell,
  onGear,
  onLogout,
  bellUnread,
  bellOpen,
  gearOpen,
  bellPopover,
  gearPopover,
  onClosePopover,
}: {
  navSel: 0 | 1 | 2;
  onNav: (n: 0 | 1 | 2) => void;
  onBell: () => void;
  onGear: () => void;
  onLogout: () => void;
  bellUnread: boolean;
  bellOpen: boolean;
  gearOpen: boolean;
  bellPopover: ReactNode;
  gearPopover: ReactNode;
  onClosePopover: () => void;
}) {
  const navItems = [
    { label: "Home", Icon: HomeNav },
    { label: "Team", Icon: TeamNav },
    { label: "Insights", Icon: InsightsNav },
  ] as const;

  return (
    <div className="z-[5] flex w-[58px] shrink-0 flex-col items-center" style={{ padding: "97px 0 22px 0" }}>
      {/* Dim overlay + outside-click catcher while a popover is open. The dim
          focuses the popover; the trigger cluster is lifted above it (z-11). */}
      <AnimatePresence>
        {(bellOpen || gearOpen) && (
          <motion.div
            className="fixed inset-0 z-[9]"
            style={{ background: "rgba(6,12,10,0.55)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={onClosePopover}
          />
        )}
      </AnimatePresence>

      {/* Nav pucks */}
      <nav aria-label="Primary" className="relative z-[11] flex flex-col items-center" style={{ ...clusterStyle, gap: 7 }}>
        {navItems.map(({ label, Icon }, i) => {
          const selected = navSel === i;
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-current={selected ? "page" : undefined}
              onClick={() => onNav(i as 0 | 1 | 2)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
              style={{ background: selected ? "#f5f8f6" : "transparent", transition: "background .2s" }}
            >
              <Icon size={15} color={selected ? SELECTED_ICON : IDLE_ICON} />
            </button>
          );
        })}
      </nav>

      {/* Bell + gear cluster (popovers anchor to the right of each icon).
          Lifted above the dim so the triggers + their hover glow stay lit. */}
      <div className="relative z-[11] mt-5 flex flex-col items-center" style={{ ...clusterStyle, gap: 6 }}>
        <div className="group relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={bellOpen}
            onClick={onBell}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors group-hover:bg-[rgba(95,230,175,0.1)]"
          >
            <BellGlyph size={15} />
            {bellUnread && (
              <span aria-hidden className="absolute rounded-full" style={{ top: 9, right: 9, width: 6, height: 6, background: tokens.accent.liveDot }} />
            )}
          </button>
          {bellPopover && (
            <div className="absolute z-[10]" style={{ left: 50, top: -7 }} onMouseDown={(e) => e.stopPropagation()}>
              {bellPopover}
            </div>
          )}
        </div>
        <div className="group relative">
          <button
            type="button"
            aria-label="Settings"
            aria-expanded={gearOpen}
            onClick={onGear}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors group-hover:bg-[rgba(95,230,175,0.1)]"
          >
            <GearGlyph size={15} />
          </button>
          {gearPopover && (
            <div className="absolute z-[10]" style={{ left: 50, top: -7 }} onMouseDown={(e) => e.stopPropagation()}>
              {gearPopover}
            </div>
          )}
        </div>
      </div>

      {/* Logout — pinned to the rail bottom */}
      <button
        type="button"
        aria-label="Log out"
        onClick={onLogout}
        className="relative z-[11] mt-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(110,196,186,0.06)] transition-colors hover:bg-[rgba(95,230,175,0.1)]"
        style={{ border: `1px solid ${tokens.glass.railBorder}`, boxShadow: tokens.glass.cardShadow }}
      >
        <LogoutGlyph size={15} />
      </button>
    </div>
  );
}
