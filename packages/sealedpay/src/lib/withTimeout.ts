/**
 * Bound an await that can otherwise hang forever. JS can't cancel the
 * underlying promise, so this only stops US waiting — use it where a late
 * resolution is harmless (read-only reads, decryptions, non-money signatures).
 * The message must NOT contain reject/denied/cancel, or humanizeError /
 * rejection checks would mislabel a real timeout as a wallet cancellation.
 */
export function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export const RELAYER_WARM_TIMEOUT_MS = 45_000;
export const DECRYPT_TIMEOUT_MS = 60_000;
