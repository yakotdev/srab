# Package and Upload

## Zip layout

Your theme is delivered as a **zip file**. When unpacked, the root must contain:

- **theme-manifest.json** — the manifest file (required).
- **index.html** — the page loaded in the iframe (typically loads your entry script).
- The file referenced by `manifest.entry` (e.g. `assets/main-xxx.js`) and any other assets (CSS, images, fonts).

Optional:

- **config/pages/** — directory with one JSON file per page (e.g. `home.json`, `shop.json`). See [08-PAGE-DEFAULTS.md](08-PAGE-DEFAULTS.md). Paths like `config/pages/home.json` or `dist/config/pages/home.json` are accepted; the backend merges them into the manifest as `pageDefaults`.

Example structure:

```
my-theme.zip
  theme-manifest.json
  index.html
  assets/
    main-abc123.js
    style.css
  config/
    pages/
      home.json
      shop.json
```

---

## Size limits

- **Total zip size:** 50 MB.
- **Single file inside zip:** 10 MB.

Larger zips or files will be rejected on upload.

---

## Upload flow (merchant)

1. In Storify admin, open Theme Library.
2. Use "Upload theme (zip)" and select your zip file.
3. Backend validates `theme-manifest.json`, optionally merges `config/pages/*.json` into `pageDefaults`, stores all files under a theme prefix (e.g. `themes/{themeId}/`), and creates an UploadedTheme record with `baseUrl`.
4. If page defaults were merged, the response may include `pageDefaultsLoaded` (number of pages).
5. The new theme appears in the library. The merchant can Activate it or Edit it in the theme editor.

Upload is done through the admin UI.

---

## Update (code only)

Storify supports an **Update (code only)** action per theme. This:

- Accepts a new zip file.
- Replaces only the theme dist (JS, CSS, HTML, images, and `theme-manifest.json`).
- Does **not** overwrite store-specific data: layout order, section content, theme settings, and draft are preserved.

Use this when you fix bugs or add features in the theme code without resetting the store layout or settings.

---

## What gets stored

All files from the zip are stored under a single prefix (e.g. `themes/{themeId}/`). The **baseUrl** is the base URL for that prefix. The iframe loads `{baseUrl}index.html?storeId=...`.

Ensure your zip does not use paths with `..`. Invalid paths are skipped during upload.

---

## Build checklist

- Put `theme-manifest.json` at the root of what you zip.
- Ensure `entry` in the manifest points to a path that exists in the zip (e.g. `assets/main.js`).
- Ensure `index.html` loads the entry script.
- If you use `config/pages/*.json`, include them in the zip under a path containing `config/pages/` and ending with `.json` for each page.

Next: [05-RUNTIME-CONFIG.md](05-RUNTIME-CONFIG.md) for how the theme receives config at runtime.
