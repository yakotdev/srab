export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  /** API returns `title` (e.g. "أحمر / كبير"); theme mock data uses `name`. */
  title?: string;
  name?: string;
  price?: number;
  compareAtPrice?: number;
  image?: string;
  sku?: string;
  options?: Record<string, string>;
  stock?: number;
  inventory_quantity?: number;
  inventoryQuantity?: number;
  quantity?: number;
  available?: boolean;
  is_available?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  image: string;
  images?: string[];
  price: number;
  compareAtPrice?: number;
  category: string;
  categoryId?: string;
  /** All linked category ids from API (ProductCategory) */
  categoryIds?: string[];
  categories?: Array<{ id: string; name?: string; slug?: string }>;
  status?: string;
  stock?: number;
  /** When false, quantity is not enforced in SDK (unlimited). */
  trackQuantity?: boolean;
  /** When true, allow purchase even when stock is 0. */
  sellWhenOutOfStock?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  hasVariants?: boolean;
  options?: ProductOption[];
  variants?: ProductVariant[];
  /** Selection at add-to-cart (API may use `title` alongside `name`). */
  selectedVariant?: Partial<ProductVariant> & { id?: string; title?: string };
  selectedOptions?: Record<string, string>;
  quantity?: number;
  /** Host `Storify.cart` line id (`productId:variantId`) when cart comes from bridge snapshot */
  lineId?: string;
  /** Set when cart snapshot comes from host (server cart) — keep in sync with storefront Product */
  serverCartLineId?: string;
  cartLineVariantId?: string;
  cartLineVariantTitle?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image: string;
  count?: number;
  productCount?: number;
}

/** بيانات تجريبية للمعاينة المحلية فقط — بدون صور افتراضية */
export const PRODUCTS: Product[] = [
  { id: '1', name: 'منتج تجريبي ١', price: 99, category: 'قسم ١', image: '', isNew: true },
  { id: '2', name: 'منتج تجريبي ٢', price: 149, category: 'قسم ١', image: '' },
  { id: '3', name: 'منتج تجريبي ٣', price: 199, category: 'قسم ٢', image: '' },
  { id: '4', name: 'منتج تجريبي ٤', price: 79, category: 'قسم ٢', image: '', isSale: true },
  { id: '5', name: 'منتج تجريبي ٥', price: 249, category: 'قسم ٣', image: '' },
  { id: '6', name: 'منتج تجريبي ٦', price: 129, category: 'قسم ٣', image: '' },
  { id: '7', name: 'منتج تجريبي ٧', price: 89, category: 'قسم ٤', image: '' },
  { id: '8', name: 'منتج تجريبي ٨', price: 179, category: 'قسم ٤', image: '' },
];

export const CATEGORIES: Category[] = [
  { id: '1', name: 'قسم ١', slug: 'section-1', image: '', count: 0 },
  { id: '2', name: 'قسم ٢', slug: 'section-2', image: '', count: 0 },
  { id: '3', name: 'قسم ٣', slug: 'section-3', image: '', count: 0 },
  { id: '4', name: 'قسم ٤', slug: 'section-4', image: '', count: 0 },
];

export interface SlideData {
  id: number;
  url: string;
  title: string;
  description: string;
}

export const SLIDES: SlideData[] = [
  { id: 1, url: '', title: 'شريحة ١', description: 'أضف صورة ونص الشريحة من المحرر.' },
  { id: 2, url: '', title: 'شريحة ٢', description: 'أضف صورة ونص الشريحة من المحرر.' },
  { id: 3, url: '', title: 'شريحة ٣', description: 'أضف صورة ونص الشريحة من المحرر.' },
];
