# CLI Dev Preview

Use the **Storify Theme CLI** to develop a theme locally while previewing it on a **real storefront** with live store data (products, menus, currency, translations).

**Internal reference (platform team):** [../theme/STORIFY_CLI_DEV_PREVIEW.md](../theme/STORIFY_CLI_DEV_PREVIEW.md)

---

## What you get

- Local **Vite** hot reload for your theme code.
- Storefront renders your theme with **real API data** for the store you select.
- No need to zip and upload on every change during development.
- Optional **remote preview** via Cloudflare tunnel when your API is not on localhost.

---

## Prerequisites

1. **Storify backend** running and reachable (e.g. `http://localhost:3001/api`).
2. **Storefront** running for local preview (e.g. `http://localhost:3004`).
3. **Merchant account** with access to at least one store.
4. Backend env: `LEGACY_TOKEN_RESPONSE=true` (so login returns a bearer token to the CLI).
5. **Node.js 20+** on your machine.
6. For remote tunnel mode: [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed.

---

## Install the CLI (monorepo)

From the Storify source repo:

```bash
cd packages/storify-cli
npm install
npm run build
```

Work from a theme folder (starter: `themes/srab`):

```bash
cd themes/srab
npm install
npm run dev
```

Theme `package.json` scripts call the CLI directly:

```json
"dev": "node ../../packages/storify-cli/dist/cli.js theme dev"
```

**Do not use `npx storify`** — it may resolve to an unrelated npm package. Use `npm run dev` or the explicit `node .../dist/cli.js` path.

After changing CLI source, rebuild:

```bash
cd packages/storify-cli && npm run build
```

---

## First-time login

Run once (or when your token expires):

```bash
node ../../packages/storify-cli/dist/cli.js login
```

**Interactive steps:**

1. Enter your **email**
2. Enter your **password**
3. **Choose your store** from the list (stores appear by **name**)

Credentials are saved to `~/.storify/config.json`:

| Key | Purpose |
|-----|---------|
| `apiUrl` | Backend API base (e.g. `http://localhost:3001/api`) |
| `token` | JWT bearer token |
| `storeId` | Selected store id |
| `storefrontUrl` | Storefront origin for preview links |
| `adminUrl` | Admin panel origin |

---

## Start live preview

From your theme directory:

```bash
npm run dev
```

Or explicitly:

```bash
node ../../packages/storify-cli/dist/cli.js theme dev
```

### What happens

1. CLI checks login (prompts if needed).
2. Starts **Vite** on the first available port (default tries `3000`).
3. Waits until the dev server responds.
4. Calls the platform **`PATCH /api/theme/dev-link`** to point your store at the Vite URL.
5. Prints preview URLs.
6. On **Ctrl+C**, disables dev link automatically.

### Preview URLs

| Label | Description |
|-------|-------------|
| **Storefront** | Open this to see your theme on the real storefront with store data |
| **Theme (Vite)** | Direct URL to your theme dev server |
| **Theme direct** | `index.html?storeId=...` on Vite (standalone debugging) |
| **Admin editor** | Theme Studio at `/{storeId}/admin/theme/edit` |

**Local stack example:**

```
Storefront      http://localhost:3004/demo-dev-store/?devSession=...
Theme (Vite)    http://localhost:3006
Admin editor    http://localhost:3003/demo-dev-store/admin/theme/edit
```

---

## CLI flags

```bash
storify theme dev [options]
```

| Option | Description |
|--------|-------------|
| `--local` | Use localhost storefront + theme; no Cloudflare tunnel |
| `--remote` | Use production storefront URL + tunnel (when API is not local) |
| `--no-link-store` | Run Vite only; do not register dev link |
| `--no-tunnel` | In remote mode, skip cloudflared |
| `--public-url <url>` | Use a custom public theme URL instead of tunnel |
| `--port <n>` | Preferred Vite port (default `3000`) |
| `--open-storefront` | Open the storefront preview in your browser |
| `--open` | Open the Vite URL in your browser |
| `--store-id`, `--api`, `--token` | Override saved credentials |

**Local mode is automatic** when your saved API URL is `localhost` (typical monorepo setup).

---

## Full theme workflow

```bash
# 1. Login once
storify login

# 2. Live preview while coding
storify theme dev

# 3. Validate manifest + sections
storify theme validate

# 4. Production build
storify theme build

# 5. Create upload zip
storify theme pack

# 6. Upload to platform
storify theme upload
# or update existing:
storify theme upload --update-theme-id th_xxxxx
```

Interactive menu (no arguments):

```bash
storify
# → "Start live theme preview" runs dev with storefront open
```

---

## How it works (developer mental model)

1. Your store has a **ThemeConfig** row in the platform database.
2. Dev link sets `devThemeEnabled=true` and `devThemeBaseUrl` to your Vite URL.
3. When the storefront loads, the bootstrap API returns that URL as `theme.uploadedThemeBaseUrl`.
4. The storefront fetches your theme HTML through **`/api/theme-proxy`** (assets rewritten for CORS).
5. Your theme receives **`STORIFY_THEME_CONFIG`** via postMessage with layout, settings, and SDK URL — same as production.

When dev link is disabled, the storefront returns to the uploaded R2 theme (if any).

See [05-RUNTIME-CONFIG.md](05-RUNTIME-CONFIG.md) for the postMessage payload.

---

## Remote preview (API not on localhost)

When developing against a **hosted** Storify API:

```bash
storify theme dev --remote
```

The CLI:

1. Starts Vite locally.
2. Opens a **cloudflared** tunnel to expose Vite publicly.
3. Sends the tunnel URL to `PATCH /api/theme/dev-link`.
4. Prints the **live storefront URL** for your store (subdomain or custom domain).

Requires `cloudflared` in PATH. Override with `--public-url https://your-tunnel.example`.

---

## Environment overrides

Instead of `~/.storify/config.json`, you can set:

| Variable | Purpose |
|----------|---------|
| `STORIFY_API_URL` | API base URL |
| `STORIFY_AUTH_TOKEN` | Bearer token |
| `STORIFY_STORE_ID` | Store id |
| `STORIFY_STOREFRONT_URL` | Storefront origin |
| `STORIFY_ADMIN_URL` | Admin origin |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Login fails / no token | Ensure `LEGACY_TOKEN_RESPONSE=true` on backend. |
| `Theme URL host is not allowed` | Update backend; localhost and `*.trycloudflare.com` must be allowed. |
| Storefront shows default theme, not yours | Confirm storefront is running; open the **Storefront** URL from CLI output, not Vite alone. |
| Blank theme / proxy error | Ensure Vite is running on the port shown in CLI; restart `npm run dev`. |
| Wrong port in link | Stop old Vite instances; CLI uses `--strictPort` on the port it selects. |
| Admin editor 404 | Use `/admin/theme/edit`, not `/admin/theme-studio`. |
| `npx storify` shows wrong help | Use `npm run dev` or direct `node .../dist/cli.js`. |

More issues: [12-TROUBLESHOOTING.md](12-TROUBLESHOOTING.md).

**Check setup:**

```bash
storify status
```

---

## Security notes

- Dev link requires **authenticated** store access; only your user can set dev URLs for stores you own.
- Localhost theme URLs only work when the **backend can reach that URL** (same machine for local API).
- Remote tunnel URLs are temporary; dev link is cleared when you stop the CLI (unless you disabled `--unlink-on-exit`).

---

## Next steps

- [04-PACKAGE-AND-UPLOAD.md](04-PACKAGE-AND-UPLOAD.md) — ship your theme to production
- [11-CHECKLIST.md](11-CHECKLIST.md) — pre-submission checklist
- [06b-INTEGRATION-FLOW.md](06b-INTEGRATION-FLOW.md) — runtime integration details
