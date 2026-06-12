export function normalizeOptionValue(val: string): string {
  return String(val || '').trim().toLowerCase();
}

/**
 * Extract option value from variant.
 * Supports multiple variant shapes:
 *  1. variant.options (Record<string, string>) — Storify mock / theme-internal
 *  2. variant[option1/option2/...] — Shopify-style
 *  3. Parse from variant.title (e.g. "أحمر / XL") using product.options order
 */
export function getOptionValueFromVariant(product: any, variant: any, optionName: string): string | undefined {
  if (!variant) return undefined;

  // Shape 1: variant.options is an object map
  if (variant.options && typeof variant.options === 'object' && !Array.isArray(variant.options)) {
    const opts = variant.options as Record<string, string>;
    // Direct key lookup
    if (opts[optionName] !== undefined) return String(opts[optionName]);
    // Case-insensitive fallback
    for (const [k, v] of Object.entries(opts)) {
      if (normalizeOptionValue(k) === normalizeOptionValue(optionName)) return String(v);
    }
  }

  // Shape 2: Shopify-style option1/option2/...
  if (product?.options?.length) {
    const idx = product.options.findIndex((opt: any) => {
      const optionNameStr = typeof opt === 'string' ? opt : opt.name;
      return normalizeOptionValue(optionNameStr || '') === normalizeOptionValue(optionName);
    });
    if (idx >= 0) {
      const val = variant[`option${idx + 1}`];
      if (val != null) return String(val);
    }
  }

  // Shape 3: Parse variant.title (e.g. "أحمر / XL") — match by position in product.options
  const titleStr: string = variant.title || variant.name || '';
  if (titleStr && product?.options?.length) {
    const parts = titleStr.split('/').map((s: string) => s.trim());
    const optIdx = product.options.findIndex((opt: any) => {
      const optionNameStr = typeof opt === 'string' ? opt : opt.name;
      return normalizeOptionValue(optionNameStr || '') === normalizeOptionValue(optionName);
    });
    if (optIdx >= 0 && optIdx < parts.length) return parts[optIdx];
  }

  return undefined;
}

export function selectedOptionsFromVariant(product: any, variant: any): Record<string, string> | null {
  if (!product?.options?.length || !variant) return null;

  // Shape 1: variant.options is an object map
  if (variant.options && typeof variant.options === 'object' && !Array.isArray(variant.options)) {
    return { ...(variant.options as Record<string, string>) };
  }

  // Shape 3: Parse from title
  const titleStr: string = variant.title || variant.name || '';
  if (titleStr && product.options.length > 0) {
    const parts = titleStr.split('/').map((s: string) => s.trim());
    const result: Record<string, string> = {};
    product.options.forEach((opt: any, i: number) => {
      const optName = typeof opt === 'string' ? opt : opt.name;
      if (optName && parts[i]) result[optName] = parts[i];
    });
    if (Object.keys(result).length > 0) return result;
  }

  // Shape 2: Shopify-style option1/option2
  const result: Record<string, string> = {};
  product.options.forEach((opt: any, i: number) => {
    const optName = typeof opt === 'string' ? opt : opt.name;
    const val = variant[`option${i + 1}`];
    if (val != null && optName) result[optName] = String(val);
  });
  return Object.keys(result).length > 0 ? result : null;
}

export function findSelectedVariant(product: any, selectedOptions: Record<string, string>): any | null {
  if (!product?.variants?.length) return null;
  const keys = Object.keys(selectedOptions);
  if (keys.length === 0) return null;

  return product.variants.find((v: any) => {
    return keys.every((optName) => {
      const needed = selectedOptions[optName];
      if (needed == null) return true;
      const variantHas = getOptionValueFromVariant(product, v, optName);
      if (variantHas == null) return false;
      return normalizeOptionValue(needed) === normalizeOptionValue(variantHas);
    });
  }) || null;
}

export function isOptionValueAvailable(product: any, optionName: string, value: string): boolean {
  if (!product?.variants?.length) return false;
  return product.variants.some((v: any) => {
    const vValue = getOptionValueFromVariant(product, v, optionName);
    return vValue != null && normalizeOptionValue(vValue) === normalizeOptionValue(value);
  });
}
