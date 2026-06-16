<p align="center">
  <a href="https://storify.it.com/" target="_blank" rel="noopener noreferrer">
    <img src="https://cdn.storify.it.com/powerdbystorify-black.svg" alt="Storify" width="220" />
  </a>
</p>

<h1 align="center">Srab</h1>

<p align="center">
  Official <strong>Storify</strong> storefront theme — Arabic-first UI, rich sections, and full customization from the theme editor.
</p>

<p align="center">
  <a href="https://storify.it.com/developers/themes/introduction"><strong>Theme developer documentation</strong></a>
</p>

---

## Package for upload

```bash
npm install
npm run zip
```

This produces **`srab-theme.zip`** in the project root. In the Storify admin: **Uploaded themes** → Upload theme → select the file → **Use this theme**.

## Local development

```bash
npm run dev          # Local preview
npm run sync         # Sync with a Storify store
npm run build        # Build dist/
npm run lint         # TypeScript check
```

## Project structure

| Path | Description |
|------|-------------|
| `theme-manifest.json` | Section, page, and theme setting definitions |
| `config/pages/` | Default content per page |
| `src/sections/` | Section components |
| `public/locales/` | UI translations (Arabic, English, French) |

For the full technical guide — building the theme, manifest, SDK, and upload — see the **[Storify developer docs](https://storify.it.com/developers/themes/introduction)**.

## License

Storify platform theme. Use is subject to the platform terms.
