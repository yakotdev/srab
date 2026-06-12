# Theme SDK Adapter

طبقة رفيعة فوق `window.StorifySDK` حتى يستورد الثيم من مكان واحد ويتعامل مع المنصة بشكل موحّد.

**You do not need a file named `storefront-sdk.ts` (or any SDK file) in your theme.** The platform serves the SDK; your theme loads it via `payload.sdkScriptUrl` and calls `StorifySDK.setStoreConfig`. This adapter is optional: copy this folder into your theme if you want one import for hooks and helpers.

- **لا fetch ولا apiBaseUrl** — كل الطلبات عبر `window.StorifySDK` فقط (السكربت يُحمّل من المنصة عبر `payload.sdkScriptUrl`).
- **استيراد واحد:** `getSDK()`, hooks, دوال مساعدة، وأنواع.

## الاستخدام

1. حمّل سكربت الـ SDK من المنصة عند استقبال `STORIFY_THEME_CONFIG` (استخدم `payload.sdkScriptUrl`) واستدعِ `StorifySDK.setStoreConfig({ id, currency, language, apiBaseUrl })`.
2. استورد من هذا المجلد (أو انسخ الملفات إلى ثيمك):

```ts
import {
  getSDK,
  useProducts,
  useProduct,
  useCategories,
  useMenu,
  useReviews,
  useCart,
  useWishlist,
  formatPrice,
  prepareProductDescription,
  submitReview,
} from './theme-adapter'; // أو المسار الذي نسخت إليه

import type { MenuItem, SubmitReviewPayload, ProductMinimal } from './theme-adapter';
```

## التصديرات

| التصدير | الوصف |
|--------|--------|
| `getSDK()` | يعيد `window.StorifySDK` أو `null`. |
| `useProducts(query?)` | قائمة منتجات. |
| `useProduct(id)` | منتج واحد. |
| `useCategories()` | تصنيفات. |
| `useMenu(handle)` | عناصر قائمة. |
| `useReviews(productId)` | تعليقات منتج. |
| `useCart()` | سلة (items, addItem, removeItem, updateQuantity, clear, subtotal, totalItems). |
| `useWishlist()` | مفضلة (wishlist, toggleWishlist, isInWishlist). |
| `formatPrice(price)` | تنسيق السعر. |
| `prepareProductDescription(html)` | وصف منتج آمن (XSS). |
| `submitReview(productId, payload)` | إرسال تعليق. |
| أنواع | `MenuItem`, `SubmitReviewPayload`, `ApiError`, `ProductMinimal`, `CategoryMinimal`, `ReviewMinimal`, `CartItemMinimal`. |
