# API Reference

Themes receive layout/settings via postMessage (`STORIFY_THEME_CONFIG`). For store data, **prefer the Storefront SDK** (products, categories, menus, cart, wishlist, reviews, formatPrice, prepareProductDescription) over calling these APIs directly. Use this reference when you need low-level details or endpoints not yet wrapped by the SDK.

---

## Base URL and required header

- **Base URL:** same origin as storefront (usually `/api`).
- **Store scoping:** send `X-Store-Id: {storeId}` for store-specific data.
- **Where `storeId` comes from:** `payload.storeId` in `STORIFY_THEME_CONFIG`.

Example:

```http
GET /api/products?search=shirt HTTP/1.1
X-Store-Id: demo-store
```

---

## Bootstrap

Used by storefront host app to compose runtime payload:

| Method | Path | Purpose |
|-------|------|---------|
| `GET` | `/api/bootstrap` | Returns theme/store bootstrap data for storefront shell. |

Theme iframe apps usually do **not** call this directly; they consume postMessage payload from the host storefront.

---

## Products

| Method | Path | Query/Params | Notes |
|-------|------|--------------|-------|
| `GET` | `/api/products` | `search`, `category`, `status` | Product list. |
| `GET` | `/api/products/:id` | `id` path param | Single product by id. |
| `GET` | `/api/products/by-handle/:handle` | `handle` path param | Product by handle. |
| `GET` | `/api/products/best-selling` | `limit` | Best-selling products. |
| `GET` | `/api/products/newest` | `limit` | Newest products. |
| `GET` | `/api/products/collection/:collectionId` | `collectionId` path param | Products by collection id. |

All endpoints above should include `X-Store-Id`.

---

## Categories

| Method | Path | Notes |
|-------|------|-------|
| `GET` | `/api/categories` | List categories/collections. |
| `GET` | `/api/categories/:id` | Single category by id. |

Include `X-Store-Id`.

---

## Menus

| Method | Path | Query | Notes |
|-------|------|-------|------|
| `GET` | `/api/menus/by-handle` | `handle` | Resolve menu structure from handle. |

Example:

```http
GET /api/menus/by-handle?handle=main-menu HTTP/1.1
X-Store-Id: demo-store
```

Typical response shape:

```json
{
  "id": "menu_1",
  "title": "Main menu",
  "handle": "main-menu",
  "items": [
    { "id": "1", "label": "Shop", "url": "/shop", "sortOrder": 0, "openInNewTab": false, "depth": 0 }
  ]
}
```

---

## Store config

| Method | Path | Notes |
|-------|------|-------|
| `GET` | `/api/store-config` | Store identity and settings (logo, favicon, contact, policies, language, currency). |

Use `payload.store` when available to avoid extra requests. The SDK uses store config for **formatPrice** after you call **setStoreConfig**.

---

## Reviews

| Method | Path | Notes |
|-------|------|-------|
| `GET` | `/api/reviews` | Query: `productId` — list reviews for a product. |
| `POST` | `/api/reviews` | Body: `{ productId, customerName?, rating, comment? }` — submit a review. |

Require `X-Store-Id` on both. Themes should use the SDK: **useReviews(productId)** and **addReview(productId, input)** (see [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md) and [06a-STOREFRONT-SDK-REFERENCE.md](06a-STOREFRONT-SDK-REFERENCE.md)).

---

## Other useful public endpoints

These can be useful for advanced themes:

| Method | Path | Notes |
|-------|------|-------|
| `GET` | `/api/theme` | Public theme config endpoint used by storefront. |
| `GET` | `/api/translations/:language` | Translation dictionary by language code. |
| `POST` | `/api/subscribe` | Newsletter subscription (public). |
| `GET` | `/api/market-regions/regions` | Market region/country utilities (if theme uses country selectors). |

Not every theme needs these; use only if your UX requires them.

---

## Error handling recommendations

- Treat `404` on optional resources (e.g. missing menu handle) as non-fatal and fallback gracefully.
- For failed calls, render section-level fallback UI rather than breaking whole page.
- Keep fetches idempotent and cache simple GET responses in component state.

Minimal helper:

```ts
async function apiGet<T>(path: string, storeId?: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: storeId ? { 'X-Store-Id': storeId } : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
```

---

## Source of truth matrix

| Need | Preferred source |
|------|------------------|
| Home layout/section content/theme settings | `postMessage` payload (`STORIFY_THEME_CONFIG`) |
| Store name/logo/contact in home render | `payload.store` |
| Products and categories | **Storefront SDK** (getProducts, getProduct, getCategories, etc.) or `/api/products`, `/api/categories` |
| Cart, wishlist | **Storefront SDK** (useCart, useWishlist) |
| Reviews (list + submit) | **Storefront SDK** (useReviews, addReview) |
| Price display | **Storefront SDK** **formatPrice(price)** — do not use `toFixed(2)` or hardcoded currency |
| Product description HTML | **Storefront SDK** **prepareProductDescription(html)** — safe HTML, no raw `dangerouslySetInnerHTML` |
| Navigation links from menu fields | **Storefront SDK** (getMenuByHandle) or `/api/menus/by-handle?handle=...` |
| Policies text | **Storefront SDK** (getPolicyBySlug) or `payload.store` / `/api/store-config` |

Call **setStoreConfig** when you receive `STORIFY_THEME_CONFIG` so the SDK has store id and currency/language.

Next: [11-CHECKLIST.md](11-CHECKLIST.md).
