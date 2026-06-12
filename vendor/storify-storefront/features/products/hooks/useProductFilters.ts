// Product filtering hook - extracted from Products.tsx
import { useState, useMemo } from 'react';
import type { Product } from '../types';

export interface UseProductFiltersOptions {
  products: Product[];
  initialSearchQuery?: string;
  initialCategoryFilter?: string;
  initialStatusFilter?: string;
}

export function useProductFilters(options: UseProductFiltersOptions) {
  const { products } = options;
  const [searchQuery, setSearchQuery] = useState(options.initialSearchQuery || '');
  const [categoryFilter, setCategoryFilter] = useState(options.initialCategoryFilter || '');
  const [statusFilter, setStatusFilter] = useState(options.initialStatusFilter || '');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search filter
      const matchesSearch = 
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.categories && p.categories.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase())));

      // Category filter
      const matchesCategory = 
        !categoryFilter ||
        p.category === categoryFilter ||
        (p.categories && p.categories.includes(categoryFilter));

      // Status filter
      const matchesStatus = !statusFilter || p.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('');
  };

  return {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    filteredProducts,
    clearFilters,
  };
}
