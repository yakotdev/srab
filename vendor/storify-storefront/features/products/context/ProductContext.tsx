// Product context - extracted from StoreContext
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product, Review } from '../types';
import { productsApi, reviewsApi } from '../../../lib/api';
import { createProductService } from '../services/productService';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addReview: (productId: string, review: Omit<Review, 'id' | 'date' | 'status'>) => Promise<void>;
  updateReviewStatus: (productId: string, reviewId: string, status: Review['status']) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ 
  children: React.ReactNode;
  initialProducts?: Product[];
  onCategoryCountsUpdate?: (products: Product[]) => void;
  onLogCreated?: (action: string, details: string) => Promise<void>;
}> = ({ children, initialProducts, onCategoryCountsUpdate, onLogCreated }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [loading, setLoading] = useState(true);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getAll();
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
        if (initialProducts) {
          setProducts(initialProducts);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Create product service
  const productService = createProductService({
    onProductAdded: (product) => {
      setProducts(prev => [...prev, product]);
      if (onCategoryCountsUpdate) {
        setProducts(prev => {
          onCategoryCountsUpdate([...prev, product]);
          return [...prev, product];
        });
      }
    },
    onProductUpdated: (product) => {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
      if (onCategoryCountsUpdate) {
        setProducts(prev => {
          const updated = prev.map(p => p.id === product.id ? product : p);
          onCategoryCountsUpdate(updated);
          return updated;
        });
      }
    },
    onProductDeleted: (id) => {
      setProducts(prev => prev.filter(p => p.id !== id));
      if (onCategoryCountsUpdate) {
        setProducts(prev => {
          const updated = prev.filter(p => p.id !== id);
          onCategoryCountsUpdate(updated);
          return updated;
        });
      }
    },
    onCategoryCountsUpdate: () => {
      if (onCategoryCountsUpdate) {
        setProducts(prev => {
          onCategoryCountsUpdate(prev);
          return prev;
        });
      }
    },
    onLogCreated,
  });

  const addProduct = useCallback(async (product: Product) => {
    await productService.createProduct(product);
  }, [productService]);

  const updateProduct = useCallback(async (product: Product) => {
    await productService.updateProduct(product);
  }, [productService]);

  const deleteProduct = useCallback(async (id: string) => {
    const product = products.find(p => p.id === id);
    await productService.deleteProduct(id, product?.name);
  }, [productService, products]);

  const addReview = useCallback(async (productId: string, review: Omit<Review, 'id' | 'date' | 'status'>) => {
    try {
      const newReview = await reviewsApi.create({ ...review, productId });
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return { ...p, reviews: [...(p.reviews || []), newReview] };
        }
        return p;
      }));
    } catch (error) {
      console.error('Error adding review:', error);
      const newReview: Review = {
        ...review,
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      };
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return { ...p, reviews: [...(p.reviews || []), newReview] };
        }
        return p;
      }));
    }
  }, []);

  const updateReviewStatus = useCallback(async (productId: string, reviewId: string, status: Review['status']) => {
    try {
      await reviewsApi.updateStatus(reviewId, status);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const updatedReviews = (p.reviews || []).map(r => r.id === reviewId ? { ...r, status } : r);
          const approvedReviews = updatedReviews.filter(r => r.status === 'Approved');
          const avgRating = approvedReviews.length > 0 
            ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length 
            : p.rating;
          return { ...p, reviews: updatedReviews, rating: avgRating };
        }
        return p;
      }));
    } catch (error) {
      console.error('Error updating review status:', error);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const updatedReviews = (p.reviews || []).map(r => r.id === reviewId ? { ...r, status } : r);
          const approvedReviews = updatedReviews.filter(r => r.status === 'Approved');
          const avgRating = approvedReviews.length > 0 
            ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length 
            : p.rating;
          return { ...p, reviews: updatedReviews, rating: avgRating };
        }
        return p;
      }));
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error refreshing products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ProductContext.Provider value={{
      products,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      addReview,
      updateReviewStatus,
      refreshProducts,
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
};
