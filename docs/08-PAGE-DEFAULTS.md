# Page Defaults (config/pages)

Instead of relying only on `sections[].defaultContent` in the manifest (one default per section for all pages), you can define **per-page default content** using optional JSON files inside your theme zip under **config/pages/**.

---

## Purpose

- **One file per page** (e.g. `home.json`, `shop.json`, `product.json`).
- File name (without `.json`) = page id matching your manifest `pages[].id` (e.g. `home`, `shop`, `product`).
- Each file is an object: keys = **section handles** (as in `pages[].layout[].handle`, e.g. `home_hero`, `home_featured`), values = **default content** for that section on that page (same shape as `defaultContent` in the manifest).

This lets you ship different default copy or content per page without duplicating section definitions.

---

## Directory structure in the zip

Paths like the following are accepted (any path that contains `config/pages/` and ends with `.json`):

- `config/pages/home.json`
- `dist/config/pages/home.json`

Example:

```
theme.zip
  theme-manifest.json
  index.html
  assets/...
  config/
    pages/
      home.json
      shop.json
      product.json
```

---

## File format

Each key in the JSON file is the **handle** of a section on that page (must match `layout[].handle` for that page in the manifest). The value is the default content object for that section.

Example **home.json**:

```json
{
  "home_header": {},
  "home_hero": {
    "title": "Welcome to our store",
    "subtitle": "Shop with ease.",
    "alignment": "right",
    "buttonText": "Shop now",
    "cta_link": "/shop"
  },
  "home_featured": {
    "title": "Featured products",
    "products_source": "best_selling",
    "count": 4,
    "columns": 4
  },
  "home_footer": {
    "text": "© Your store. All rights reserved.",
    "backgroundColor": "#0f172a",
    "textColor": "#ffffff"
  }
}
```

---

## Merge behavior on upload

When the theme zip is uploaded:

1. The backend reads `theme-manifest.json` and validates it.
2. It scans the zip for any path containing `config/pages/` and ending with `.json`.
3. For each such file, the **filename without .json** is the page id; the **parsed JSON object** is the page’s default content keyed by handle.
4. These are merged into the manifest under **`pageDefaults`**:  
   `manifest.pageDefaults = { home: {...}, shop: {...}, ... }`.
5. The updated manifest (with `pageDefaults`) is stored. When the merchant activates the theme, the platform builds the initial layout and section content from the manifest and `pageDefaults` (and section `defaultContent` where a handle is missing).

So you do not need to duplicate section defaults in every page file; only override where the page should differ.

---

## Build and upload

- Include the `config/pages/` directory in your build output and in the zip (e.g. `cp -r config dist/` then zip the contents of `dist/`).
- After upload, you may see a success message indicating that a number of page configs were merged (e.g. "Theme uploaded. Merged settings for N page(s) from config/pages.").

Next: [09-EXAMPLES.md](09-EXAMPLES.md) for minimal and repeater examples.
