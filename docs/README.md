# Storify Theme Developer Guide

This guide is for **external developers** who build themes outside the Storify platform. It covers everything you need to create, package, and run a theme that integrates with Storify storefronts: manifest format, packaging, upload, runtime config (postMessage), editor field types, Storefront SDK, public APIs, page defaults, and examples.

**All documentation in this folder is in English.**

---

## Prerequisites

- Basic HTML/JavaScript or a framework (e.g. React, Vue) for the theme UI.
- Ability to produce a **zip file** containing your built theme (e.g. `dist/` output).
- Familiarity with REST APIs and request headers (e.g. `X-Store-Id` for multi-store).

---

## Table of Contents

| Document | Description |
|----------|-------------|
| [01-OVERVIEW.md](01-OVERVIEW.md) | What a Storify theme is, how it loads (iframe), and high-level data flow. |
| [02-MANIFEST.md](02-MANIFEST.md) | Full `theme-manifest.json` reference: required/optional fields, sections, pages. |
| [03-EDITOR-FIELD-TYPES.md](03-EDITOR-FIELD-TYPES.md) | All field types for `contentSchema` and `themeSettingsSchema` with examples. |
| [04-PACKAGE-AND-UPLOAD.md](04-PACKAGE-AND-UPLOAD.md) | Zip layout, size limits, upload via admin, and "Update (code only)" flow. |
| [05-RUNTIME-CONFIG.md](05-RUNTIME-CONFIG.md) | How the theme receives config: postMessage `STORIFY_THEME_CONFIG` payload. |
| [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md) | Hooks and helpers: products, cart, wishlist, reviews, categories, menus, store config, formatPrice, prepareProductDescription, setStoreConfig. |
| [06b-INTEGRATION-FLOW.md](06b-INTEGRATION-FLOW.md) | **Correct integration flow (بدل ملف SDK):** step-by-step (listen → load script → setStoreConfig → use SDK), do-not-do list, checklist. |
| [06a-STOREFRONT-SDK-REFERENCE.md](06a-STOREFRONT-SDK-REFERENCE.md) | Full SDK API reference (signatures, types, examples). |
| [STOREFRONT_SDK_PLAN.md](STOREFRONT_SDK_PLAN.md) | SDK plan: file layout, contract, and what themes must use. |
| [07-PAGES-AND-ROUTES.md](07-PAGES-AND-ROUTES.md) | Which routes are theme-rendered vs platform-fixed (checkout, order-success). |
| [08-PAGE-DEFAULTS.md](08-PAGE-DEFAULTS.md) | Optional `config/pages/*.json` in the zip and how they are merged. |
| [09-EXAMPLES.md](09-EXAMPLES.md) | Load SDK from platform, theme adapter (استيراد واحد), minimal/multi-section theme, menu, repeater, featured product + cart (E مع E2 بالـ adapter), product grid, reviews/wishlist, local preview. |
| [10-API-REFERENCE.md](10-API-REFERENCE.md) | Public API endpoints: bootstrap, products, menus, store config, etc. |
| [11-CHECKLIST.md](11-CHECKLIST.md) | Pre-submission checklist for theme developers. |
| [12-TROUBLESHOOTING.md](12-TROUBLESHOOTING.md) | Common runtime/build/upload issues and how to fix them quickly. |
| [13-CLI-DEV-PREVIEW.md](13-CLI-DEV-PREVIEW.md) | **Storify Theme CLI:** login, live storefront preview, local/remote modes, full workflow. |

**Schema:** [theme-manifest.schema.json](theme-manifest.schema.json) — JSON Schema for `theme-manifest.json` (optional; use in your editor for validation).

---

## Quick start

1. Create a `theme-manifest.json` at the root of your built output with `name`, `version`, `entry`, and `sections`.
2. Build your theme (e.g. `dist/`) and zip its contents (root must include `theme-manifest.json` and the file pointed to by `entry`).
3. Upload the zip via the merchant admin: **Theme Library → Upload theme (zip)**.
4. Your theme runs in an **iframe** on the storefront home page. It receives **layout**, **settings**, **storeId**, **store**, and optionally **products** / **categories** via a single postMessage: `type: "STORIFY_THEME_CONFIG"`.
5. **Load the SDK from the platform:** Use `payload.sdkScriptUrl` to inject the Storefront SDK script (do not bundle the SDK in your theme — the platform serves it for security). Then call **StorifySDK.setStoreConfig** with `payload.storeId`, `payload.store` (currency, language), and **payload.apiBaseUrl**.
6. Use **window.StorifySDK** for all data and formatting (getProducts, formatPrice, cart, wishlist, reviews, etc.). **You do not need a file named storefront-sdk.ts or any SDK file in your theme** — no constants.ts, no custom API layer. Optionally copy the **theme-adapter** folder from the repo for a single import (hooks + helpers); see [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md).

---

## Recommended reading order

For complete implementation, read in this order:

1. **Architecture and constraints:** [01-OVERVIEW.md](01-OVERVIEW.md), [07-PAGES-AND-ROUTES.md](07-PAGES-AND-ROUTES.md)
2. **Manifest and editor schemas:** [02-MANIFEST.md](02-MANIFEST.md), [03-EDITOR-FIELD-TYPES.md](03-EDITOR-FIELD-TYPES.md)
3. **Packaging and runtime integration:** [04-PACKAGE-AND-UPLOAD.md](04-PACKAGE-AND-UPLOAD.md), [05-RUNTIME-CONFIG.md](05-RUNTIME-CONFIG.md)
4. **Data and APIs:** [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md), [10-API-REFERENCE.md](10-API-REFERENCE.md)
5. **Defaults and production readiness:** [08-PAGE-DEFAULTS.md](08-PAGE-DEFAULTS.md), [09-EXAMPLES.md](09-EXAMPLES.md), [11-CHECKLIST.md](11-CHECKLIST.md), [12-TROUBLESHOOTING.md](12-TROUBLESHOOTING.md)
6. **Local development with CLI:** [13-CLI-DEV-PREVIEW.md](13-CLI-DEV-PREVIEW.md)

---

## Scope reminder

- **Theme controls home (`/`) only** when an uploaded theme is active.
- **Checkout and order-success are platform-owned** and cannot be overridden by a theme.
- **Runtime source of truth is postMessage** (`STORIFY_THEME_CONFIG`), not a custom theme config endpoint.
- **Use the Storefront SDK** for store data and formatting; the SDK sends `X-Store-Id` and provides formatPrice, prepareProductDescription, useWishlist, useReviews, etc. Do not build a separate API layer in the theme.
