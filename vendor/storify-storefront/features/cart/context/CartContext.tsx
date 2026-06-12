// Cart context - extracted from StoreContext
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Product } from '../../products/types';
import type { Discount } from '../../discounts/types';

interface CartContextType {
  cart: Product[];
  appliedCoupon: Discount | null;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string, availableDiscounts: Discount[]) => boolean;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ 
  children: React.ReactNode;
  availableDiscounts?: Discount[];
}> = ({ children, availableDiscounts = [] }) => {
  const [cart, setCart] = useState<Product[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Discount | null>(null);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => [...prev, product]);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const applyCoupon = useCallback((code: string, discounts: Discount[] = availableDiscounts): boolean => {
    const coupon = discounts.find(d => d.code === code.toUpperCase() && d.status === 'Active');
    if (coupon) {
      setAppliedCoupon(coupon);
      return true;
    }
    return false;
  }, [availableDiscounts]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  return (
    <CartContext.Provider value={{
      cart,
      appliedCoupon,
      addToCart,
      removeFromCart,
      clearCart,
      applyCoupon,
      removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};
