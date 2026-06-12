// Cart-related types
import type { Product } from '../../products/types';
import type { Discount } from '../../discounts/types';

export interface CartItem extends Product {
  quantity?: number;
}

export interface CartState {
  items: CartItem[];
  appliedCoupon: Discount | null;
}
