// Discount service - extracted from StoreContext
import type { Discount } from '../types';
import { discountsApi } from '../../../lib/api';

export interface DiscountServiceOptions {
  onDiscountAdded?: (discount: Discount) => void;
  onDiscountUpdated?: (discount: Discount) => void;
  onDiscountDeleted?: (id: string) => void;
  onError?: (error: Error, action: string) => void;
}

class DiscountService {
  private options: DiscountServiceOptions;

  constructor(options: DiscountServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Create a new discount
   */
  async createDiscount(discount: Omit<Discount, 'id' | 'usageCount'>): Promise<Discount> {
    try {
      const newDiscount = await discountsApi.create(discount);

      // Notify callbacks
      if (this.options.onDiscountAdded) {
        this.options.onDiscountAdded(newDiscount);
      }

      return newDiscount;
    } catch (error: any) {
      console.error('Error adding discount:', error);

      if (this.options.onError) {
        this.options.onError(error, 'createDiscount');
      }

      throw error;
    }
  }

  /**
   * Update a discount
   */
  async updateDiscount(id: string, discount: Partial<Discount>): Promise<Discount> {
    try {
      const updatedDiscount = await discountsApi.update(id, discount);

      // Notify callbacks
      if (this.options.onDiscountUpdated) {
        this.options.onDiscountUpdated(updatedDiscount);
      }

      return updatedDiscount;
    } catch (error: any) {
      console.error('Error updating discount:', error);

      if (this.options.onError) {
        this.options.onError(error, 'updateDiscount');
      }

      throw error;
    }
  }

  /**
   * Delete a discount
   */
  async deleteDiscount(id: string): Promise<void> {
    try {
      await discountsApi.delete(id);

      // Notify callbacks
      if (this.options.onDiscountDeleted) {
        this.options.onDiscountDeleted(id);
      }
    } catch (error: any) {
      console.error('Error deleting discount:', error);

      if (this.options.onError) {
        this.options.onError(error, 'deleteDiscount');
      }

      throw error;
    }
  }

  /**
   * Get all discounts
   */
  async getAllDiscounts(params?: { status?: string; code?: string }): Promise<Discount[]> {
    return discountsApi.getAll(params);
  }

  /**
   * Get discount by code
   */
  async getDiscountByCode(code: string): Promise<Discount> {
    return discountsApi.getByCode(code);
  }
}

export const createDiscountService = (options?: DiscountServiceOptions) => new DiscountService(options);
