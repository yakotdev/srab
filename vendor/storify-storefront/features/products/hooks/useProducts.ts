// Product state management hook - extracted from StoreContext
import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { productsApi } from '../../../lib/api';
import { createProductService } from '../services/productService';

export interface UseProductsOptions {
  initialProducts?: Product[];
  onProductsChange?: (products: Product[]) => void;
  onCategoryCountsUpdate?: (products: Product[]) => void;
  onLogCreated?: (action: string, details: string) => Promise<void>;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>(options.initialProducts || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getAll();
        setProducts(data);
        if (options.onProductsChange) {
          options.onProductsChange(data);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setError(err instanceof Error ? err : new Error('Failed to load products'));
        // Fallback to initial products if provided
        if (options.initialProducts) {
          setProducts(options.initialProducts);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Create product service with callbacks
  const productService = createProductService({
    onProductAdded: (product) => {
      setProducts(prev => [...prev, product]);
      if (options.onProductsChange) {
        setProducts(prev => {
          const updated = [...prev, product];
          options.onProductsChange?.(updated);
          return updated;
        });
      }
    },
    onProductUpdated: (product) => {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
      if (options.onProductsChange) {
        setProducts(prev => {
          const updated = prev.map(p => p.id === product.id ? product : p);
          options.onProductsChange?.(updated);
          return updated;
        });
      }
    },
    onProductDeleted: (id) => {
      setProducts(prev => prev.filter(p => p.id !== id));
      if (options.onProductsChange) {
        setProducts(prev => {
          const updated = prev.filter(p => p.id !== id);
          options.onProductsChange?.(updated);
          return updated;
        });
      }
    },
    onCategoryCountsUpdate: () => {
      if (options.onCategoryCountsUpdate) {
        setProducts(prev => {
          options.onCategoryCountsUpdate?.(prev);
          return prev;
        });
      }
    },
    onLogCreated: options.onLogCreated,
  });

  const addProduct = useCallback(async (product: Product) => {
    try {
      return await productService.createProduct(product);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add product'));
      throw err;
    }
  }, [productService]);

  const updateProduct = useCallback(async (product: Product) => {
    try {
      return await productService.updateProduct(product);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update product'));
      throw err;
    }
  }, [productService]);

  const deleteProduct = useCallback(async (id: string) => {
    const product = products.find(p => p.id === id);
    try {
      await productService.deleteProduct(id, product?.name);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete product'));
      throw err;
    }
  }, [productService, products]);

  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll();
      setProducts(data);
      if (options.onProductsChange) {
        options.onProductsChange(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh products'));
    } finally {
      setLoading(false);
    }
  }, [options.onProductsChange]);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
  };
}
