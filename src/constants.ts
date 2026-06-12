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

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'كرسي أوربيتال',
    price: 450,
    compareAtPrice: 600,
    category: 'أثاث',
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=1000',
    images: [
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1000'
    ],
    isNew: true,
    isSale: true,
    options: [
      { name: 'اللون', values: ['أسود', 'رمادي', 'بيج'] },
      { name: 'المقاس', values: ['صغير', 'وسط', 'كبير'] }
    ],
    variants: [
      { id: '1-1', name: 'كرسي أوربيتال - أسود - صغير', price: 450, stock: 10, options: { 'اللون': 'أسود', 'المقاس': 'صغير' } },
      { id: '1-2', name: 'كرسي أوربيتال - رمادي - وسط', price: 480, stock: 0, options: { 'اللون': 'رمادي', 'المقاس': 'وسط' } },
      { id: '1-3', name: 'كرسي أوربيتال - بيج - كبير', price: 520, stock: 5, options: { 'اللون': 'بيج', 'المقاس': 'كبير' } }
    ]
  },
  {
    id: '2',
    name: 'مصباح السقف المعماري',
    price: 280,
    category: 'إضاءة',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=1000',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&q=80&w=1000'
    ],
    isNew: true,
    options: [
      { name: 'اللون', values: ['ذهبي', 'فضي'] }
    ],
    variants: [
      { id: '2-1', name: 'مصباح السقف - ذهبي', price: 280, stock: 0, options: { 'اللون': 'ذهبي' } },
      { id: '2-2', name: 'مصباح السقف - فضي', price: 260, stock: 15, options: { 'اللون': 'فضي' } }
    ]
  },
  {
    id: '3',
    name: 'طاولة جانبية بسيطة',
    price: 320,
    category: 'أثاث',
    image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: '4',
    name: 'مزهرية سيراميك خام',
    price: 120,
    category: 'ديكور',
    image: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: '5',
    name: 'أريكة مودولار',
    price: 1800,
    category: 'أثاث',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: '6',
    name: 'مصباح أرضي منحوت',
    price: 550,
    category: 'إضاءة',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: '7',
    name: 'لوحة فنية تجريدية',
    price: 950,
    category: 'فن',
    image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: '8',
    name: 'سجادة صوف يدوية',
    price: 1200,
    category: 'ديكور',
    image: 'https://images.unsplash.com/photo-1531835551805-16d864c8d311?auto=format&fit=crop&q=80&w=1000'
  }
];

export const CATEGORIES: Category[] = [
  { id: '1', name: 'أثاث', slug: 'furniture', image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=1000', count: 24 },
  { id: '2', name: 'إضاءة', slug: 'lighting', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=1000', count: 18 },
  { id: '3', name: 'ديكور', slug: 'decor', image: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=1000', count: 42 },
  { id: '4', name: 'فن', slug: 'art', image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=1000', count: 12 }
];

export interface SlideData {
  id: number;
  url: string;
  title: string;
  description: string;
}

export const SLIDES: SlideData[] = [
  {
    id: 1,
    url: "https://picsum.photos/seed/slide1/1200/800",
    title: "جمال الطبيعة",
    description: "استكشف المناظر الطبيعية الخلابة من جميع أنحاء العالم."
  },
  {
    id: 2,
    url: "https://picsum.photos/seed/slide2/1200/800",
    title: "العمارة الحديثة",
    description: "تصاميم هندسية مبتكرة تعكس روح العصر."
  },
  {
    id: 3,
    url: "https://picsum.photos/seed/slide3/1200/800",
    title: "أضواء المدينة",
    description: "سحر المدن في الليل تحت الأضواء المتلألئة."
  },
  {
    id: 4,
    url: "https://picsum.photos/seed/slide4/1200/800",
    title: "هدوء البحر",
    description: "استرخِ مع أمواج البحر الهادئة والرمال الذهبية."
  },
  {
    id: 5,
    url: "https://picsum.photos/seed/slide5/1200/800",
    title: "عالم المغامرة",
    description: "انطلق في رحلة لا تُنسى في أعماق الغابات."
  }
];
