/**
 * Full theme runtime (client + host helpers). Storefront host may import host symbols from
 * `./themeRuntimeHostHandler` directly to avoid pulling `lib/api` into theme bundles.
 */

export type {
  StorefrontTrackingEvent,
  StorefrontTrackingPayload,
  ThemeRuntimeMethod,
  ThemeRuntimeRequestEnvelope,
  ThemeRuntimeResponseEnvelope,
  ThemeRuntimeTrackParams,
  ThemeRuntimeGetProductsParams,
  ThemeRuntimeGetProductParams,
  ThemeRuntimeGetCategoriesParams,
  ThemeRuntimeGetMenuParams,
  ThemeRuntimeGetReviewsParams,
  ThemeRuntimeGetPolicyParams,
  ThemeRuntimeGetOrderParams,
  ThemeRuntimeSubmitContactParams,
  ThemeRuntimeSubmitReviewParams,
  ThemeRuntimeAddToCartParams,
  ThemeRuntimeRemoveFromCartParams,
  ThemeRuntimeNavigateParams,
  ThemeRuntimeSetLocalizationParams,
  ThemeRuntimeNewsletterParams,
  ThemeRuntimeToggleWishlistParams,
} from './types';

export {
  themeRuntimeCall,
  shouldUseThemeRuntimeBridge,
  isCrossOriginIframe,
  ThemeRuntimeError,
} from './client';

export {
  handleThemeRuntimeRequest,
  processIframeAddToCartMessage,
  productFromIframeCartMessage,
  type ThemeRuntimeHostHandlerContext,
} from './themeRuntimeHostHandler';
