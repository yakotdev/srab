# Examples

This file provides practical end-to-end snippets you can copy into a starter theme and adapt.

**Recommended:** Load the SDK from the platform (do not bundle it). When you receive `STORIFY_THEME_CONFIG`, load the script from **payload.sdkScriptUrl**, call **StorifySDK.setStoreConfig** with `id`, `currency`, `language`, and **apiBaseUrl**, then use **window.StorifySDK** for all data and formatting (see [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md)).

**واجهة موحّدة (Theme SDK Adapter):** لتفادي تكرار `window.StorifySDK` و `useState`/`useEffect` في كل سكشن، انسخ مجلد **theme-adapter** من المشروع (`shared/storefront/theme-adapter/`) إلى ثيمك واستورد منه: **getSDK**, **useProducts**, **useProduct**, **useMenu**, **useCategories**, **useReviews**, **useCart**, **useWishlist**, **formatPrice**, **prepareProductDescription**, **submitReview**، والأنواع. كل الطلبات تبقى عبر المنصة فقط — لا fetch ولا apiBaseUrl في الثيم.

---

## Example A: Minimal theme (single section)

### `theme-manifest.json`

```json
{
  "name": "Starter Minimal",
  "version": "1.0.0",
  "manifestVersion": 1,
  "entry": "assets/main.js",
  "sections": [
    {
      "id": "hero",
      "name": "Hero",
      "component": "HERO",
      "order": 0,
      "contentSchema": {
        "title": { "type": "text", "label": "Title", "default": "Welcome" },
        "subtitle": { "type": "textarea", "label": "Subtitle" },
        "cta_link": { "type": "link", "label": "CTA link", "default": "/shop" }
      },
      "defaultContent": {
        "title": "Welcome",
        "subtitle": "Start shopping now",
        "cta_link": "/shop"
      }
    }
  ]
}
```

### Runtime listener (load SDK from platform, then set config)

When you receive the message, load the SDK script from **payload.sdkScriptUrl** (if present), then call **StorifySDK.setStoreConfig** so the SDK can talk to the storefront API. Store the payload for layout/settings.

```tsx
import { useEffect, useState } from 'react';

type ThemeConfig = {
  layout: Array<{ id: string; content?: Record<string, unknown>; order: number; enabled: boolean }>;
  settings: Record<string, unknown>;
  storeId?: string;
  store?: { name?: string; logo?: string; currency?: string; language?: string };
  sdkScriptUrl?: string;
  apiBaseUrl?: string;
};

export function useStorifyThemeConfig() {
  const [config, setConfig] = useState<ThemeConfig | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'STORIFY_THEME_CONFIG' || !event.data.payload) return;
      const p = event.data.payload as ThemeConfig;

      function applyConfig() {
        if (typeof window.StorifySDK !== 'undefined') {
          window.StorifySDK.setStoreConfig({
            id: p.storeId,
            currency: p.store?.currency,
            language: p.store?.language,
            apiBaseUrl: p.apiBaseUrl,
          });
        }
        setConfig(p);
      }

      if (p.sdkScriptUrl && typeof window.StorifySDK === 'undefined') {
        const script = document.createElement('script');
        script.src = p.sdkScriptUrl;
        script.onload = applyConfig;
        script.onerror = () => setConfig(p);
        document.head.appendChild(script);
      } else {
        applyConfig();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return config;
}
```

### Render flow

```tsx
function App() {
  const config = useStorifyThemeConfig();
  if (!config) return <div>Loading theme...</div>;

  const sections = (config.layout || [])
    .filter((s) => s.enabled !== false)
    .sort((a, b) => a.order - b.order);

  return (
    <main>
      {sections.map((section) => (
        <HeroSection key={section.id} content={section.content || {}} />
      ))}
    </main>
  );
}
```

---

## Example B: Multi-section theme with menu settings

### Manifest excerpt (`themeSettingsSchema` + sections)

```json
{
  "themeSettingsSchema": {
    "accent_color": { "type": "color", "label": "Accent color", "default": "#4f46e5" },
    "nav_primary": { "type": "menu", "label": "Primary navigation" },
    "footer_menu": { "type": "menu", "label": "Footer navigation" }
  },
  "sections": [
    { "id": "header", "name": "Header", "component": "HEADER", "order": 0 },
    { "id": "hero", "name": "Hero", "component": "HERO", "order": 1 },
    { "id": "footer", "name": "Footer", "component": "FOOTER", "order": 99 }
  ]
}
```

