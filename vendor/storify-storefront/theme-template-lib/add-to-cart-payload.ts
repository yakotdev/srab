/**
 * Normalizes product + variant before local cart + STORIFY_ADD_TO_CART postMessage.
 * API rows use `title`; theme types use `name` — parent host keys lines by variant `id`.
 * Host may persist a server cart: keep `selectedVariant.id` + `title`/`name` so checkout line items match DB.
 */

import type { Product } from '@srab/constants';

function normTitle(s: unknown): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

type Variantish = Record<string, unknown>;

function selectedOptionsTitle(
  product: Product & { selectedOptions?: Record<string, string> },
): string {
  const selected = product.selectedOptions;
  if (!selected || typeof selected !== 'object') return '';
  const entries = Object.entries(selected).filter(([, v]) => String(v ?? '').trim() !== '');
  if (entries.length === 0) return '';
  const orderedNames = Array.isArray(product.options) ? product.options.map((o) => o?.name).filter(Boolean) : [];
  const orderedValues = orderedNames
    .map((name) => (name ? selected[name] : undefined))
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  if (orderedValues.length > 0) return orderedValues.join(' / ');
  return entries.map(([, v]) => String(v).trim()).join(' / ');
}

/** Merge iframe variant row with catalog row so `id` + `title` are always present for the host. */
export function normalizeProductForHostCart<T extends Product & { quantity?: number }>(product: T): T {
  const variants = Array.isArray(product.variants) ? ([...product.variants] as unknown[]) : [];
  let sv = product.selectedVariant as Variantish | undefined | null;
  const fallbackTitle = selectedOptionsTitle(product);

  if (sv && typeof sv === 'object') {
    let id = sv.id != null && String(sv.id).trim() !== '' ? String(sv.id).trim() : '';
    if (!id && variants.length > 0) {
      const want = normTitle(sv.title ?? sv.name);
      if (want) {
        const row = variants.find((v) => {
          if (!v || typeof v !== 'object') return false;
          const o = v as Variantish;
          return normTitle(o.title ?? o.name) === want;
        }) as Variantish | undefined;
        if (row?.id != null) {
          sv = { ...sv, ...row, id: String(row.id) };
        }
      }
    } else if (id) {
      sv = { ...sv, id };
    }
    if (fallbackTitle && !String(sv.title ?? sv.name ?? '').trim()) {
      sv = { ...sv, title: fallbackTitle, name: fallbackTitle };
    }
  } else if (fallbackTitle) {
    /**
     * API/list payload can expose options without variant rows; keep a synthetic selected variant
     * so cart/checkout can show what user selected instead of base line.
     */
    sv = { title: fallbackTitle, name: fallbackTitle };
  }

  const out = {
    ...product,
    variants: variants.length ? variants : product.variants,
    selectedVariant: sv ?? undefined,
  } as T;

  return out;
}
