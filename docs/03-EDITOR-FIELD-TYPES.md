# Editor Field Types

This document lists the **field types** you can use in `contentSchema` (per section) and `themeSettingsSchema` (theme-level settings) in `theme-manifest.json`. The theme editor builds its UI from these definitions.

---

## Common properties (all fields)

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | **Required.** One of the types below. |
| `label` | string | Label shown in the editor. |
| `description` | string | Short help text under the field. |
| `required` | boolean | Whether the field is required. |
| `localizable` | boolean | If true, value can be stored per language. |
| `default` | any | Default value. |

---

## Field types

| Type | Description | Extra properties | Example use |
|------|-------------|------------------|-------------|
| **text** | Single-line text. | `maxLength?: number` | Title, button label. |
| **textarea** | Plain multi-line text. | `maxLength?: number` | Short description. |
| **richtext** | Rich text (headings, lists, links). | — | Article body, policy text. |
| **number** | Numeric value. | `min?`, `max?` | Count, price. |
| **select** | Single choice from a list. | `options`: `{ value, label }[]` or `string[]` | Layout style, language. |
| **multiselect** | Multiple choices. | `options`: same as select | Multiple categories. |
| **color** | Color picker. | — | Accent color, background. |
| **image** | Image from store media. | `aspectRatio?: 'square' \| 'landscape' \| 'portrait' \| 'free'` | Logo, banner. |
| **video** | Video URL or uploaded video. | — | Intro video. |
| **link** | Internal path or external URL. | — | CTA button, footer link. |
| **category** | Single category from the store. | — | “Products from this category” section. |
| **categories** | Multiple categories. | `maxItems?: number` | Multi-category filter. |
| **product** | Single product. | — | Featured product. |
| **products** | Multiple products. | `maxItems?: number` | Hand-picked product list. |
| **menu** | Navigation menu (by handle). | — | Header nav, footer menu. |
| **repeater** | Repeating group of fields. | `fields`, `minItems?`, `maxItems?`, `itemLabel?` | Slideshow slides, testimonials, features. |
| **metafield_mapping** | Map to product/category metafield. | — | Custom product field display. |

---

## Examples (JSON)

### Text and choices

```json
{
  "title": { "type": "text", "label": "Title", "localizable": true },
  "subtitle": { "type": "textarea", "label": "Subtitle", "maxLength": 500 },
  "layout": {
    "type": "select",
    "label": "Layout",
    "options": [
      { "value": "left", "label": "Left" },
      { "value": "center", "label": "Center" }
    ]
  }
}
```

### Media and link

```json
{
  "background_image": { "type": "image", "label": "Background image", "aspectRatio": "landscape" },
  "cta_link": { "type": "link", "label": "Button link" }
}
```

### Store entities

```json
{
  "category": { "type": "category", "label": "Category" },
  "products": { "type": "products", "label": "Featured products", "maxItems": 12 },
  "footer_menu": { "type": "menu", "label": "Footer menu" }
}
```

### Repeater (e.g. features)

```json
{
  "features": {
    "type": "repeater",
    "label": "Features",
    "itemLabel": "Feature",
    "minItems": 0,
    "maxItems": 6,
    "fields": {
      "icon": { "type": "image", "label": "Icon" },
      "title": { "type": "text", "label": "Title", "localizable": true },
      "description": { "type": "richtext", "label": "Description", "localizable": true }
    }
  }
}
```

### Repeater (slideshow)

```json
{
  "slides": {
    "type": "repeater",
    "label": "Slideshow",
    "itemLabel": "Slide",
    "minItems": 0,
    "maxItems": 10,
    "fields": {
      "image": { "type": "image", "label": "Image", "aspectRatio": "landscape" },
      "heading": { "type": "text", "label": "Heading", "localizable": true },
      "subheading": { "type": "text", "label": "Subheading", "localizable": true },
      "buttonText": { "type": "text", "label": "Button text", "localizable": true },
      "cta_link": { "type": "link", "label": "Button link", "default": "/shop" }
    }
  }
}
```

In the editor, repeaters show an “Add [itemLabel]” button and a list of items; each item’s fields are editable. In your theme, you read the value as an array (e.g. `content.slides`) and render one block per item.

---

## Menu fields

You can define **any number** of menu fields with any keys (e.g. `nav_primary`, `footer_col_1`). The editor shows a dropdown of the store’s menus; the saved value is the menu **handle**. In the runtime payload you get `settings.nav_primary`, `settings.footer_col_1`, etc. Use the [Menus API](10-API-REFERENCE.md#menus) with that handle and `X-Store-Id` to fetch menu items and render links.

---

## Notes

- Unknown types may be treated as text or raw JSON by the editor depending on implementation.
- New types may be added in future DSL versions; themes that ignore unknown types remain valid.

Next: [04-PACKAGE-AND-UPLOAD.md](04-PACKAGE-AND-UPLOAD.md) for zip layout and upload.