### Get menu by handle (use platform SDK)

Use **window.StorifySDK.getMenu(handle)** after the SDK is loaded and setStoreConfig was called. No custom fetch or X-Store-Id; the SDK handles it.

```tsx
// Inside header/footer component: load menu items with React state
const [menuItems, setMenuItems] = useState<Array<{ id: string; label: string; url: string }>>([]);
const menuHandle = String(config.settings?.nav_primary || '');

useEffect(() => {
  if (!menuHandle || typeof window.StorifySDK === 'undefined') {
    setMenuItems([]);
    return;
  }
  window.StorifySDK.getMenu(menuHandle).then((items) => {
    setMenuItems(Array.isArray(items) ? items : []);
  }).catch(() => setMenuItems([]));
}, [menuHandle]);

// render: menuItems.map((item) => <a key={item.id} href={item.url}>{item.label}</a>)
```

---

## Example C: Repeater section (slideshow)

### Manifest repeater field

```json
{
  "id": "slideshow",
  "name": "Slideshow",
  "component": "SLIDESHOW",
  "contentSchema": {
    "slides": {
      "type": "repeater",
      "label": "Slides",
      "itemLabel": "Slide",
      "minItems": 0,
      "maxItems": 10,
      "fields": {
        "image": { "type": "image", "label": "Image", "aspectRatio": "landscape" },
        "heading": { "type": "text", "label": "Heading" },
        "subheading": { "type": "text", "label": "Subheading" },
        "buttonText": { "type": "text", "label": "Button text" },
        "cta_link": { "type": "link", "label": "Button link", "default": "/shop" }
      }
    }
  },
  "defaultContent": { "slides": [] }
}
```

### Render repeater safely

```tsx
type Slide = {
  image?: string;
  heading?: string;
  subheading?: string;
  buttonText?: string;
  cta_link?: string;
};

function SlideshowSection({ content }: { content: Record<string, unknown> }) {
  const slides = Array.isArray(content.slides) ? (content.slides as Slide[]) : [];
  if (slides.length === 0) return null;

  return (
    <section>
      {slides.map((slide, idx) => (
        <article key={idx}>
          {slide.image ? <img src={slide.image} alt={slide.heading || 'Slide'} /> : null}
          {slide.heading ? <h2>{slide.heading}</h2> : null}
          {slide.subheading ? <p>{slide.subheading}</p> : null}
          {slide.buttonText ? <a href={slide.cta_link || '/shop'}>{slide.buttonText}</a> : null}
        </article>
      ))}
    </section>
  );
}
```

---

## Example D: Suggested section registry pattern

```ts
const SECTION_MAP: Record<string, React.ComponentType<{ content: Record<string, unknown> }>> = {
  HERO: HeroSection,
  HEADER: HeaderSection,
  SLIDESHOW: SlideshowSection,
  FOOTER: FooterSection,
};

function toSectionType(sectionId: string) {
  return sectionId.replace(/-/g, '_').toUpperCase();
}

function SectionRenderer({ id, content }: { id: string; content: Record<string, unknown> }) {
  const type = toSectionType(id);
  const Component = SECTION_MAP[type];
  if (!Component) return null;
  return <Component content={content} />;
}
```

---

## Example E: Featured product section (product + variants + cart)

Use a **product** field in section content to show a single product with variant selection and add-to-cart. The editor stores the product **id**; you fetch the product with the SDK and bind variants correctly.

### Manifest (`contentSchema`)

```json
{
  "id": "featured_product",
  "name": "Featured product",
  "component": "FEATURED_PRODUCT",
  "contentSchema": {
    "featured_product": {
      "type": "product",
      "label": "Product",
      "required": true
    },
    "title": { "type": "text", "label": "Title", "default": "Featured product" }
  },
  "defaultContent": {
    "title": "Featured product"
  }
}
```

The saved value for `featured_product` is the product **id** (string).

### Component (React + platform SDK — window.StorifySDK)

Load the SDK from the platform (Example A); then use **StorifySDK.getProduct**, **StorifySDK.addToCart**, and **StorifySDK.formatPrice**. No SDK import or bundle in the theme.

