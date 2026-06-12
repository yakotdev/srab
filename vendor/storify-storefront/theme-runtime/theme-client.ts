/**
 * Browser-only exports for uploaded themes — no host / fetchApi / import.meta chain.
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
