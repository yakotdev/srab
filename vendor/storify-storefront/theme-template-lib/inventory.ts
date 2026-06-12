import type { Product, ProductVariant } from '@srab/constants';

export function requiresVariantSelection(product: Product): boolean {
  return !!(product?.hasVariants && product?.variants?.length);
}

export function isPurchasable(product: Product, variantId?: string): boolean {
  if (!product) return false;
  if (product.status && product.status !== 'Active') return false;

  const hasVariants = product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0;
  if (hasVariants) {
    if (!variantId) return false;
    const variant = product.variants!.find(v => String(v.id) === String(variantId));
    if (!variant) return false;
    if (product.trackQuantity === false || product.sellWhenOutOfStock) return true;
    return Number(variant.stock) > 0;
  }

  if (product.trackQuantity === false || product.sellWhenOutOfStock) return true;
  return Number(product.stock) > 0;
}

export function getMaxOrderableQuantity(product: Product, variantId?: string): number {
  if (!product) return 0;
  if (product.status && product.status !== 'Active') return 0;

  const hasVariants = product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0;
  if (hasVariants) {
    if (!variantId) return 0;
    const variant = product.variants!.find(v => String(v.id) === String(variantId));
    if (!variant) return 0;
    if (product.trackQuantity === false || product.sellWhenOutOfStock) return 9999;
    return Number(variant.stock) || 0;
  }

  if (product.trackQuantity === false || product.sellWhenOutOfStock) return 9999;
  return Number(product.stock) || 0;
}
