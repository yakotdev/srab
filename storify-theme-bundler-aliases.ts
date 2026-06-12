import path from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedStorefront = path.join(_dirname, 'vendor/storify-storefront');

/** `@storify/theme` + template-local `@srab/*` aliases for standalone repo builds. */
export function getStorifyThemePackageAliases(themeProjectRoot: string): Record<string, string> {
  const root = path.resolve(themeProjectRoot);
  return {
    '@storify/theme': path.join(sharedStorefront, 'theme-package/index.ts'),
    '@srab/constants': path.join(root, 'src/constants.ts'),
    '@srab/ThemeContext': path.join(root, 'src/ThemeContext.tsx'),
  };
}
