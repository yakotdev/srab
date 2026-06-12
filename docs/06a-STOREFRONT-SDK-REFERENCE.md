# Storefront SDK — Full API Reference

Complete reference for external theme developers. All exports live under one entry (e.g. `shared/storefront/lib/storefront-sdk.ts` or your bundler alias). The SDK is split into modules internally for maintenance; you only need to import from the single entry.

---

## Config (theme iframe)

### setStoreConfig(config)

Call once when your theme receives `STORIFY_THEME_CONFIG` so the SDK can use the store id and format prices correctly.

```ts
setStoreConfig(config: StoreSdkConfig | null): void
```

- **config.id** — Store id; sent as `X-Store-Id` on all API requests.
- **config.currency** — Currency code (e.g. `SAR`, `USD`); used by `formatPrice`.
- **config.language** — Language code (e.g. `ar`, `en`); used by `formatPrice`.

Example:

```ts
import { setStoreConfig } from '@storify/storefront-sdk';
if (event.data?.type === 'STORIFY_THEME_CONFIG' && event.data.payload) {
  const p = event.data.payload;
  setStoreConfig({
    id: p.storeId,
    currency: p.store?.currency,
    language: p.store?.language,
  });
}
```

### getStoreId()

Returns the current store id (from setStoreConfig or dev env). Used internally by the SDK.

```ts
getStoreId(): string | null
```

### formatPrice(price)

Formats a number as currency using the store’s currency and language. Use for all price display; do not use `toFixed(2)` or hardcoded symbols.

```ts
formatPrice(price: number): string
```

Example:

```ts
import { formatPrice, useProduct } from '@storify/storefront-sdk';
const { product } = useProduct(id);
const displayPrice = product ? (product.hasVariants && selectedVariant ? selectedVariant.price : product.price) : 0;
return <span>{formatPrice(displayPrice)}</span>;
```

### prepareProductDescription(html)

Sanitizes product description HTML for safe display (XSS). Use with `dangerouslySetInnerHTML`; do not render `product.description` raw.

```ts
prepareProductDescription(html: string): string
```

Example:

```ts
import { useProduct, prepareProductDescription } from '@storify/storefront-sdk';
const { product } = useProduct(id);
return <div dangerouslySetInnerHTML={{ __html: prepareProductDescription(product?.description || '') }} />;
```

---

## Products

### useProducts(query?)

List products with optional filters.

```ts
useProducts(query?: ProductQuery): { products: Product[]; loading: boolean; error: Error | null }
```

**ProductQuery:** `{ search?: string; category?: string; status?: string }`

### useProduct(id)

Single product by id. Uses initial data from host when available.

```ts
useProduct(id: string | null): { product: Product | null; loading: boolean; error: Error | null }
```

### useProductByHandle(handle)

Single product by handle (slug). Fallback: search by handle string.

```ts
useProductByHandle(handle: string | null): { product: Product | null; loading: boolean; error: Error | null }
```

### useBestSellingProducts(limit?)

Best-selling products.

```ts
useBestSellingProducts(limit?: number): { products: Product[]; loading: boolean; error: Error | null }
```

Default limit: 10.

### useNewestProducts(limit?)

Newest products.

```ts
useNewestProducts(limit?: number): { products: Product[]; loading: boolean; error: Error | null }
```

Default limit: 10.

### useProductsByCollection(collectionId)

Products in a collection (category) by id.

```ts
useProductsByCollection(collectionId: string | null): { products: Product[]; loading: boolean; error: Error | null }
```

### useProductsBySource(source, limit, collectionId?)

Single hook for section product sources.

```ts
useProductsBySource(
  source: 'best_selling' | 'newest' | 'collection',
  limit: number,
  collectionId?: string | null
): { products: Product[]; loading: boolean; error: Error | null }
```

For `source === 'collection'`, `collectionId` is required.

---

## Categories

### useCategories()

List all categories.

```ts
useCategories(): { categories: Category[]; loading: boolean; error: Error | null }
```

### useCollectionByHandle(handle)

Products in a category by handle (slug).

```ts
useCollectionByHandle(handle: string | null): { products: Product[]; loading: boolean; error: Error | null }
```

---

## Menus

### useMenu(handle)

Menu items by handle. Handle comes from payload (e.g. `settings.nav_primary`) or section content.

```ts
useMenu(handle: string | null): { items: MenuItem[]; loading: boolean; error: Error | null }
```

**MenuItem:** `{ id: string; label: string; url: string; sortOrder: number; openInNewTab: boolean; depth: number }`

---

## Store config

### useStoreConfig()

Store configuration (name, logo, favicon, contact, currency, language, policies). Prefer using `payload.store` when you already have it to avoid an extra request.

```ts
useStoreConfig(): { config: StoreConfig | null; loading: boolean; error: Error | null }
```

---

## Policies

### usePolicy(slug)

Policy content by slug (e.g. `privacy`, `terms`, `return-exchange`, `shipping`).

