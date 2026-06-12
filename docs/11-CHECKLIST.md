# Pre-submission checklist

Use this before submitting or shipping a theme.

---

## 1) Manifest correctness

- theme-manifest.json is at the root of the zip (same level as index.html).
- Required fields present: name, version, entry, sections.
- entry points to a file that exists in the zip.
- sections: at least one section; each has id, name, component.
- Section ids are unique.
- If using pages (DSL), every layout[].sectionId references an existing section id.
- manifestVersion set to 1 if using full DSL.
- If both `settingsSchema` and `themeSettingsSchema` exist, prefer `themeSettingsSchema` for new fields.

---

## 2) Package validity

- Zip contains index.html that loads the entry script.
- Zip under 50 MB; no single file over 10 MB.
- No path traversal (..) in zip paths.
- If using config/pages, files under path containing config/pages/ and named by page id.
- `theme-manifest.json`, `index.html`, and `assets/*` are all inside the same zip root.

---

## 3) Editor schema quality

- contentSchema and themeSettingsSchema use only supported field types (see 03-EDITOR-FIELD-TYPES.md).
- select/multiselect have options array.
- repeater has fields (and optionally itemLabel, minItems, maxItems).
- image can set aspectRatio.
- default values are provided for fields that affect first render (e.g. CTA link, title, repeater empty array).

---

## 4) Runtime integration

- Theme listens for message and handles type STORIFY_THEME_CONFIG.
- **Load SDK from platform:** inject script from `payload.sdkScriptUrl` (do not bundle the SDK in the theme). On load, call **StorifySDK.setStoreConfig({ id: payload.storeId, currency: payload.store?.currency, language: payload.store?.language, apiBaseUrl: payload.apiBaseUrl })**.
- Renders only sections with enabled !== false, sorted by order.
- Uses **window.StorifySDK** for products, categories, menus, cart, wishlist, reviews — not a custom API layer. **You do not need a file named storefront-sdk.ts or any SDK file in your theme zip**; the platform serves the SDK. Optionally use the **theme-adapter** folder for one import (see 06-STOREFRONT-SDK.md).
- Menu handles from payload.settings or content used with SDK (getMenuByHandle) or menus API.
- No hardcoded store id.
- Theme works when payload arrives more than once (editor save / updates).

## 4b) SDK and formatting

- **Prices:** use **formatPrice(price)** from the SDK for all price display; do not use `toFixed(2)` or hardcoded currency.
- **Product description HTML:** use **prepareProductDescription(html)** from the SDK; do not use raw `dangerouslySetInnerHTML` on `product.description`.
- **Reviews:** use SDK **useReviews(productId)** and **addReview(productId, input)** when showing or submitting reviews.
- **Wishlist:** use SDK **useWishlist()** (wishlist, toggleWishlist, isInWishlist) instead of custom localStorage or API.

---

## 5) Navigation and route constraints

- CTA and menu links use correct store paths (/shop, /product/:id).
- Checkout and order-success are not overridden.
- Theme does not assume it controls non-home routes.

---

## 6) API and resilience

- API requests include `credentials: 'include'` when needed.
- Failures in one section (e.g. menu fetch) do not crash whole page.
- Missing optional data (logo, menu, policy) has fallback UI/text.

---

## 7) Optional enhancements

- `config/pages/*.json` included and valid (if used).
- `theme-manifest.schema.json` used during development validation.
- Local preview fallback exists for environments without parent postMessage (dev only).

---

## 8) Final verification flow (recommended)

1. Build cleanly (`npm run build`) and inspect `dist/`.
2. Zip **contents** of `dist/` (not parent folder).
3. Upload theme in admin and verify upload success.
4. Activate theme for a test store.
5. Open storefront home and verify:
   - sections render in expected order
   - theme settings apply
   - menu links resolve from handles
   - API-powered sections load with correct store data
6. Change section content/settings in editor, save, and confirm runtime updates.

---

Then zip the theme and upload via admin Theme Library. Test activation and editing; verify home page in storefront.
