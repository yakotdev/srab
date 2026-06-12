# Theme Manifest Reference

The **theme manifest** is a JSON file named `theme-manifest.json` that must be at the **root of your theme package** (same level as `index.html` inside the zip). It describes the theme’s identity, entry script, sections, optional pages, and theme-level settings schema.

You can validate your manifest against the JSON Schema in this folder: [theme-manifest.schema.json](theme-manifest.schema.json).

---

## Required fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Theme name (shown in the admin theme library). |
| `version` | string | Theme version (e.g. `"1.0.0"`). |
| `entry` | string | Path to the main JavaScript bundle, relative to the theme root (e.g. `assets/main-xxx.js`). |
| `sections` | array | List of section definitions (see below). At least one section; max 100. |

---

## Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `themeSettingsSchema` | object | Schema for theme-level settings (colors, menus, etc.). Same field types as section `contentSchema`. Prefer this over `settingsSchema` for new themes. |
| `settingsSchema` | object | Legacy alias for theme-level settings; use `themeSettingsSchema` for new themes. |
| `manifestVersion` | number | Manifest format version (e.g. `1` for current). |
| `languages` | string[] | Supported locale codes (e.g. `["ar", "en"]`). |
| `assets` | object | Default asset paths (e.g. `{ "default_logo": "assets/logo.png" }`). |
| `pages` | array | (DSL) Explicit page definitions: `id`, `type`, `path`, and `layout` (array of section placement items). See Page definitions below. |
| `pageDefaults` | object | Per-page default content keyed by page id, then layout handle (usually merged automatically from `config/pages/*.json` on upload). |

---

## Section shape

Each item in `sections` has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique section id (e.g. `hero`, `featured_products`). |
| `name` | string | Yes | Display name in the theme editor (merchant can override; stored as `customName`). |
| `component` | string | Yes | Component identifier (for your own mapping in the theme; e.g. `HERO`, `SLIDESHOW`). |
| `order` | number | No | Default sort order (lower = higher on page). |
| `group` | string | No | One of `header_group`, `template_group`, `overlay_group`, `footer_group`. Used by the editor to group sections. |
| `allowedPages` | string[] | No | (DSL) Page ids this section can appear on (e.g. `["home", "product"]`). |
| `contentSchema` | object | No | Schema for section content fields (title, image, link, etc.). Keys = field names; values = editor field definitions. See [03-EDITOR-FIELD-TYPES.md](03-EDITOR-FIELD-TYPES.md). |
| `defaultContent` | object | No | Default values for `contentSchema` fields. |

### Example section

```json
{
  "id": "hero",
  "name": "Hero Banner",
  "component": "HERO",
  "order": 0,
  "group": "template_group",
  "allowedPages": ["home"],
  "contentSchema": {
    "title": { "type": "text", "label": "Title", "localizable": true },
    "subtitle": { "type": "textarea", "label": "Subtitle" },
    "image": { "type": "image", "label": "Background image", "aspectRatio": "landscape" },
    "cta_link": { "type": "link", "label": "Button link", "default": "/shop" }
  },
  "defaultContent": {
    "title": "Welcome to our store",
    "subtitle": "Shop the latest collection.",
    "cta_link": "/shop"
  }
}
```

---

## Page definitions (DSL)

When using the `pages` array (DSL format), each page has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Page id (e.g. `home`, `shop`, `product`). |
| `type` | string | Page type (e.g. `home`, `collection`, `product`). |
| `path` | string | URL path (e.g. `/` for home). |
| `layout` | array | List of section placements. Each item: `sectionId` (references `sections[].id`), `handle` (unique handle for this section instance on this page, e.g. `home_hero`), and optionally `defaultEnabled` (boolean). |

### Example pages array

```json
{
  "pages": [
    {
      "id": "home",
      "type": "home",
      "path": "/",
      "layout": [
        { "sectionId": "header", "handle": "home_header", "defaultEnabled": true },
        { "sectionId": "hero", "handle": "home_hero", "defaultEnabled": true },
        { "sectionId": "featured", "handle": "home_featured", "defaultEnabled": true },
        { "sectionId": "footer", "handle": "home_footer", "defaultEnabled": true }
      ]
    }
  ]
}
```

The storefront uses the **home** page layout to determine which sections to send in the postMessage payload for the theme iframe. Other pages (shop, product, etc.) are rendered by the platform; your theme only receives and renders the home layout.

---

## Theme-level settings (themeSettingsSchema)

Use the same [editor field types](03-EDITOR-FIELD-TYPES.md) as in section `contentSchema`. Typical use: accent color, number of products per row, and **menu** fields for header/footer navigation. Values are sent in the postMessage payload under `payload.settings`.

Example:

```json
{
  "themeSettingsSchema": {
    "accent_color": { "type": "color", "label": "Accent color", "default": "#6366f1" },
    "nav_primary": { "type": "menu", "label": "Primary navigation" },
    "footer_menu": { "type": "menu", "label": "Footer menu" }
  }
}
```

Menu fields store the menu **handle**. Fetch menu items with `GET /api/menus/by-handle?handle={handle}` and header `X-Store-Id: {storeId}` (see [10-API-REFERENCE.md](10-API-REFERENCE.md)).

---

## contentSchema (per section)

Keys are field names; values are objects with at least `type` and optionally `label`, `description`, `required`, `localizable`, `default`, and type-specific options (e.g. `options` for select, `fields` for repeater). See [03-EDITOR-FIELD-TYPES.md](03-EDITOR-FIELD-TYPES.md) for the full list.

If a section has no `contentSchema` or it is empty, the editor may show a raw JSON editor for that section’s content.

---

## Validation notes

- Backend validates manifest on upload: required fields present, `sections` array length (max 100), and (for DSL) that every `layout[].sectionId` references a section `id`.
- Manifest file size is limited (e.g. 100 KB). Keep `contentSchema` / `themeSettingsSchema` and `defaultContent` reasonable.
- Use `manifestVersion: 1` for the current DSL format so future changes can remain backward compatible.

---

## Compatibility notes

Use this table as a quick compatibility contract:

| Topic | Recommended now | Backward compatibility |
|------|------------------|------------------------|
| Theme settings schema key | `themeSettingsSchema` | `settingsSchema` is still accepted as legacy alias. |
| Manifest DSL version | `manifestVersion: 1` | Missing `manifestVersion` may still work for simple manifests, but `1` is recommended for explicit compatibility. |
| Page defaults | `config/pages/*.json` merged into `pageDefaults` | Direct `pageDefaults` in manifest is also accepted if produced by your build pipeline. |
| Section grouping | `group` in (`header_group`, `template_group`, `overlay_group`, `footer_group`) | If absent, rendering order falls back to numeric `order` and host defaults. |

If you are upgrading an older theme, keep legacy keys temporarily but migrate to current names in the next release to avoid ambiguity.

Next: [03-EDITOR-FIELD-TYPES.md](03-EDITOR-FIELD-TYPES.md) for all supported field types.
