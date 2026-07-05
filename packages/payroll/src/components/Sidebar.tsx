/** Slim left nav + the wallet status pinned at the bottom. */
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";

import { CardIcon, GearIcon, HomeIcon, LockIcon, UsersIcon } from "./kit";

export type Screen = "dashboard" | "people" | "payments" | "settings" | "run";

const NAV: { key: Screen; label: string; icon: ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <HomeIcon /> },
  { key: "people", label: "People", icon: <UsersIcon /> },
  { key: "payments", label: "Payments", icon: <CardIcon /> },
  { key: "settings", label: "Settings", icon: <GearIcon /> },
];

export function Sidebar({ screen, onNav }: { screen: Screen; onNav: (screen: Screen) => void }) {
  return (
    // Collapses to an icon rail below md so the dashboard stays usable in
    // narrow windows (and the in-editor preview).
    <aside className="flex w-14 shrink-0 flex-col border-r border-stone-200/70 bg-white md:w-56">
      <div className="flex items-center gap-2 px-3 py-5 md:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
          <LockIcon />
        </span>
        <div className="hidden leading-tight md:block">
          <p className="text-sm font-bold text-stone-900">
            Sealed<span className="text-orange-600">Pay</span>
          </p>
          <p className="text-[10px] font-medium text-stone-400">confidential payroll</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 pt-2 md:px-3">
        {NAV.map((item) => {
          const active = screen === item.key || (item.key === "payments" && screen === "run");
          return (
            <button
              key={item.key}
              title={item.label}
              onClick={() => onNav(item.key)}
              className={`flex items-center justify-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors md:justify-start md:px-3 ${
                active ? "bg-orange-50 text-orange-700" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
              }`}
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-stone-100 p-2 md:p-3">
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
            if (!mounted) return null;
            if (!account) {
              return (
                <button
                  onClick={openConnectModal}
                  title="Connect wallet"
                  className="w-full rounded-xl bg-orange-600 px-2 py-2 text-sm font-semibold text-white hover:bg-orange-700 md:px-3"
                >
                  <span className="hidden md:inline">Connect wallet</span>
                  <span className="md:hidden">⏻</span>
                </button>
              );
            }
            if (chain?.unsupported) {
              return (
                <button
                  onClick={openChainModal}
                  title="Switch to Sepolia"
                  className="w-full rounded-xl bg-red-50 px-2 py-2 text-sm font-semibold text-red-600 md:px-3"
                >
                  <span className="hidden md:inline">Switch to Sepolia</span>
                  <span className="md:hidden">!</span>
                </button>
              );
            }
            return (
              <button
                onClick={openAccountModal}
                title={account.displayName}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-2 py-2 text-left hover:border-stone-300 md:justify-start md:px-3"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <span className="hidden min-w-0 md:block">
                  <span className="block truncate font-mono text-xs text-stone-700">{account.displayName}</span>
                  <span className="block text-[10px] text-stone-400">{chain?.name ?? "Sepolia"} · employer</span>
                </span>
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </aside>
  );
}
