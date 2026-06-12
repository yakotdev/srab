// Category-related types extracted from main types.ts
import type { Product } from '../../products/types';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
  products?: Product[];
}
