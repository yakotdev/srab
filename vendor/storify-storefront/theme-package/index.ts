/**
 * Single entry for uploaded themes: runtime bridge, template library, and SDK adapter (`StorifyThemeAdapter` namespace; avoids duplicate names with `storefront-api` hooks).
 */
export * from '../theme-runtime/theme-client';
export { buildThemeRuntimePayload, mergeLangSectionsIntoLayout } from '../theme-runtime/buildThemeRuntimePayload';
export type {
  StorifyThemeRuntimePayload,
  ThemeRuntimeLayoutRowPayload,
  ThemeRuntimeStorePayload,
} from '../theme-runtime/storifyThemeRuntimePayload';
export { THEME_RUNTIME_PAYLOAD_VERSION } from '../theme-runtime/storifyThemeRuntimePayload';
export * from '../theme-template-lib/index';
export * as StorifyThemeAdapter from '../theme-adapter/index';