```ts
usePolicy(slug: string | null): { policy: Policy | null; loading: boolean; error: Error | null }
```

**Policy:** `{ slug: string; title?: string; body?: string }`

---

## Cart

### useCart()

Local cart state (no backend). Each line is keyed by product id + variant id.

```ts
useCart(): {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clear: () => void;
  subtotal: number;
  totalItems: number;
}
```

**CartItem:** `{ product: Product; quantity: number; variantId?: string }`

When the product has variants, pass the selected variant id so the same product with different variants appears as separate lines:

```ts
addItem({ ...product, selectedVariant }, quantity, selectedVariant?.id);
```

Subtotal uses variant price when `variantId` is set.

---

## Reviews

### useReviews(productId)

List reviews for a product (public API). Typically only approved reviews are shown; the API may return all and you filter by `status === 'Approved'` if needed.

```ts
useReviews(productId: string | null): { reviews: Review[]; loading: boolean; error: Error | null }
```

**Review:** `{ id: string; productId: string; customerName: string; rating: number; comment: string; date: string; status: 'Pending' | 'Approved' | 'Rejected' }`

### useAddReview()

Returns a stable submit callback and loading/error state for a review form.

```ts
useAddReview(): { addReview: (productId: string, input: AddReviewInput) => Promise<Review>; submitting: boolean; error: Error | null }
```

**AddReviewInput:** `{ customerName: string; rating: number; comment: string }`

### addReview(productId, input)

Submit a review (async). Requires `setStoreConfig` with store id. Throws on error.

```ts
addReview(productId: string, input: AddReviewInput): Promise<Review>
```

---

## Wishlist

### useWishlist()

Local wishlist, keyed by store id, persisted in localStorage. Newest added first. Use after `setStoreConfig` so the key matches the store.

```ts
useWishlist(): { wishlist: Product[]; toggleWishlist: (product: Product) => void; isInWishlist: (productId: string) => boolean }
```

---

## SEO

### useSeo(options)

Returns meta for the current page. Pure function; no hook deps.

```ts
useSeo(options: {
  pageType: 'home' | 'product' | 'policy' | 'shop' | 'category';
  storeName?: string;
  storeDescription?: string;
  storeImage?: string;
  product?: Product | null;
  policy?: Policy | null;
  category?: Category | null;
}): SeoMeta
```

**SeoMeta:** `{ title: string; description: string; image?: string; url: string; type: 'website' | 'product' | 'article' }`

---

## Initial data (SSR / hydration)

### getInitialData()

Read initial data injected by the host (e.g. product or policy for current page). Hooks use this to avoid duplicate fetches.

```ts
getInitialData(): StorefrontInitialData | null
```

**StorefrontInitialData:** `{ product?: Product; policy?: Policy }`

### setInitialData(data)

Inject initial data. Used by the storefront shell; themes typically do not call this.

```ts
setInitialData(data: StorefrontInitialData | null): void
```

---

## Data types (summary)

- **Product:** id, name, description, image, images, price, compareAtPrice, stock, hasVariants, variants?, options?, selectedVariant?, reviews?, rating?, …
- **ProductVariant:** id, title, price, stock, sku, image?
- **ProductOption:** id, name, values[] — optional; used for display (e.g. Size, Color). Selection is by choosing a variant (variant.id); variant.title often combines option values (e.g. "M / Red").
- **Category:** id, name, slug, description?, image?, productCount
- **StoreConfig:** store identity, logo, favicon, contact, currency, language, policies
- **Review:** id, productId, customerName, rating, comment, date, status

Full TypeScript types are exported from the SDK; use them in your theme for type safety.

---

## File structure (internal)

The SDK is implemented under `shared/storefront/lib/sdk/` in separate modules for maintenance. You do not need to import from these paths; use the single entry (`storefront-sdk` or `lib/storefront-sdk`).

| File | Responsibility |
|------|-----------------|
| config.ts | getStoreId, setStoreConfig, getStoreSdkConfig, getApiUrl |
| fetch.ts | sdkFetch, sdkPost (base URL + X-Store-Id) |
| types.ts | ProductQuery, MenuItem, Policy, CartItem, SeoMeta, StoreSdkConfig, re-exports Product, Category, StoreConfig |
| formatters.ts | formatPrice, prepareProductDescription |
| initial-data.ts | getInitialData, setInitialData |
| products.ts | useProducts, useProduct, useProductByHandle, useBestSellingProducts, useNewestProducts, useProductsByCollection, useProductsBySource |
| categories.ts | useCategories, useCollectionByHandle |
| menu.ts | useMenu |
| store-config.ts | useStoreConfig |
| policy.ts | usePolicy |
| cart.ts | useCart |
| reviews.ts | useReviews, useAddReview, addReview |
| wishlist.ts | useWishlist |
| seo.ts | useSeo |
| index.ts | Re-exports all public API |

See [STOREFRONT_SDK_PLAN.md](STOREFRONT_SDK_PLAN.md) for the full plan and conventions.
