/**
 * Block-timestamp lookup for payment-history rows.
 *
 * Every payment row (seed or live) links to a REAL Sepolia transaction, so the
 * exact time a payout landed is on-chain — the same value Etherscan shows. This
 * resolves each tx to its block timestamp and returns a hash -> formatted-time
 * map ("2 PM" / "3:10 PM"). Timestamps are immutable, so results are cached in
 * localStorage and never refetched; a hash that can't be resolved (RPC hiccup,
 * unknown tx) simply stays absent and its row renders the date without a time.
 */
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

const CACHE_KEY = "sealedpay_tx_times.v1"; // { [txHash]: unixSeconds }
const TX_RE = /^0x[0-9a-fA-F]{64}$/;

type Cache = Record<string, number>;

function loadCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Cache;
  } catch {
    return {};
  }
}

function saveCache(c: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* storage disabled/full — times just refetch next session */
  }
}

/** Compact local time: "2 pm" on the hour, else "3:10 pm". */
export function fmtTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Resolve the on-chain time for a set of tx hashes. Returns a hash -> "3:10 PM"
 * lookup; hashes still resolving (or unresolvable) are simply absent.
 */
export function useTxTimes(txHashes: string[]): Record<string, string> {
  const publicClient = usePublicClient();
  const [times, setTimes] = useState<Cache>(loadCache);

  // Stable, deduped signature so the fetch effect only refires when the SET of
  // requested hashes actually changes (not on every render / array identity).
  const key = useMemo(() => Array.from(new Set(txHashes)).sort().join(","), [txHashes]);

  useEffect(() => {
    if (!publicClient) return;
    const wanted = Array.from(new Set(txHashes)).filter((h) => TX_RE.test(h) && times[h] === undefined);
    if (wanted.length === 0) return;
    let cancelled = false;
    void (async () => {
      const found: Cache = {};
      await Promise.all(
        wanted.map(async (hash) => {
          try {
            const tx = await publicClient.getTransaction({ hash: hash as `0x${string}` });
            if (tx.blockNumber == null) return;
            const block = await publicClient.getBlock({ blockNumber: tx.blockNumber });
            found[hash] = Number(block.timestamp);
          } catch {
            /* tx not found / RPC hiccup — leave it absent, retry next mount */
          }
        }),
      );
      if (cancelled || Object.keys(found).length === 0) return;
      setTimes((prev) => {
        const next = { ...prev, ...found };
        saveCache(next);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // `times` is intentionally excluded: timestamps only get added, so a stale
    // read at most re-checks the cache; keying on the hash SET prevents loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, publicClient]);

  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const h of txHashes) {
      const t = times[h];
      if (t !== undefined) out[h] = fmtTime(t);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, key]);
}
