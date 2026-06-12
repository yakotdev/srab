# Storefront SDK — خطة كاملة وتوثيق للمبرمجين الخارجيين

هذا المستند يصف هيكل الـ Storefront SDK، تقسيم الملفات، العقد الموحد، وما يجب على الثيمات استخدامه دون استدعاءات API مخصصة.

---

## 1. الأهداف

- **مصدر واحد للبيانات والتنسيق:** الثيم يستخدم الـ SDK فقط (hooks + formatters) ولا يبني طبقة API خاصة.
- **صيانة وتطوير أسهل:** كل مجال (منتجات، تصنيفات، قوائم، سلة، تنسيق، إلخ) في ملف منفصل.
- **عقد ثابت:** أشكال البيانات (Product, Variant, Category, …) وتنسيق الأسعار (formatPrice) موحّد من المنصة.
- **توثيق كامل:** مرجع لكل دالة ومعاملات وقيم الإرجاع وأمثلة للمبرمجين الخارجيين.

---

## 2. هيكل الملفات (تقسيم الـ SDK)

```
shared/storefront/lib/
├── storefront-sdk.ts          # واجهة واحدة: يعيد تصدير كل شيء من sdk/
└── sdk/
    ├── index.ts               # تصدير موحد من كل الوحدات
    ├── config.ts              # قاعدة الـ API، getStoreId، setStoreConfig (للثيم في iframe)
    ├── fetch.ts               # sdkFetch مع X-Store-Id
    ├── types.ts               # أنواع مشتركة (ProductQuery, MenuItem, Policy, CartItem, SeoMeta، إلخ)
    ├── products.ts            # useProducts, useProduct, useProductByHandle, useBestSellingProducts, useNewestProducts, useProductsByCollection, useProductsBySource
    ├── categories.ts          # useCategories, useCollectionByHandle
    ├── menu.ts                # useMenu
    ├── store-config.ts        # useStoreConfig
    ├── policy.ts              # usePolicy
    ├── cart.ts                # useCart
    ├── seo.ts                 # useSeo
    ├── formatters.ts          # formatPrice, useFormatPrice (تنسيق السعر حسب عملة/لغة المتجر)
    └── initial-data.ts        # getInitialData, setInitialData (للـ SSR/hydration)
```

- **storefront-sdk.ts:** يبقى نقطة الدخول الحالية؛ يعيد تصدير كل شيء من `sdk/index.ts` لعدم كسر الاستيرادات الحالية.
- **كل وحدة:** مسؤولة عن مجال واحد؛ يسهل الصيانة وإضافة hooks جديدة لاحقاً.

---

## 3. العقد الموحد للثيمات

### 3.1 مصدر الإعداد (Theme iframe)

- الثيم يستقبل `STORIFY_THEME_CONFIG` ويستخرج `storeId`, `store` (اسم، شعار، عملة، لغة، إلخ).
- **إلزامي:** عند أول استلام للـ payload يستدعي الثيم `setStoreConfig({ id: payload.storeId, currency: payload.store?.currency, language: payload.store?.language })` (أو الـ API المعرّف في config) حتى الـ SDK يستخدمها في `formatPrice`.
- بعدها كل طلبات الـ SDK تستخدم نفس الـ storeId، و`formatPrice` ينسّق حسب عملة/لغة المتجر.

### 3.2 البيانات

- **المنتجات والتصنيفات والقوائم:** عبر hooks فقط (useProducts, useProduct, useCategories, useMenu, إلخ). لا استدعاء fetch مباشر من الثيم.
- **شكل المنتج:** موثّق في types (Product, ProductVariant). الثيم يعتمد على هذه الحقول فقط (مثلاً product.id, product.name, product.price, product.variants).

### 3.3 التنسيق

- **عرض الأسعار:** حصرياً عبر `formatPrice(price: number)` أو `useFormatPrice()(price)` من الـ SDK. لا استخدام لـ `toFixed(2)` أو رموز عملة مكتوبة يدوياً في الثيم.
- العملة واللغة تأتي من إعداد المتجر (إما من الـ host أو من setStoreConfig بعد قراءة الـ payload).

---

## 4. الوظائف الناقصة والمكتملة

| الوظيفة | الحالة | ملاحظات |
|---------|--------|---------|
| useProducts, useProduct, useProductByHandle | ✅ موجود | |
| useBestSellingProducts, useNewestProducts, useProductsByCollection | ✅ موجود | |
| useProductsBySource | ✅ موجود | |
| useCategories, useCollectionByHandle | ✅ موجود | |
| useMenu | ✅ موجود | |
| useStoreConfig | ✅ موجود | |
| usePolicy | ✅ موجود | |
| useCart | ✅ موجود | useCart.addItem(product, qty, variantId) |
| useSeo | ✅ موجود | |
| getInitialData | ✅ موجود | |
| formatPrice / useFormatPrice | ✅ مكتمل | في formatters.ts |
| setStoreConfig (للثيم) | ✅ مكتمل | في config.ts |
| useReviews / addReview | ✅ مكتمل | في reviews.ts |
| prepareProductDescription | ✅ مكتمل | في formatters.ts (وصف المنتج آمن من XSS) |
| useWishlist | ✅ مكتمل | في wishlist.ts (localStorage، أحدث أولاً) |
| دعم limit في useProducts | 🔶 اختياري | بعض الـ APIs تدعم limit؛ توثيق إن وُجد |
| useTranslations(t) من الـ SDK | 🔶 اختياري | إن رغبتم تعريض t للثيم عبر SDK بدل payload فقط |

---

## 5. توثيق المبرمجين الخارجيين

- **06-STOREFRONT-SDK.md:** نظرة عامة، قاعدة الـ API و storeId، وصف مختصر لكل مجموعة (Products, Categories, Menus, Store config, Policies, Cart, SEO)، **إضافة قسم formatPrice وربط الثيم (setStoreConfig)**، ووصف "لا تبني API خاصاً بالثيم".
- **06a-STOREFRONT-SDK-REFERENCE.md** (مرجع كامل): لكل دالة: التوقيع، المعاملات، نوع الإرجاع، مثال استدعاء، ملاحظات (مثل استخدام selectedVariant مع addItem). يشمل أيضاً أنواع البيانات الرئيسية (Product, ProductVariant, CartItem, إلخ).
- **09-EXAMPLES.md:** يبقى يحتوي مثال "Featured product مع variants + cart" مع استخدام formatPrice من الـ SDK وعدم كتابة toFixed أو عملة يدوية.

---

## 6. ملخص التنفيذ

1. إنشاء مجلد `lib/sdk/` وملفات الوحدات حسب القسم 2.
2. نقل المنطق الحالي من `storefront-sdk.ts` إلى الوحدات المناسبة مع الحفاظ على نفس التوقيعات والتصديرات.
3. إضافة `config.setStoreConfig` و `formatters.formatPrice` (وإن أردتم `useFormatPrice`) وربطها بـ config المتجر.
4. جعل `storefront-sdk.ts` يعيد تصدير كل شيء من `sdk/index.ts`.
5. تحديث 06-STOREFRONT-SDK.md وإضافة 06a-STOREFRONT-SDK-REFERENCE.md.
6. التأكد من أن أمثلة الثيم (مثل 09-EXAMPLES) تستخدم formatPrice وعدم تكرار التنسيق.

بعد هذا يكون الـ SDK موحّداً، مقسّماً لصيانة أسهل، ومُوثّقاً بالكامل للمبرمجين الخارجيين مع عقد ثابت (بما فيه تنسيق السعر) دون أن يكتب الثيم API أو تنسيقاً خاصاً به.
