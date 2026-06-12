# Storefront SDK

Themes use the **Storefront SDK** as the single source for data and formatting. **Do not bundle the SDK in your theme.** Load it from the platform using `payload.sdkScriptUrl` so the platform controls the code (better security). Then use `window.StorifySDK` for all data and formatting.

**→ Full step-by-step integration (بدل ملف SDK):** [06b-INTEGRATION-FLOW.md](06b-INTEGRATION-FLOW.md) — listen → load script → setStoreConfig → use SDK; plus a "do not do" list and checklist.

---

## You do not need a SDK file in your theme

**External developers:** You do **not** need to create or ship a file named `storefront-sdk.ts` (or `storefront-sdk.js`) in your theme.

| In your theme | Required? |
|---------------|-----------|
| A file called `storefront-sdk.ts` or any SDK source | **No.** The platform serves the SDK script; your theme loads it via `payload.sdkScriptUrl`. |
| `constants.ts` or custom API layer with `apiBaseUrl` / `X-Store-Id` | **No.** The SDK is configured once with `StorifySDK.setStoreConfig`; all requests go through `window.StorifySDK`. |
| **Theme SDK Adapter** (optional) | Copy the `theme-adapter` folder from the Storify repo into your theme if you want one import for hooks and helpers (`useProduct`, `formatPrice`, etc.). See [Theme SDK Adapter](#theme-sdk-adapter-واجهة-موحدة-في-الثيم) below. |

So: **no SDK file in the theme zip** — only load the script from the platform and (optionally) use the adapter for a single import point.

---

## Load SDK from platform (recommended)

The storefront sends **sdkScriptUrl** and **apiBaseUrl** in the `STORIFY_THEME_CONFIG` payload. Load the script once, then call **StorifySDK.setStoreConfig** and use **window.StorifySDK** for everything.

1. When you receive the message, if `payload.sdkScriptUrl` is set and `window.StorifySDK` is not yet defined, add a `<script src={payload.sdkScriptUrl}>` and wait for `onload`.
2. Then call:
   ```js
   window.StorifySDK.setStoreConfig({
     id: payload.storeId,
     currency: payload.store?.currency,
     language: payload.store?.language,
     apiBaseUrl: payload.apiBaseUrl,
   });
   ```
3. Use **window.StorifySDK** for all data and formatting (see below). No `constants.ts` or custom API layer; no need to put the SDK in your theme zip.

---

## Platform SDK API (window.StorifySDK)

After the script loads, use these (all promise-based or sync; no React required):

| Method | Description |
|--------|-------------|
| **setStoreConfig** | `{ id, currency?, language?, apiBaseUrl? }` — call once when you receive the payload. |
| **getStoreId**, **getApiUrl**, **getStoreSdkConfig** | Config helpers. |
| **formatPrice(price)** | Formatted price string (use for all price display). |
| **prepareProductDescription(html)** | Safe HTML for product description (XSS-safe). |
| **getProducts(query?)**, **getProduct(id)**, **getProductByHandle(handle)** | Products. |
| **getBestSellingProducts(limit)**, **getNewestProducts(limit)**, **getProductsByCollection(id)** | Product lists. |
| **getCategories()**, **getCategory(id)** | Categories. |
| **getMenu(handle)** | Menu items. |
| **getStoreConfig()**, **getPolicy(slug)** | Store and policy. |
| **getReviews(productId)**, **addReview(productId, { customerName, rating, comment })** | Reviews. |
| **getCartItems()**, **addToCart(product, qty?, variantId?)**, **removeFromCart**, **updateCartQuantity**, **clearCart**, **getCartSubtotal**, **getCartTotalItems** | Cart (in-memory). |
| **getWishlist()**, **toggleWishlist(product)**, **isInWishlist(productId)** | Wishlist (localStorage). |

Example: `const products = await window.StorifySDK.getProducts();` then `window.StorifySDK.formatPrice(p.price)`.

---

## Theme SDK Adapter (واجهة موحّدة في الثيم)

حتى لا يكرر كل سكشن استدعاء `window.StorifySDK` وكتابة `useState`/`useEffect`، يمكن استخدام **Theme SDK Adapter**: طبقة رفيعة داخل الثيم تستورد من مكان واحد.

- **الموقع في المشروع:** `shared/storefront/theme-adapter/` — انسخ مجلد `theme-adapter` إلى مشروع الثيم أو استخدم المسار إن كان الثيم داخل الـ monorepo.
- **ما يصدّره:** `getSDK()`, **useProducts**, **useProduct**, **useCategories**, **useMenu**, **useReviews**, **useCart**, **useWishlist**, **formatPrice**, **prepareProductDescription**, **submitReview**، وأنواع مثل **MenuItem**, **SubmitReviewPayload**, **ProductMinimal**.
- **بدون fetch وبدون apiBaseUrl** — كل الطلبات عبر `window.StorifySDK` فقط. انظر الملف `shared/storefront/theme-adapter/README.md` في المستودع.

مثال استيراد في الثيم:

```ts
import { getSDK, useProduct, useCart, formatPrice, submitReview } from './theme-adapter';
import type { MenuItem, SubmitReviewPayload } from './theme-adapter';
```

---

## Theme iframe setup (if you still bundle the SDK)

If you cannot use the platform script (e.g. local dev without parent), you may bundle the SDK and import **setStoreConfig**. Call it with `id`, `currency`, `language`, and **apiBaseUrl** (from payload) when running in a cross-origin iframe so API requests go to the storefront origin.

---

## Products

- **useProducts(query)** — List products. Query can include search, category, status. Returns `{ products, loading, error }`.
- **useProduct(id)** — Single product by id. Returns `{ product, loading, error }`.
- **useProductByHandle(handle)** — Single product by handle. Returns `{ product, loading, error }`.
- **useBestSellingProducts(limit)** — Best-selling products. Returns `{ products, loading, error }`.
- **useNewestProducts(limit)** — Newest products. Returns `{ products, loading, error }`.
- **useProductsByCollection(collectionId)** — Products in a collection. Returns `{ products, loading, error }`.
- **useProductsBySource(source, limit, collectionId?)** — Source is best_selling, newest, or collection. Returns `{ products, loading, error }`.

---

## Categories

- **useCategories()** — List categories. Returns `{ categories, loading, error }`.
- **useCollectionByHandle(handle)** — Products in a category by handle. Returns `{ products, loading, error }`.

---

## Menus

- **useMenu(handle)** — Menu items by handle. Returns `{ items, loading, error }`. Each item has id, label, url, sortOrder, openInNewTab, depth. Use the handle from payload.settings (e.g. settings.nav_primary) or from section content.

Under the hood this calls `GET /api/menus/by-handle?handle={handle}` with `X-Store-Id`.

---

## Store config

- **useStoreConfig()** — Store configuration (name, logo, favicon, email, phone, address, currency, language, policies). Returns `{ config, loading, error }`.

You also receive a store object in the postMessage payload; use that when you already have it to avoid an extra request.

---

## Policies

- **usePolicy(slug)** — Policy content by slug (e.g. privacy, terms, return-exchange, shipping). Returns `{ policy, loading, error }`. Policy has slug, title, body.

---

## Cart

- **useCart()** — Local cart state. Returns `{ items, addItem, removeItem, updateQuantity, clear, subtotal, totalItems }`. Each item is `{ product, quantity, variantId? }`. When adding a product with a selected variant, pass `addItem(product, quantity, selectedVariant?.id)` so the cart line is keyed by product + variant.

---

## Price formatting

- **formatPrice(price: number)** — Returns a formatted string using the store’s currency and language (from `setStoreConfig`). Use this for all price display; do not use `toFixed(2)` or hardcoded currency symbols in the theme.

---

## Product description (safe HTML)

- **prepareProductDescription(html: string)** — Sanitizes product description HTML for safe display (XSS). Use with `dangerouslySetInnerHTML`; do not render `product.description` raw.

---

## Reviews

- **useReviews(productId)** — List reviews for a product. Returns `{ reviews, loading, error }`.
- **useAddReview()** — Returns `{ addReview, submitting, error }` for form use. `addReview(productId, { customerName, rating, comment })` submits to the public API (requires `setStoreConfig` with store id).
- **addReview(productId, input)** — Submit a review (async). Use when you don’t need the hook.

---

## Wishlist

- **useWishlist()** — Local wishlist keyed by store id. Returns `{ wishlist, toggleWishlist, isInWishlist }`. Persisted in localStorage; newest added first.

---

## SEO

- **useSeo(options)** — Returns `{ title, description, image, url, type }` for the current page. Options include pageType, storeName, storeDescription, storeImage, and optional product, policy, category.

---

## Direct API calls

If you need something not exposed by the SDK, use the same endpoints with base URL and header `X-Store-Id: {storeId}`. Prefer extending the SDK rather than calling the API directly from the theme. See [10-API-REFERENCE.md](10-API-REFERENCE.md).

---

## Full reference

For detailed signatures, parameters, and return types, see [06a-STOREFRONT-SDK-REFERENCE.md](06a-STOREFRONT-SDK-REFERENCE.md).

Next: [07-PAGES-AND-ROUTES.md](07-PAGES-AND-ROUTES.md).
