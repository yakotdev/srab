/**
 * Store config hook: useStoreConfig.
 */

import { useState, useEffect } from 'react';
import type { StoreConfig } from '../../types';
import { sdkFetch } from './fetch';

export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    sdkFetch<StoreConfig>('/store-config')
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { config, loading, error };
}
