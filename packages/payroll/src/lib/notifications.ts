/**
 * Notifications — design seed + live events, with read state persisted
 * (the prototype kept it in memory; the handoff flags persistence as the
 * real wiring).
 */
import { useCallback, useEffect, useState } from "react";

import { SEED_NOTIFS, type SeedNotification } from "./seed";

const KEY = "sealedpay_notifs.v1";

interface Stored {
  items: SeedNotification[];
  nextId: number;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      if (Array.isArray(parsed.items)) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  return { items: SEED_NOTIFS, nextId: 4 };
}

export function useNotifications() {
  const [stored, setStored] = useState<Stored>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(stored));
  }, [stored]);

  const add = useCallback((n: Omit<SeedNotification, "id" | "read">) => {
    setStored((s) => ({ items: [{ ...n, id: s.nextId, read: false }, ...s.items], nextId: s.nextId + 1 }));
  }, []);

  const markRead = useCallback((id: number) => {
    setStored((s) => ({ ...s, items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, []);

  const markAllRead = useCallback(() => {
    setStored((s) => ({ ...s, items: s.items.map((n) => ({ ...n, read: true })) }));
  }, []);

  const unread = stored.items.filter((n) => !n.read).length;

  return { notifs: stored.items, unread, add, markRead, markAllRead };
}
