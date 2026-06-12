import path from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = path.dirname(fileURLToPath(import.meta.url));

/** `shared/storefront` — all Storify theme package roots resolve from here. */
const sharedStorefront = _dirname;

/**
 * `@storify/theme` — unified entry (`theme-package/index.ts`). Optional `@srab/*` for template-local `src/`.
 * Pass the theme project root (folder that contains `vite.config` and `src/`).
 */
export function getStorifyThemePackageAliases(themeProjectRoot: string): Record<string, string> {
  const root = path.resolve(themeProjectRoot);
  return {
    '@storify/theme': path.join(sharedStorefront, 'theme-package/index.ts'),
    '@srab/constants': path.join(root, 'src/constants.ts'),
    '@srab/ThemeContext': path.join(root, 'src/ThemeContext.tsx'),
  };
}
