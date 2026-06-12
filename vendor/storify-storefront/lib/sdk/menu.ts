/**
 * Menu hook: useMenu.
 */

import { useState, useEffect } from 'react';
import type { MenuItem } from './types';
import { sdkFetch } from './fetch';

export type { MenuItem };

export function useMenu(handle: string | null) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(!!handle);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!handle) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdkFetch<{ items?: MenuItem[] }>(`/menus/by-handle?handle=${encodeURIComponent(handle)}`)
      .then((data) => {
        if (!cancelled) setItems(Array.isArray((data as { items?: MenuItem[] })?.items) ? (data as { items: MenuItem[] }).items : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [handle]);

  return { items, loading, error };
}
