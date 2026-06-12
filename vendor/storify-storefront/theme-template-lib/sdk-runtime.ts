/**
 * Single access point to `window.StorifySDK` (no React).
 * Types: `storify-sdk-loader.ts` augments `Window`.
 */

export function getStorifySDK() {
  return typeof window !== 'undefined' ? window.StorifySDK : undefined;
}
