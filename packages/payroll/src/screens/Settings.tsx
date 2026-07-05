/** Settings — schedule display, addresses, the privacy model, local data. */
import { DEMO_TOKEN_ADDRESS, disperseAddressFor, SEPOLIA_CHAIN_ID } from "@dispersekit/widget";

import { ExternalIcon, LockIcon, PButton, SectionCard, WalletChip } from "../components/kit";
import { EXPLORER } from "../theme";

export function Settings({
  manual,
  setManual,
  nextDue,
  symbol,
}: {
  manual: string;
  setManual: (value: string) => void;
  nextDue?: Date;
  symbol: string;
}) {
  const disperse = disperseAddressFor(SEPOLIA_CHAIN_ID);
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SectionCard title="Payout schedule">
        <p className="mb-3 text-sm text-stone-500">
          {nextDue
            ? `Next payout due ${nextDue.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.`
            : "No date set — defaults to one month after your last run."}
          <span className="ml-1 text-xs text-stone-400">
            Display only: payroll runs when you click Run, never automatically.
          </span>
        </p>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          Set a date
          <input
            type="date"
            className="rounded-xl border border-stone-200 px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          {manual && (
            <button className="text-xs text-stone-400 hover:text-stone-700" onClick={() => setManual("")}>
              clear
            </button>
          )}
        </label>
      </SectionCard>

      <SectionCard title="Token & contracts (Sepolia)">
        <ul className="space-y-2.5 text-sm text-stone-600">
          <li className="flex items-center justify-between gap-2">
            <span>Payroll token ({symbol}, ERC-7984 confidential)</span>
            <span className="flex items-center gap-2">
              {DEMO_TOKEN_ADDRESS && <WalletChip address={DEMO_TOKEN_ADDRESS} />}
              <a className="text-orange-600" href={`${EXPLORER}/address/${DEMO_TOKEN_ADDRESS}`} target="_blank" rel="noreferrer" aria-label="Token on Etherscan">
                <ExternalIcon />
              </a>
            </span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Disperse contract (audited TokenOps singleton)</span>
            <span className="flex items-center gap-2">
              <WalletChip address={disperse} />
              <a className="text-orange-600" href={`${EXPLORER}/address/${disperse}`} target="_blank" rel="noreferrer" aria-label="Disperse contract on Etherscan">
                <ExternalIcon />
              </a>
            </span>
          </li>
        </ul>
      </SectionCard>

      <SectionCard title="What stays private?">
        <div className="space-y-2 text-sm text-stone-600">
          <p className="flex gap-2">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
            <span>
              <b className="text-stone-800">Hidden on-chain:</b> every salary and the payroll total. Amounts are
              encrypted in your browser before anything is sent; on-chain they exist only as ciphertexts. Only you and
              each employee can ever decrypt an amount — and employees see only their own.
            </span>
          </p>
          <p className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-stone-400">👁️</span>
            <span>
              <b className="text-stone-800">Visible on-chain:</b> employee wallet addresses and that a payroll run
              happened. That's inherent to pushing tokens — what each person earns stays sealed.
            </span>
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Local data">
        <p className="mb-3 text-sm text-stone-500">
          Your roster, history and schedule live only in this browser. Salaries are never uploaded anywhere.
        </p>
        <PButton
          variant="outline"
          onClick={() => {
            if (confirm("Clear all local payroll data (roster, history, schedule)? On-chain payments are unaffected.")) {
              localStorage.removeItem("dispersekit.payroll.employees.v1");
              localStorage.removeItem("dispersekit.payroll.history.v1");
              localStorage.removeItem("dispersekit.payroll.nextDue.v1");
              location.reload();
            }
          }}
        >
          Clear local data
        </PButton>
      </SectionCard>
    </div>
  );
}
