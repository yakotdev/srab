import { formatPrice } from './storefront-api';

export type ProductPriceSource = {
  price?: number;
  compareAtPrice?: number;
  hasVariants?: boolean;
  variants?: Array<{
    price?: number;
    compareAtPrice?: number;
  }>;
};

export interface ProductPriceDisplay {
  minPrice: number;
  maxPrice: number;
  isRange: boolean;
  price: number;
  compareAtPrice?: number;
  compareAtIsRange: boolean;
  minCompareAtPrice?: number;
  maxCompareAtPrice?: number;
  hasDiscount: boolean;
}

function collectVariantPrices(variants: NonNullable<ProductPriceSource['variants']>): number[] {
  return variants
    .map((v) => Number(v.price))
    .filter((p) => Number.isFinite(p) && p >= 0);
}

export function getProductPriceDisplay(product: ProductPriceSource): ProductPriceDisplay {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const hasVariants = Boolean(product.hasVariants) || variants.length > 0;

  if (hasVariants && variants.length > 0) {
    const prices = collectVariantPrices(variants);
    const minPrice = prices.length > 0 ? Math.min(...prices) : Number(product.price) || 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : minPrice;
    const isRange = minPrice !== maxPrice;

    const compareEntries = variants
      .map((v) => ({
        price: Number(v.price) || 0,
        compareAt: v.compareAtPrice != null ? Number(v.compareAtPrice) : undefined,
      }))
      .filter((e) => e.compareAt != null && Number.isFinite(e.compareAt) && e.compareAt! > e.price);

    const hasDiscount = compareEntries.length > 0;
    let minCompareAtPrice: number | undefined;
    let maxCompareAtPrice: number | undefined;
    if (hasDiscount) {
      const compares = compareEntries.map((e) => e.compareAt!);
      minCompareAtPrice = Math.min(...compares);
      maxCompareAtPrice = Math.max(...compares);
    }
    const compareAtIsRange =
      minCompareAtPrice != null &&
      maxCompareAtPrice != null &&
      minCompareAtPrice !== maxCompareAtPrice;

    return {
      minPrice,
      maxPrice,
      isRange,
      price: minPrice,
      compareAtPrice: !compareAtIsRange ? minCompareAtPrice : undefined,
      compareAtIsRange,
      minCompareAtPrice,
      maxCompareAtPrice,
      hasDiscount,
    };
  }

  const price = Number(product.price) || 0;
  const compareAtPrice =
    product.compareAtPrice != null ? Number(product.compareAtPrice) : undefined;
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;

  return {
    minPrice: price,
    maxPrice: price,
    isRange: false,
    price,
    compareAtPrice: hasDiscount ? compareAtPrice : undefined,
    compareAtIsRange: false,
    minCompareAtPrice: hasDiscount ? compareAtPrice : undefined,
    maxCompareAtPrice: hasDiscount ? compareAtPrice : undefined,
    hasDiscount,
  };
}

export function formatProductPriceLabel(
  product: ProductPriceSource,
  currency?: string,
  options?: {
    formatRange?: (formattedMin: string, formattedMax: string) => string;
  },
): string {
  const display = getProductPriceDisplay(product);
  if (display.isRange) {
    const min = formatPrice(display.minPrice, currency);
    const max = formatPrice(display.maxPrice, currency);
    if (options?.formatRange) {
      return options.formatRange(min, max);
    }
    return `${min} - ${max}`;
  }
  return formatPrice(display.price, currency);
}

export function formatProductCompareAtPriceLabel(
  product: ProductPriceSource,
  currency?: string,
  options?: {
    formatRange?: (formattedMin: string, formattedMax: string) => string;
  },
): string | null {
  const display = getProductPriceDisplay(product);
  if (!display.hasDiscount) return null;

  if (
    display.compareAtIsRange &&
    display.minCompareAtPrice != null &&
    display.maxCompareAtPrice != null
  ) {
    const min = formatPrice(display.minCompareAtPrice, currency);
    const max = formatPrice(display.maxCompareAtPrice, currency);
    if (options?.formatRange) {
      return options.formatRange(min, max);
    }
    return `${min} - ${max}`;
  }

  if (display.compareAtPrice != null) {
    return formatPrice(display.compareAtPrice, currency);
  }

  return null;
}

export function getProductDiscountPercentage(product: ProductPriceSource): number {
  const display = getProductPriceDisplay(product);
  if (!display.hasDiscount || display.isRange || display.compareAtIsRange) return 0;
  if (display.compareAtPrice == null || display.compareAtPrice <= display.price) return 0;
  return Math.round(((display.compareAtPrice - display.price) / display.compareAtPrice) * 100);
}
