# Pages and Routes

## Theme-rendered vs platform routes

Only the **home page** is rendered by your uploaded theme (inside the iframe). All other routes are handled by the Storify platform and are not replaced by your theme.

---

## Home page (`/`)

- When the store has an **uploaded theme** (a theme with a `baseUrl`), the storefront loads the home page by embedding an **iframe**.
- The iframe URL is `{themeBaseUrl}/index.html?storeId={storeId}` (and any other query params the platform adds).
- Your theme app runs in this iframe and receives layout, settings, storeId, and store via the **STORIFY_THEME_CONFIG** postMessage.
- You render the sections in the order defined by the payload; you do not control other pages.

---

## Platform routes (not theme-rendered)

These are always handled by the platform. Your theme does not provide HTML or routing for them:

| Route | Description |
|-------|-------------|
| `/shop` | Shop / product listing. |
| `/product/:id` | Product detail page. |
| `/checkout` | Checkout (fixed; never replaced by theme). |
| `/order-success` | Order confirmation (fixed; never replaced by theme). |
| `/wishlist` | Wishlist page. |
| `/track-order` | Order tracking. |
| `/about` | About page. |
| `/contact` | Contact page. |
| `/profile` | Customer profile. |
| `/policies/:slug` | Policy pages (privacy, terms, shipping, return-exchange). |

Links in your theme (e.g. "Shop now", menu links) should point to these paths (e.g. `/shop`, `/product/123`) so that navigation stays inside the storefront and checkout/order-success remain the platform’s pages.

---

## Summary

- **Your theme:** Renders only the **home** experience inside the iframe. For products, cart, wishlist, reviews, and formatting use the [Storefront SDK](06-STOREFRONT-SDK.md).
- **Platform:** Renders all other routes, including checkout and order-success, which cannot be overridden by a theme.

Next: [08-PAGE-DEFAULTS.md](08-PAGE-DEFAULTS.md) for optional default content per page.
