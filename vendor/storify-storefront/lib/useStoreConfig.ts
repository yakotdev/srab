/**
 * Centralized, read-only StoreConfig hook for storefront
 * 
 * This hook provides safe, cached access to StoreConfig from the backend.
 * StoreConfig is read-only on the frontend - updates must go through admin panel.
 * 
 * Features:
 * - Automatic caching with localStorage
 * - Cache invalidation (5 minutes TTL)
 * - Safe fallback to defaults
 * - Single source of truth
 */

import { useState, useEffect } from 'react';
import { storeConfigApi } from './api';
import { StoreConfig } from '../types';

const CACHE_KEY = 'store_config_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedConfig {
  config: StoreConfig;
  timestamp: number;
}

// Default fallback config (backward compatible)
const DEFAULT_CONFIG: StoreConfig = {
  name: 'Storify Store',
  email: 'admin@Storify.ai',
  phone: '+1 234 567 890',
  address: '123 Commerce St, Tech City',
  currency: 'ILS',
  language: 'ar',
  markets: [
    { id: 'm-1', name: 'Palestine', countries: ['PS'], currency: 'ILS', language: 'ar', active: true },
    { id: 'm-2', name: 'Israel', countries: ['IL'], currency: 'ILS', language: 'en', active: true },
    { id: 'm-3', name: 'Global', countries: ['All'], currency: 'ILS', language: 'en', active: true },
  ],
  checkoutFields: [],
  tax: {
    enabled: true,
    rate: 15,
    pricesIncludeTax: false,
  },
  shipping: {
    methods: [],
    freeShippingThreshold: 200,
  },
  payment: {
    methods: [],
  },
  policies: {
    returnExchange: '',
    privacy: '',
    terms: '',
    shipping: '',
  },
};

/**
 * Get cached config from localStorage
 */
const getCachedConfig = (): StoreConfig | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedConfig = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_TTL) {
      return parsed.config;
    }

    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('Failed to read cached StoreConfig:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

/**
 * Save config to cache
 */
const setCachedConfig = (config: StoreConfig): void => {
  try {
    const cached: CachedConfig = {
      config,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn('Failed to cache StoreConfig:', error);
  }
};

/**
 * Read-only StoreConfig hook for storefront
 * 
 * @returns {StoreConfig} The store configuration (read-only)
 */
export const useStoreConfig = (): StoreConfig => {
  const [config, setConfig] = useState<StoreConfig>(() => {
    // Try to load from cache first
    const cached = getCachedConfig();
    if (cached) {
      return cached;
    }
    return DEFAULT_CONFIG;
  });
  const [isLoading, setIsLoading] = useState(!getCachedConfig());

  useEffect(() => {
    const loadConfig = async () => {
      // Check cache first
      const cached = getCachedConfig();
      if (cached) {
        setConfig(cached);
        setIsLoading(false);
        return;
      }

      // Load from API
      try {
        setIsLoading(true);
        const fetchedConfig = await storeConfigApi.get();
        
        // Ensure checkoutFields includes city and country (ثابتان — يظهران في الدفع عند التفعيل)
        const rawFields = Array.isArray(fetchedConfig.checkoutFields) ? fetchedConfig.checkoutFields : [];
        const hasCity = rawFields.some((f: any) => f.name === 'city');
        const hasCountry = rawFields.some((f: any) => f.name === 'country');
        let checkoutFields = [...rawFields];
        if (!hasCity) {
          checkoutFields.push({ id: 'city', name: 'city', label: 'المدينة', type: 'text', required: true, enabled: true, order: 5 });
        }
        if (!hasCountry) {
          checkoutFields.push({ id: 'country', name: 'country', label: 'الدولة', type: 'text', required: true, enabled: true, order: 6 });
        }
        checkoutFields = checkoutFields.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

        // Ensure all required fields exist (backward compatibility)
        const safeConfig: StoreConfig = {
          ...DEFAULT_CONFIG,
          ...fetchedConfig,
          tax: {
            ...DEFAULT_CONFIG.tax,
            ...fetchedConfig.tax,
          },
          shipping: {
            ...DEFAULT_CONFIG.shipping,
            ...fetchedConfig.shipping,
            methods: fetchedConfig.shipping?.methods || [],
            zones: fetchedConfig.shipping?.zones,
            storeLocation: fetchedConfig.shipping?.storeLocation,
          },
          payment: {
            ...DEFAULT_CONFIG.payment,
            ...fetchedConfig.payment,
            methods: fetchedConfig.payment?.methods || [],
          },
          checkoutFields,
          markets: fetchedConfig.markets || [],
          policies: {
            ...DEFAULT_CONFIG.policies,
            ...fetchedConfig.policies,
          },
        };

        setConfig(safeConfig);
        setCachedConfig(safeConfig);
      } catch (error) {
        console.error('Failed to load StoreConfig:', error);
        // Use default config on error (backward compatible)
        setConfig(DEFAULT_CONFIG);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  return config;
};

/**
 * Invalidate StoreConfig cache (useful after admin updates)
 * This is safe to call from anywhere - it only clears the cache
 */
export const invalidateStoreConfigCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
};
