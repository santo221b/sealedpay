/**
 * Left icon rail — fixed shell chrome (dashboard-screens.md §1.5).
 * Three nav pucks (Home / Team / Insights), a bell + gear cluster, and a
 * logout button pinned to the rail bottom. Presentation only.
 */
import type { CSSProperties } from "react";

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
}: {
  navSel: 0 | 1 | 2;
  onNav: (n: 0 | 1 | 2) => void;
  onBell: () => void;
  onGear: () => void;
  onLogout: () => void;
  bellUnread: boolean;
}) {
  const navItems = [
    { label: "Home", Icon: HomeNav },
    { label: "Team", Icon: TeamNav },
    { label: "Insights", Icon: InsightsNav },
  ] as const;

  return (
    <div className="z-[5] flex w-[58px] shrink-0 flex-col items-center" style={{ padding: "97px 0 22px 0" }}>
      {/* Nav pucks */}
      <nav aria-label="Primary" className="flex flex-col items-center" style={{ ...clusterStyle, gap: 7 }}>
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

      {/* Bell + gear cluster */}
      <div className="mt-5 flex flex-col items-center" style={{ ...clusterStyle, gap: 6 }}>
        <button
          type="button"
          aria-label="Notifications"
          onClick={onBell}
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[rgba(95,230,175,0.1)]"
        >
          <BellGlyph size={15} />
          {bellUnread && (
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{ top: 9, right: 9, width: 6, height: 6, background: tokens.accent.liveDot }}
            />
          )}
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={onGear}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[rgba(95,230,175,0.1)]"
        >
          <GearGlyph size={15} />
        </button>
      </div>

      {/* Logout — pinned to the rail bottom */}
      <button
        type="button"
        aria-label="Log out"
        onClick={onLogout}
        className="mt-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(110,196,186,0.06)] transition-colors hover:bg-[rgba(95,230,175,0.1)]"
        style={{
          border: `1px solid ${tokens.glass.railBorder}`,
          boxShadow: tokens.glass.cardShadow,
        }}
      >
        <LogoutGlyph size={15} />
      </button>
    </div>
  );
}
