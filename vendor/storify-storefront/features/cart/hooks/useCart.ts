// Cart hook - extracted from StoreContext
import { useState, useCallback, useEffect } from 'react';
import type { Product } from '../../products/types';
import type { Discount } from '../../discounts/types';

export interface CartItem extends Product {
  quantity?: number;
}

export interface UseCartOptions {
  initialCart?: CartItem[];
  availableDiscounts?: Discount[];
  onCartChange?: (cart: CartItem[]) => void;
}

export function useCart(options: UseCartOptions = {}) {
  const [cart, setCart] = useState<CartItem[]>(options.initialCart || []);
  const [appliedCoupon, setAppliedCoupon] = useState<Discount | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCart(parsed);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (options.onCartChange) {
      options.onCartChange(cart);
    }
  }, [cart, options.onCartChange]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => 
          p.id === product.id 
            ? { ...p, quantity: (p.quantity || 1) + 1 }
            : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(p => 
      p.id === productId ? { ...p, quantity } : p
    ));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const applyCoupon = useCallback((code: string): boolean => {
    const discounts = options.availableDiscounts || [];
    const coupon = discounts.find(d => d.code === code.toUpperCase() && d.status === 'Active');
    if (coupon) {
      setAppliedCoupon(coupon);
      return true;
    }
    return false;
  }, [options.availableDiscounts]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const cartSubtotal = cart.reduce((acc, item) => {
    const price = item.price || 0;
    const quantity = item.quantity || 1;
    return acc + (price * quantity);
  }, 0);

  const discountAmount = appliedCoupon 
    ? (cartSubtotal * appliedCoupon.percentage) / 100 
    : 0;

  const cartTotal = cartSubtotal - discountAmount;
  const itemCount = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  return {
    cart,
    appliedCoupon,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
    cartSubtotal,
    discountAmount,
    cartTotal,
    itemCount,
  };
}
