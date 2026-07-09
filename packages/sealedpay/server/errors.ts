/**
 * ApiFail — a handler failure that already carries the HTTP status and a calm,
 * human-readable, service-named message. The adapter serializes it as
 * { error } so the client can show it verbatim in a toast.
 */
export class ApiFail extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Bound an external call (Privy, Upstash) so a stalled dependency fails fast
 * with a service-named message instead of hanging the function to its limit.
 */
export function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApiFail(504, message)), ms);
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
