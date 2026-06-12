# Troubleshooting

Use this page when your theme builds successfully but does not behave correctly after upload or in storefront.

---

## 1) Theme stuck on loading screen

### Symptoms

- Theme iframe shows "Loading..." forever.
- No sections render.

### Common causes

- No `STORIFY_THEME_CONFIG` message received.
- Listener checks wrong shape (`event.data.payload` missing guard).
- Runtime error before state update.

### Fix

1. Ensure listener checks `event.data?.type === 'STORIFY_THEME_CONFIG'`.
2. Ensure payload state is set from `event.data.payload`.
3. Add console guard logs in development.
4. For local standalone preview, add a dev-only fallback config.

---

## 2) Theme uploads but fails to activate/render

### Symptoms

- Upload succeeds or partially succeeds, but storefront does not load theme.
- Console/network shows missing entry file.

### Common causes

- `entry` in manifest does not match actual built filename.
- `theme-manifest.json` not at zip root.
- `index.html` missing from zip root.

### Fix

- Verify zip root contains:
  - `theme-manifest.json`
  - `index.html`
  - `assets/...` including the `entry` file
- Rebuild and re-zip **contents of `dist/`**, not parent folder.

---

## 3) Menu fields show handle but no links appear

### Symptoms

- `settings.nav_primary` has value (e.g. `main-menu`), but header/footer menu is empty.

### Common causes

- Missing `X-Store-Id` header.
- Invalid or empty menu handle.
- Fetching wrong endpoint.

### Fix

- Use endpoint: `GET /api/menus/by-handle?handle={handle}`.
- Send header: `X-Store-Id: payload.storeId`.
- Treat missing menu as non-fatal and fallback to static links.

---

## 4) Repeater section crashes or renders blank

### Symptoms

- Slideshow/testimonials/features section throws errors.
- Mapping over undefined.

### Common causes

- Repeater field value is missing or not array.
- No `defaultContent` for repeater.

### Fix

- Set manifest default: `{ "slides": [] }` (or your field key).
- Guard in render:
  - `const slides = Array.isArray(content.slides) ? content.slides : [];`

---

## 5) Wrong section component rendered (or not rendered)

### Symptoms

- Section exists in layout but nothing appears.
- Registry lookup misses key.

### Common causes

- Section ids and registry keys do not match.
- Theme expects `type` but payload provides only `id`.

### Fix

- Normalize id to registry key (`hero-banner` -> `HERO_BANNER`).
- Keep a single helper function for section-type resolution.
- Return `null` safely for unknown sections.

---

## 6) Prices show wrong currency or formatPrice not working

### Symptoms

- Prices show wrong symbol or decimals.
- formatPrice returns unexpected string.

### Common causes

- **setStoreConfig** was never called, so SDK has no store id or currency.
- Using manual `toFixed(2)` or hardcoded currency instead of SDK.

### Fix

- In your STORIFY_THEME_CONFIG handler, call **setStoreConfig({ id: payload.storeId, currency: payload.store?.currency, language: payload.store?.language })** before using formatPrice.
- Use **formatPrice(price)** from the Storefront SDK for all price display.

---

## 7) Product description XSS or broken HTML

### Symptoms

- Product description renders raw HTML or breaks layout.
- Security concern with user-generated content.

### Fix

- Use **prepareProductDescription(html)** from the Storefront SDK; do not use raw `dangerouslySetInnerHTML` on `product.description`. The SDK returns sanitized, safe HTML.

---

## 8) Reviews or wishlist not working

### Symptoms

- Reviews do not load or submit; wishlist does not persist.

### Common causes

- setStoreConfig not called, so store id is missing for API/localStorage.
- Custom API or localStorage implementation instead of SDK.

### Fix

- Call **setStoreConfig** when you receive STORIFY_THEME_CONFIG (store id is required for reviews API and wishlist key).
- Use SDK **useReviews(productId)**, **addReview(productId, input)**, and **useWishlist()** instead of calling APIs or localStorage directly.

---

## 9) API requests work locally but fail in storefront

### Symptoms

- 401/404/empty data in production storefront.

### Common causes

- Wrong base URL assumption.
- Missing store header.
- CORS/auth assumptions from local setup.

### Fix

- Use storefront-relative API (`/api/...`) when running inside storefront domain.
- Always include `X-Store-Id` when available.
- Use `credentials: 'include'` for fetch calls.

---

## 10) Checkout/order pages not themed

### This is expected

- Themes render storefront **home** via iframe.
- `/checkout` and `/order-success` are platform-owned routes and cannot be overridden.

Use theme links to route users there (`/checkout`) but do not attempt to render those pages inside theme bundle.

---

## 11) `config/pages` defaults not applied

### Symptoms

- Uploaded theme ignores page-specific defaults.

### Common causes

- JSON files not inside path containing `config/pages/`.
- File names do not match page ids.
- JSON invalid.

### Fix

- Keep files as `config/pages/{pageId}.json` in zip.
- Ensure valid JSON object structure keyed by layout handle.

---

## 12) Recommended debug checklist

1. Open browser devtools inside iframe.
2. Confirm postMessage payload is received once on load and **setStoreConfig** is called with storeId and store.
3. Log `payload.layout.length`, `payload.storeId`, and key settings fields.
4. Inspect failed network calls and confirm `X-Store-Id` (or use SDK which sends it automatically).
5. Temporarily render raw payload JSON in dev to inspect schema mismatch.
6. If prices/reviews/wishlist fail, verify setStoreConfig was called and you use SDK (formatPrice, useReviews, useWishlist).

---

## 14) CLI dev preview issues

See the dedicated guide: **[13-CLI-DEV-PREVIEW.md](13-CLI-DEV-PREVIEW.md)** (login, local preview, ports, flags).

| Symptom | Quick fix |
|---------|-----------|
| `Theme URL host is not allowed` | Update backend; restart `shared/backend`. |
| Storefront shows platform theme, not yours | Open the **Storefront** URL from CLI, not Vite alone; ensure storefront runs on port **3004**. |
| `uploadedThemeBaseUrl` null in bootstrap | Dev link failed — re-run `npm run dev`; check login token. |
| Admin editor 404 | Use `/{storeId}/admin/theme/edit`, not `/admin/theme-studio`. |
| Wrong CLI / old help | Do not use `npx storify`; rebuild CLI and use `npm run dev`. |

---

## 13) Do I need storefront-sdk.ts (or any SDK file) in my theme?

**No.** You do not need to create or ship a file named `storefront-sdk.ts` or `storefront-sdk.js` in your theme. The platform serves the SDK script; your theme loads it by injecting `<script src={payload.sdkScriptUrl}>` when you receive `STORIFY_THEME_CONFIG`, then calls `StorifySDK.setStoreConfig`. All data and formatting then use `window.StorifySDK`. If you want one import for hooks and helpers (e.g. `useProduct`, `formatPrice`), copy the **theme-adapter** folder from the Storify repo into your theme and import from there — see [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md).

---

If the issue remains unresolved, cross-check:

- [05-RUNTIME-CONFIG.md](05-RUNTIME-CONFIG.md)
- [10-API-REFERENCE.md](10-API-REFERENCE.md)
- [11-CHECKLIST.md](11-CHECKLIST.md)
