/**
 * Runtime Store Configuration Loader
 * يحمل إعدادات المتجر من API بناءً على Domain
 */

export interface StoreConfig {
  id: string;
  name: string;
  domain: string;
  subdomain?: string;
  customDomain?: string;
  currency: string;
  language: string;
  logo?: string;
  favicon?: string;
  [key: string]: any;
}

interface CachedConfig {
  config: StoreConfig;
  loadedAt: number;
}

export class RuntimeStoreConfig {
  private static cache = new Map<string, CachedConfig>();
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Get Store ID from Domain
   * IMPORTANT: Always use window.__STORE_CONFIG__ if available (injected by Engine)
   * This ensures we use the actual Store ID, not the subdomain
   */
  static getStoreIdFromDomain(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // PRIORITY 1: Use injected store config from Engine (most reliable)
    if ((window as any).__STORE_CONFIG__ && (window as any).__STORE_CONFIG__.id) {
      return (window as any).__STORE_CONFIG__.id;
    }

    const hostname = window.location.hostname;

    // PRIORITY 2: للتطوير — على localhost استخدم VITE_DEV_STORE_ID من .env
    const env = (import.meta as unknown as { env?: { DEV?: boolean; VITE_DEV_STORE_ID?: string } }).env;
    if (env?.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      const devStoreId = env.VITE_DEV_STORE_ID;
      if (devStoreId && typeof devStoreId === 'string' && devStoreId.trim()) return devStoreId.trim();
    }

    // Pattern: subdomain.storify.it.com
    const subdomainMatch = hostname.match(/^([^.]+)\.storify\.it\.com$/);
    if (subdomainMatch) return subdomainMatch[1];

    return null;
  }

  /**
   * Load Store Config from API
   */
  static async loadStoreConfig(storeId?: string): Promise<StoreConfig> {
    // If storeId not provided, try to get from domain
    if (!storeId) {
      storeId = this.getStoreIdFromDomain();
    }

    if (!storeId) {
      // Try to load from window.__STORE_CONFIG__ (injected by server)
      if (typeof window !== 'undefined' && (window as any).__STORE_CONFIG__) {
        return (window as any).__STORE_CONFIG__;
      }
      throw new Error('Store ID not found in domain or config');
    }

    // Check cache
    const cached = this.cache.get(storeId);
    if (cached && Date.now() - cached.loadedAt < this.cacheExpiry) {
      return cached.config;
    }

    // Load from API
    try {
      const response = await fetch(`/api/store-config`, {
        headers: {
          'X-Store-ID': storeId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load store config: ${response.statusText}`);
      }

      const config = await response.json();
      
      // Cache
      this.cache.set(storeId, {
        config,
        loadedAt: Date.now(),
      });

      return config;
    } catch (error) {
      // Fallback to window.__STORE_CONFIG__ if API fails
      if (typeof window !== 'undefined' && (window as any).__STORE_CONFIG__) {
        return (window as any).__STORE_CONFIG__;
      }
      throw error;
    }
  }

  /**
   * Initialize Store Config on App Load
   */
  static async initialize(): Promise<StoreConfig> {
    // First, try to get from window.__STORE_CONFIG__ (injected by server)
    if (typeof window !== 'undefined' && (window as any).__STORE_CONFIG__) {
      const config = (window as any).__STORE_CONFIG__;
      // Cache it
      if (config.id) {
        this.cache.set(config.id, {
          config,
          loadedAt: Date.now(),
        });
      }
      return config;
    }

    // Otherwise, try to get from domain
    const storeId = this.getStoreIdFromDomain();
    
    if (!storeId) {
      throw new Error('Store ID not found in domain or config');
    }

    return await this.loadStoreConfig(storeId);
  }

  /**
   * Clear cache for a specific store
   */
  static clearCache(storeId?: string): void {
    if (storeId) {
      this.cache.delete(storeId);
    } else {
      this.cache.clear();
    }
  }
}
