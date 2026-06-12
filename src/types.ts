export interface StorefrontLanguageRow {
  code: string;
  name?: string;
  nativeName?: string | null;
  isActive?: boolean;
}

export interface StoreInfo {
  name: string;
  logo: string;
  favicon: string;
  email: string;
  phone: string;
  address: string;
  metaDescription?: string;
  currency?: string;
  language?: string;
  enabledLanguages?: StorefrontLanguageRow[];
  shipping?: {
    localizationLanguages?: Array<string | StorefrontLanguageRow>;
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  price: number;
  compareAtPrice?: number;
  category?: string;
  categoryId?: string;
  categories?: Array<{ id: string; name?: string; slug?: string }>;
  status?: string;
  stock?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
}

export interface LayoutSection {
  id: string;
  type: string;
  enabled: boolean;
  content?: Record<string, any>;
  order?: number;
  group?: string;
}

export interface ThemeConfigPayload {
  layout: LayoutSection[];
  settings: Record<string, any>;
  storeId?: string;
  store?: StoreInfo;
  products?: Product[];
  categories?: Category[];
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  t: (key: string) => string;
  onAddToCart: (productId: string, quantity: number) => void;
}
