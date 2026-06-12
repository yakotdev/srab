/** قيمة حقل category_scope من المanifest (محرّر الثيم). */
export type CategoryScopeMode = 'all' | 'all_non_empty' | 'specific';

export interface CategoryScope {
  mode: CategoryScopeMode;
  /** عند mode === 'specific' */
  categoryIds?: string[];
}

function countProducts(cat: { count?: number; productCount?: number } | null | undefined): number {
  const n = Number(cat?.count ?? cat?.productCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function parseCategoryScope(raw: unknown): CategoryScope {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const m = o.mode;
    const mode: CategoryScopeMode =
      m === 'all' || m === 'all_non_empty' || m === 'specific' ? m : 'all';
    const rawIds = o.categoryIds;
    const categoryIds = Array.isArray(rawIds)
      ? rawIds.map((x) => String(x)).filter((s) => s.length > 0)
      : [];
    return { mode, categoryIds: mode === 'specific' ? categoryIds : [] };
  }
  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      return parseCategoryScope(JSON.parse(raw) as unknown);
    } catch {
      return { mode: 'all', categoryIds: [] };
    }
  }
  return { mode: 'all', categoryIds: [] };
}

/** تصفية قائمة الأقسام حسب الإعدادات. */
export function applyCategoryScope<
  T extends {
    id?: string;
    name?: string;
    image?: string;
    slug?: string;
    count?: number;
    productCount?: number;
  },
>(list: T[], scope: CategoryScope): T[] {
  if (!Array.isArray(list)) return [];
  if (scope.mode === 'all') return [...list];
  if (scope.mode === 'all_non_empty') {
    return list.filter((c) => countProducts(c as { count?: number; productCount?: number }) > 0);
  }
  const set = new Set((scope.categoryIds || []).map(String));
  return list.filter((c) => c.id != null && set.has(String(c.id)));
}

/** هل ينتمي المنتج إلى أحد الأقسام المحددة (معرّف أو اسم)؟ */
function productMatchesCategoryIds<P extends { category?: string; categoryId?: string; categories?: unknown }>(
  p: P,
  idSet: Set<string>,
  nameSet: Set<string>,
): boolean {
  if (p.categoryId && idSet.has(String(p.categoryId))) return true;
  const cats = p.categories;
  if (Array.isArray(cats)) {
    for (const x of cats) {
      if (typeof x === 'string') {
        if (idSet.has(x) || nameSet.has(x)) return true;
      } else if (x && typeof x === 'object' && 'id' in x && idSet.has(String((x as { id: string }).id))) {
        return true;
      }
    }
  }
  if (p.category && nameSet.has(String(p.category))) return true;
  return false;
}

/**
 * تصفية منتجات لقسم «مميز» حسب category_scope.
 * allCategories: قائمة أقسام المتجر (للمطابقة والعدّ عند all_non_empty).
 */
export function filterProductsByCategoryScope<
  P extends { category?: string; categoryId?: string; categories?: unknown },
>(
  products: P[],
  scope: CategoryScope,
  allCategories: Array<{ id?: string; name?: string; count?: number; productCount?: number }>,
): P[] {
  if (!Array.isArray(products)) return [];
  if (scope.mode === 'all') return [...products];

  const catList = Array.isArray(allCategories) ? allCategories : [];

  if (scope.mode === 'all_non_empty') {
    if (catList.length === 0) return [...products];
    const nonemptyIds = new Set(
      catList.filter((c) => countProducts(c) > 0).map((c) => String(c.id)),
    );
    const nonemptyNames = new Set(
      catList
        .filter((c) => countProducts(c) > 0)
        .map((c) => String(c.name || '').trim())
        .filter(Boolean),
    );
    return products.filter((p) => productMatchesCategoryIds(p, nonemptyIds, nonemptyNames));
  }

  const ids = scope.categoryIds || [];
  if (ids.length === 0) return [];

  const idSet = new Set(ids.map(String));
  const selectedCats = catList.filter((c) => c.id != null && idSet.has(String(c.id)));
  const nameSet = new Set(
    selectedCats.map((c) => String(c.name || '').trim()).filter(Boolean),
  );
  return products.filter((p) => productMatchesCategoryIds(p, idSet, nameSet));
}
