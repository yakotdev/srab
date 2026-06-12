// Category service - extracted from StoreContext
import type { Category } from '../types';
import { categoriesApi, activityLogsApi } from '../../../lib/api';

export interface CategoryServiceOptions {
  onCategoryAdded?: (category: Category) => void;
  onCategoryUpdated?: (category: Category) => void;
  onCategoryDeleted?: (id: string) => void;
  onError?: (error: Error, action: string) => void;
  onLogCreated?: (action: string, details: string) => Promise<void>;
  onCategoryCountsUpdate?: () => void;
}

class CategoryService {
  private options: CategoryServiceOptions;

  constructor(options: CategoryServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Create a new category
   */
  async createCategory(name: string, description?: string, image?: string): Promise<Category> {
    try {
      const newCategory = await categoriesApi.create({ name, description, image });

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'Add Category',
          details: `Added category: ${name}`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onCategoryAdded) {
        this.options.onCategoryAdded(newCategory);
      }
      if (this.options.onCategoryCountsUpdate) {
        this.options.onCategoryCountsUpdate();
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Add Category', `Added category: ${name}`);
      }

      return newCategory;
    } catch (error: any) {
      console.error('Error adding category:', error);

      if (this.options.onError) {
        this.options.onError(error, 'createCategory');
      }

      throw error;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, data: { name?: string; description?: string; image?: string }): Promise<Category> {
    try {
      const updatedCategory = await categoriesApi.update(id, data);

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'Update Category',
          details: `Updated category: ${data.name || id}`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onCategoryUpdated) {
        this.options.onCategoryUpdated(updatedCategory);
      }
      if (this.options.onCategoryCountsUpdate) {
        this.options.onCategoryCountsUpdate();
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Update Category', `Updated category: ${data.name || id}`);
      }

      return updatedCategory;
    } catch (error: any) {
      console.error('Error updating category:', error);

      if (this.options.onError) {
        this.options.onError(error, 'updateCategory');
      }

      throw error;
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      await categoriesApi.delete(id);

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'Delete Category',
          details: `Deleted category ID: ${id}`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onCategoryDeleted) {
        this.options.onCategoryDeleted(id);
      }
      if (this.options.onCategoryCountsUpdate) {
        this.options.onCategoryCountsUpdate();
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Delete Category', `Deleted category ID: ${id}`);
      }
    } catch (error: any) {
      console.error('Error deleting category:', error);

      if (this.options.onError) {
        this.options.onError(error, 'deleteCategory');
      }

      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    return categoriesApi.getAll();
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    return categoriesApi.getById(id);
  }
}

export const createCategoryService = (options?: CategoryServiceOptions) => new CategoryService(options);