```tsx
import React, { useState, useEffect } from 'react';

interface ProductVariant {
  id: string;
  title: string;
  price: number;
  stock: number;
  sku: string;
  image?: string;
}

interface Props {
  content: Record<string, unknown>;
}

export function FeaturedProductSection({ content }: Props) {
  const productId = content.featured_product != null ? String(content.featured_product) : null;
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!!productId);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!productId || typeof window.StorifySDK === 'undefined') {
      setProduct(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    window.StorifySDK.getProduct(productId)
      .then((p) => {
        setProduct(p);
        if (p?.variants?.length) setSelectedVariant((p.variants as ProductVariant[])[0]);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!product?.variants?.length) setSelectedVariant(null);
    else if (!selectedVariant) setSelectedVariant((product.variants as ProductVariant[])[0]);
  }, [product?.id, product?.variants]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!product) return null;

  const hasVariants = product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0;
  const currentPrice = selectedVariant ? selectedVariant.price : (product.price as number);
  const currentStock = selectedVariant ? selectedVariant.stock : (product.stock as number);
  const canBuy = (currentStock ?? 0) > 0 || !!product.sellWhenOutOfStock;
  const formatPrice = (n: number) => (typeof window.StorifySDK !== 'undefined' ? window.StorifySDK.formatPrice(n) : String(n));

  const handleAddToCart = () => {
    if (!canBuy || typeof window.StorifySDK === 'undefined') return;
    const productToAdd = { ...product, price: currentPrice } as Record<string, unknown>;
    window.StorifySDK.addToCart(productToAdd, quantity, selectedVariant?.id);
  };

  return (
    <section className="max-w-md mx-auto p-6 border rounded-xl bg-slate-50">
      <h2 className="text-xl font-bold mb-4">{String(content.title || 'Featured product')}</h2>

      {product.image && (
        <img src={String(product.image)} alt={String(product.name)} className="w-full aspect-square object-cover rounded-lg mb-4" />
      )}
      <h3 className="font-bold text-lg">{String(product.name)}</h3>
      <p className="text-slate-600 mt-1">{String(product.description || '').slice(0, 120)}...</p>
      {/* Safe HTML: <div dangerouslySetInnerHTML={{ __html: window.StorifySDK.prepareProductDescription(String(product.description ?? '')) }} /> */}

      <div className="mt-4 text-lg font-bold">{formatPrice(currentPrice)}</div>

      {hasVariants && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Variant</label>
          <select
            value={selectedVariant?.id ?? ''}
            onChange={(e) => {
              const v = (product.variants as ProductVariant[]).find((x) => x.id === e.target.value);
              if (v) setSelectedVariant(v);
            }}
            className="w-full p-2 border rounded-lg bg-white"
          >
            {(product.variants as ProductVariant[]).map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} — {formatPrice(v.price)} {(v.stock ?? 0) <= 0 ? '(out of stock)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          type="number"
          min={1}
          max={Math.max(1, currentStock ?? 1)}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 p-2 border rounded-lg text-center"
        />
        <button
          onClick={handleAddToCart}
          disabled={!canBuy}
          className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          Add to cart
        </button>
      </div>
    </section>
  );
}
```

### Binding summary for external developers

| What | How |
|------|-----|
| **Product id** | From section content: `content.featured_product` (from a `product`-type field in contentSchema). |
| **Fetch product** | **StorifySDK.getProduct(productId)** (after SDK loaded and setStoreConfig called). |
| **Variants** | `product.variants` — each has `id`, `title`, `price`, `stock`, `sku`, optional `image`. |
| **Selected variant** | Local state; bind to `<select value={selectedVariant?.id} onChange={...}>`. |
| **Price display** | **StorifySDK.formatPrice(price)**. |
| **Add to cart** | **StorifySDK.addToCart(product, quantity, selectedVariant?.id)**. |

---

## Example E2: Featured product with theme adapter (استيراد واحد)

إذا استخدمت **Theme SDK Adapter** (انظر [06-STOREFRONT-SDK.md](06-STOREFRONT-SDK.md) — Theme SDK Adapter)، يمكن استيراد **useProduct**, **useCart**, **formatPrice** من مكان واحد بدون تكرار `window.StorifySDK` أو منطق التحميل:

