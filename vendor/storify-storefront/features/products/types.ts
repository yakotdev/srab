// Product-related types extracted from main types.ts

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  stock: number;
  sku: string;
  image?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  videos?: string[];
  category: string; // Keep for backward compatibility
  categories?: string[]; // New: multiple categories
  status: 'Active' | 'Draft' | 'Archived';
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  stock: number;
  sku?: string;
  barcode?: string;
  trackQuantity?: boolean;
  sellWhenOutOfStock?: boolean;
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  hasVariants?: boolean;
  options?: ProductOption[];
  variants?: ProductVariant[];
  selectedVariant?: ProductVariant;
  quantity?: number;
  reviews?: Review[];
  rating?: number;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}
