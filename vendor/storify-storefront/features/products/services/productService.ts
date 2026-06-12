// Product business logic service - extracted from StoreContext
import type { Product } from '../types';
import { productsApi, activityLogsApi } from '../../../lib/api';

export interface ProductServiceOptions {
  onProductAdded?: (product: Product) => void;
  onProductUpdated?: (product: Product) => void;
  onProductDeleted?: (id: string) => void;
  onError?: (error: Error, action: string) => void;
  onLogCreated?: (action: string, details: string) => Promise<void>;
  onCategoryCountsUpdate?: () => void;
}

class ProductService {
  private options: ProductServiceOptions;

  constructor(options: ProductServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Clean product data before sending to API
   */
  private cleanProductData(product: Product): any {
    const {
      id,
      reviews,
      rating,
      selectedVariant,
      quantity,
      ...productData
    } = product;

    const cleanProduct: any = {
      name: productData.name,
      description: productData.description || '',
      image: productData.image || '',
      images: productData.images || [],
      category: productData.category || 'Uncategorized',
      status: productData.status || 'Active',
      price: Number(productData.price),
      stock: Number(productData.stock) || 0,
      hasVariants: productData.hasVariants || false,
      options: productData.options || [],
      variants: productData.variants || [],
    };

    // Add optional fields only if they have values
    if (productData.compareAtPrice) cleanProduct.compareAtPrice = Number(productData.compareAtPrice);
    if (productData.costPerItem) cleanProduct.costPerItem = Number(productData.costPerItem);
    if (productData.sku) cleanProduct.sku = productData.sku;
    if (productData.barcode) cleanProduct.barcode = productData.barcode;
    if (productData.weight) cleanProduct.weight = Number(productData.weight);
    if (productData.weightUnit) cleanProduct.weightUnit = productData.weightUnit;
    if (productData.seoTitle) cleanProduct.seoTitle = productData.seoTitle;
    if (productData.seoDescription) cleanProduct.seoDescription = productData.seoDescription;
    if (Array.isArray(productData.tags) && productData.tags.length > 0) {
      cleanProduct.tags = productData.tags;
    }
    if (productData.trackQuantity !== undefined) cleanProduct.trackQuantity = productData.trackQuantity;

    return cleanProduct;
  }

  /**
   * Create a new product
   */
  async createProduct(product: Product): Promise<Product> {
    try {
      const cleanProduct = this.cleanProductData(product);
      
      console.log('Creating product:', cleanProduct);
      const newProduct = await productsApi.create(cleanProduct);
      console.log('Product created successfully:', newProduct);

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'Add Product',
          details: `Added product: ${product.name}`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onProductAdded) {
        this.options.onProductAdded(newProduct);
      }
      if (this.options.onCategoryCountsUpdate) {
        this.options.onCategoryCountsUpdate();
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Add Product', `Added product: ${product.name}`);
      }

      return newProduct;
    } catch (error: any) {
      console.error('Error adding product:', error);
      console.error('Error details:', error.message, error.status);

      if (this.options.onError) {
        this.options.onError(error, 'createProduct');
      }

      // Fallback: return the product as-is (for local state management)
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Add Product', `Added product: ${product.name}`);
      }

      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(product: Product): Promise<Product> {
    try {
      const updatedProduct = await productsApi.update(product.id, product);

      // Create activity log
      try {
        await activityLogsApi.create({
          action: 'Update Product',
          details: `Updated product: ${product.name}`,
          user: 'Admin'
        });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }

      // Notify callbacks
      if (this.options.onProductUpdated) {
        this.options.onProductUpdated(updatedProduct);
      }
      if (this.options.onCategoryCountsUpdate) {
        this.options.onCategoryCountsUpdate();
      }
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Update Product', `Updated product: ${product.name}`);
      }

      return updatedProduct;
    } catch (error: any) {
      console.error('Error updating product:', error);

      if (this.options.onError) {
        this.options.onError(error, 'updateProduct');
      }

      // Fallback: return the product as-is
      if (this.options.onLogCreated) {
        await this.options.onLogCreated('Update Product', `Updated product: ${product.name}`);
      }

      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string, productName?: string): Promise<void> {
    try {
      await productsApi.delete(id);

      // Create activity log
      if (productName) {
        try {
          await activityLogsApi.create({
            action: 'Delete Product',
            details: `Deleted product: ${productName}`,
            user: 'Admin'
          });
        } catch (logError) {
          console.warn('Failed to create activity log:', logError);
        }
      }

      // Notify callbacks
      if (this.options.onProductDeleted) {
        this.options.onProductDeleted(id);
      }
      if (this.options.onCategoryCountsUpdate) {
        this.options.onCategoryCountsUpdate();
      }
      if (this.options.onLogCreated && productName) {
        await this.options.onLogCreated('Delete Product', `Deleted product: ${productName}`);
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);

      if (this.options.onError) {
        this.options.onError(error, 'deleteProduct');
      }

      if (this.options.onLogCreated && productName) {
        await this.options.onLogCreated('Delete Product', `Deleted product: ${productName}`);
      }

      throw error;
    }
  }

  /**
   * Get all products
   */
  async getAllProducts(params?: { category?: string; status?: string; search?: string }): Promise<Product[]> {
    return productsApi.getAll(params);
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product> {
    return productsApi.getById(id);
  }
}

export const createProductService = (options?: ProductServiceOptions) => new ProductService(options);
