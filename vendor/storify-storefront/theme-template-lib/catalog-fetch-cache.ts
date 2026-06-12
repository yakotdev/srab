/**
 * Deduplicates identical in-flight / recent catalog fetches across theme sections (Shopify-like single network layer).
 */

const TTL_MS = 45_000;

function createDedupeCache<T>() {
  const inflight = new Map<string, Promise<T>>();
  const settled = new Map<string, { data: T; at: number }>();

  return {
    async get(key: string, fetcher: () => Promise<T>): Promise<T> {
      const hit = settled.get(key);
      if (hit && Date.now() - hit.at < TTL_MS) {
        return hit.data;
      }
      let p = inflight.get(key);
      if (!p) {
        p = fetcher()
          .then((data) => {
            settled.set(key, { data, at: Date.now() });
            inflight.delete(key);
            return data;
          })
          .catch((err) => {
            inflight.delete(key);
            throw err;
          });
        inflight.set(key, p);
      }
      return p;
    },
    clear() {
      inflight.clear();
      settled.clear();
    },
  };
}

const productsCache = createDedupeCache<unknown[]>();
const categoriesCache = createDedupeCache<unknown[]>();
const productByIdCache = createDedupeCache<unknown | null>();

/** Call when store/runtime context changes so sections refetch fresh catalog data. */
export function clearThemeCatalogCache(): void {
  productsCache.clear();
  categoriesCache.clear();
  productByIdCache.clear();
}

export async function getCachedProductsList(key: string, fetcher: () => Promise<unknown[]>): Promise<unknown[]> {
  return productsCache.get(key, fetcher);
}

export async function getCachedCategoriesList(key: string, fetcher: () => Promise<unknown[]>): Promise<unknown[]> {
  return categoriesCache.get(key, fetcher);
}

export async function getCachedProductById(key: string, fetcher: () => Promise<unknown | null>): Promise<unknown | null> {
  return productByIdCache.get(key, fetcher);
}
