import type { Product, ProductVariant } from '../types';

/**
 * Effective stock: for simple product = product.stock; for variant = selected variant stock.
 */
export function getEffectiveStock(product: Product, selectedVariant?: ProductVariant | null): number {
  if (product.hasVariants && selectedVariant != null) {
    return Number(selectedVariant.stock) ?? 0;
  }
  return Number(product.stock) ?? 0;
}

/**
 * Can the product be added to cart?
 * - If product has variants and no variant selected → false (must choose variant).
 * - If tracking quantity: purchasable when stock > 0 OR sellWhenOutOfStock.
 * - If not tracking quantity: purchasable (stock not enforced).
 */
export function isProductPurchasable(
  product: Product,
  selectedVariant?: ProductVariant | null
): boolean {
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    if (selectedVariant == null) return false;
    const trackQty = product.trackQuantity !== false;
    const stock = Number(selectedVariant.stock) ?? 0;
    return !trackQty || stock > 0 || !!product.sellWhenOutOfStock;
  }
  const trackQty = product.trackQuantity !== false;
  const stock = Number(product.stock) ?? 0;
  return !trackQty || stock > 0 || !!product.sellWhenOutOfStock;
}