```tsx
import React, { useState, useEffect } from 'react';
import { useProduct, useCart, formatPrice } from './theme-adapter';
import type { ProductMinimal } from './theme-adapter';

type Variant = NonNullable<ProductMinimal['variants']>[number];

export function FeaturedProductSection({ content }: { content: Record<string, unknown> }) {
  const productId = content.featured_product != null ? String(content.featured_product) : null;
  const { product, loading, error } = useProduct(productId);
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product?.variants?.length) setSelectedVariant(null);
    else setSelectedVariant(product.variants![0]);
  }, [product?.id, product?.variants]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error || !product) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  const canBuy = (currentStock ?? 0) > 0 || !!product.sellWhenOutOfStock;

  const handleAddToCart = () => {
    if (!canBuy) return;
    addItem(product, quantity, selectedVariant?.id);
  };

  return (
    <section className="max-w-md mx-auto p-6 border rounded-xl bg-slate-50">
      <h2 className="text-xl font-bold mb-4">{String(content.title || 'Featured product')}</h2>
      {product.image && <img src={product.image} alt={product.name} className="w-full aspect-square object-cover rounded-lg mb-4" />}
      <h3 className="font-bold text-lg">{product.name}</h3>
      <p className="text-slate-600 mt-1">{String(product.description || '').slice(0, 120)}...</p>
      <div className="mt-4 text-lg font-bold">{formatPrice(currentPrice)}</div>
      {/* Variant select + quantity input + Add to cart button — same as Example E */}
    </section>
  );
}
```

---

## Example F: Local preview without parent postMessage (optional)

In local development outside storefront, no parent may post `STORIFY_THEME_CONFIG`. You can add a temporary fallback. Include **sdkScriptUrl** and **apiBaseUrl** if your theme loads the SDK from the platform (e.g. point to your local storefront origin):

```ts
const fallback = {
  layout: [{ id: 'hero', order: 0, enabled: true, content: { title: 'Preview' } }],
  settings: {},
  storeId: 'dev-store',
  store: { name: 'Preview Store', currency: 'USD', language: 'en' },
  // If you run storefront locally (e.g. port 3000), the theme can load the SDK from there:
  sdkScriptUrl: 'http://localhost:3000/sdk/storefront-sdk.js',
  apiBaseUrl: 'http://localhost:3000/api',
};
```

Use this only for local preview. In production storefront, rely on real postMessage payload.

---

## Example G: Product grid (StorifySDK.getProducts)

Section that lists products using the platform SDK. Ensure the SDK is loaded and setStoreConfig was called (Example A).

```tsx
function ProductGridSection({ content }: { content: Record<string, unknown> }) {
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const limit = Number(content.count) || 8;

  useEffect(() => {
    if (typeof window.StorifySDK === 'undefined') {
      setLoading(false);
      return;
    }
    window.StorifySDK.getProducts({})
      .then((list) => setProducts(Array.isArray(list) ? list.slice(0, limit) : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <section className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">{String(content.title || 'Products')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <a key={String(p.id)} href={`/product/${p.id}`} className="block border rounded-lg overflow-hidden">
            {p.image && <img src={String(p.image)} alt={String(p.name)} className="w-full aspect-square object-cover" />}
            <div className="p-3">
              <h3 className="font-medium truncate">{String(p.name)}</h3>
              <p className="text-indigo-600 font-bold">
                {typeof window.StorifySDK !== 'undefined' ? window.StorifySDK.formatPrice(Number(p.price)) : p.price}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
```

---

## Example H: Reviews and wishlist (StorifySDK)

- **Reviews:** Use **StorifySDK.getReviews(productId)** to load, and **StorifySDK.addReview(productId, { customerName, rating, comment })** to submit.
- **Wishlist:** Use **StorifySDK.getWishlist()**, **StorifySDK.toggleWishlist(product)**, **StorifySDK.isInWishlist(productId)**. Persisted in localStorage per store.

Example: load reviews in a product section with `useEffect` and **StorifySDK.getReviews(productId)**; display the list and a form that calls **StorifySDK.addReview** on submit. For wishlist, call **StorifySDK.toggleWishlist(product)** on button click and use **StorifySDK.getWishlist()** or **isInWishlist(id)** to show state.

---

See [05-RUNTIME-CONFIG.md](05-RUNTIME-CONFIG.md) for exact payload shape and [10-API-REFERENCE.md](10-API-REFERENCE.md) for endpoint details.
