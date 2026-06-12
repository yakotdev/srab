# Runtime Config

Your theme runs inside an **iframe** on the storefront home page. It receives **layout**, **settings**, **storeId**, and **store** info via a single **postMessage** from the parent. You do not need a separate API call to get this config.

---

## postMessage: STORIFY_THEME_CONFIG

The storefront posts one message type:

- **type:** `"STORIFY_THEME_CONFIG"`
- **payload:** object with the following fields.

### Payload shape

```ts
// Message: window.postMessage from storefront to theme iframe
{
  type: "STORIFY_THEME_CONFIG",
  payload: {
    layout: Array<{
      id: string;           // section id from manifest
      customName?: string; // merchant-edited name
      content?: Record<string, unknown>;  // section content (from editor or defaultContent)
      order: number;
      enabled: boolean;
    }>;
    settings: Record<string, unknown>;  // theme-level settings from themeSettingsSchema
    storeId?: string;       // store id (for SDK / API calls)
    store?: {               // store info from General settings
      name: string;
      logo: string;
      favicon: string;
      email: string;
      phone: string;
      address: string;
      metaDescription?: string;
      currency?: string;    // used by SDK formatPrice
      language?: string;    // used by SDK formatPrice
    };
    // Optional: host may send pre-fetched data to avoid extra requests
    products?: Array<unknown>;
    categories?: Array<unknown>;
    path?: string;
    productId?: string;
    currentProduct?: unknown;
    /** URL of the Storefront SDK script (platform origin). Load this script instead of bundling the SDK. */
    sdkScriptUrl?: string;
    /** Absolute API base (e.g. https://storefront.example.com/api). Pass to setStoreConfig when using platform SDK. */
    apiBaseUrl?: string;
  };
}
```

- **layout** — Sections for the home page, **ordered** as saved by the merchant. Filter by `enabled !== false` and sort by `order`, then render in that order.
- **content** — Per-section content (values from the editor or your `defaultContent`). Menu fields in sections store the menu handle; theme-level menu fields are in `settings`.
- **settings** — Theme-level settings (e.g. accent color, menu handles like `nav_primary`, `footer_menu`). Use these for global UI (header, footer, styles).
- **storeId** — Required for the Storefront SDK; the SDK sends it as `X-Store-Id` on all requests. You must pass it to **setStoreConfig** when you receive the payload.
- **store** — Store name, logo, favicon, contact, **currency**, and **language**. Pass `currency` and `language` to **setStoreConfig** so **formatPrice** and other formatters use the correct locale.
- **products**, **categories**, **currentProduct** — Optional; the host may include them so the theme can render without an extra fetch. For other data use the **Storefront SDK**.
- **sdkScriptUrl** — URL of the SDK script served by the platform (same origin as storefront). **Load this script in your theme** instead of bundling the SDK; the platform controls the code, reducing security risk.
- **apiBaseUrl** — Absolute API base URL. When using the platform-loaded SDK, pass this to **setStoreConfig** so the SDK can call the storefront API from the cross-origin iframe.

The message is sent when the iframe loads and when the config changes (e.g. after the merchant saves in the theme editor).

---

## How to subscribe (JavaScript)

**Recommended: load the SDK from the platform** (see [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md)). When you receive `STORIFY_THEME_CONFIG`, load the script from `payload.sdkScriptUrl` (if not already loaded), then call **StorifySDK.setStoreConfig** with `id`, `currency`, `language`, and **apiBaseUrl** so the SDK works in the iframe. Store the payload for layout/settings.

```js
function useStorifyThemeConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type !== 'STORIFY_THEME_CONFIG' || !event.data.payload) return;
      const p = event.data.payload;

      function applyConfig() {
        if (window.StorifySDK) {
          window.StorifySDK.setStoreConfig({
            id: p.storeId,
            currency: p.store?.currency,
            language: p.store?.language,
            apiBaseUrl: p.apiBaseUrl,
          });
        }
        setConfig(p);
      }

      if (p.sdkScriptUrl && !window.StorifySDK) {
        const script = document.createElement('script');
        script.src = p.sdkScriptUrl;
        script.onload = applyConfig;
        script.onerror = () => setConfig(p); // still use payload for layout
        document.head.appendChild(script);
      } else {
        applyConfig();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return config;
}
```

---

## Security and trust boundaries

- Treat `postMessage` payload as external input; always validate required shape before using nested values.
- If your storefront host origin is known and fixed, verify `event.origin` before accepting messages.
- Avoid `dangerouslySetInnerHTML` with raw payload content unless sanitized.
- Never trust `storeId` from arbitrary query params over `payload.storeId` when both exist.

---

## How to render

1. Wait for `config` (show a loading state until the first message).
2. From `config.layout`, filter items with `enabled !== false` and sort by `order`.
3. For each item, render the section with:
   - `id` — section id (map to your component, e.g. HERO, SLIDESHOW).
   - `customName ?? id` — display name if needed.
   - `content ?? {}` — section content (titles, images, links, repeater arrays, etc.).
   - `config.settings` — theme settings (colors, menu handles).
   - `config.storeId` — for API calls.
   - `config.store` — for store name, logo, favicon, etc.

Example (React-style):

```js
const enabledSections = (config.layout || [])
  .filter((s) => s.enabled !== false)
  .sort((a, b) => a.order - b.order);

return (
  <div>
    {enabledSections.map((section) => (
      <SectionRenderer
        key={section.id}
        id={section.id}
        content={section.content ?? {}}
        settings={config.settings}
        storeId={config.storeId}
        store={config.store}
      />
    ))}
  </div>
);
```

---

## Bootstrap (storefront side)

The storefront loads theme and config (including uploaded theme layout/settings) via a **bootstrap** API (e.g. `GET /api/bootstrap` with `X-Store-Id`). That response is used to decide the theme’s `baseUrl` and to build the payload sent to your iframe. As a theme developer you do not call the bootstrap API yourself; you only consume the postMessage. Store identification inside the iframe is via `payload.storeId` and (if needed) the same origin or query params (e.g. `?storeId=...`) that the storefront may add to the iframe URL.

---

## Menu handles in payload

If you defined **menu** fields in `themeSettingsSchema` or in a section’s `contentSchema`, the saved value is the menu **handle**. You will see it in `payload.settings` (e.g. `settings.nav_primary`) or in `payload.layout[].content` for that section. To get the actual links, call the menus API: `GET /api/menus/by-handle?handle={handle}` with header `X-Store-Id: {storeId}`. See [10-API-REFERENCE.md](10-API-REFERENCE.md).

---

## Runtime debug quick checks

When a theme does not render as expected:

1. Log first payload once on message receive (`console.debug('theme payload', event.data.payload)`).
2. Confirm **setStoreConfig** is called with `payload.storeId` and `payload.store` (currency, language) so the SDK works correctly.
3. Confirm `layout` is array and has at least one enabled section.
4. Confirm `storeId` is present; the SDK uses it for all API requests (`X-Store-Id`).
5. If sections appear empty, inspect `payload.layout[n].content` and compare field keys with your section component expectations.
6. If prices or locale look wrong, ensure `payload.store?.currency` and `payload.store?.language` are passed to setStoreConfig.

Next: [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md) for products, cart, wishlist, reviews, menus, and formatting.
