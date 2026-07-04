/** Past payroll runs — local records, each linked to its Sepolia transaction. */
import type { PayoutRun } from "../lib/history";

export function PayoutHistory({ runs, symbol }: { runs: PayoutRun[]; symbol: string }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-neutral-800">Payout history</h2>
      {runs.length === 0 ? (
        <p className="text-sm text-neutral-500">No payouts yet. History is recorded after each confirmed run.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-400">
            <tr>
              <th className="py-1 font-medium">date</th>
              <th className="py-1 font-medium">employees</th>
              <th className="py-1 text-right font-medium">total ({symbol})</th>
              <th className="py-1 text-right font-medium">tx</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t border-neutral-100">
                <td className="py-2">{new Date(run.date).toLocaleString()}</td>
                <td className="py-2">
                  {run.employeeCount}
                  {run.verified === true && <span className="ml-2 text-xs text-green-600">✓ verified</span>}
                  {run.verified === false && <span className="ml-2 text-xs text-red-500">⚠ check delivery</span>}
                </td>
                <td className="py-2 text-right font-mono">{run.totalText}</td>
                <td className="py-2 text-right">
                  <a
                    className="font-mono text-xs text-orange-600 hover:underline"
                    href={`https://sepolia.etherscan.io/tx/${run.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {run.txHash.slice(0, 10)}… ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
