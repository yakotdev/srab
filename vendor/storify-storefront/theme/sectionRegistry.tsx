import React from 'react';
import type { LayoutSection, SectionType } from './types';
import type { ThemeSlug } from './sectionResolve';
import { getBuiltinDefaultRegistry } from './builtinDefaultSections';

export type { ThemeSlug } from './sectionResolve';
export { resolveThemeSlug, themeSlugFromName, VALID_SLUGS } from './sectionResolve';

export type SectionComponent = React.FC<{ section: LayoutSection }>;

type RegistryMap = Record<string, SectionComponent>;

const registryCache: Partial<Record<ThemeSlug, RegistryMap>> = {};

/**
 * Built-in section registry (themes/default-storefront source is not vendored in this repo).
 * Uploaded themes use ThemeDirectLoader; legacy slugs fall back here.
 */
function resolveDefaultStorefrontRegistry(): RegistryMap {
  return getBuiltinDefaultRegistry() as RegistryMap;
}

/** تحميل registry الثيم — كل الـ slugs القديمة تستخدم الأقسام المدمجة في الستورفرونت. */
export function loadThemeRegistry(themeSlug: ThemeSlug): Promise<RegistryMap> {
  const cached = registryCache[themeSlug];
  if (cached) return Promise.resolve(cached);

  const registry = resolveDefaultStorefrontRegistry();
  registryCache[themeSlug] = registry;
  return Promise.resolve(registry);
}

/** للعرض الأول قبل تحميل الثيم — نستخدم الافتراضي. */
export function getDefaultRegistry(): RegistryMap {
  return resolveDefaultStorefrontRegistry();
}

export function getSectionComponent(type: SectionType, registry: RegistryMap): SectionComponent | undefined {
  return registry[type];
}

/** يرسم سكشن واحد باستخدام الـ registry المحمّل (من loadThemeRegistry). */
export function renderSection(section: LayoutSection, registry: RegistryMap): React.ReactNode {
  if (!section.enabled) return null;
  const Component = getSectionComponent(section.type as SectionType, registry);
  if (!Component) return null;
  return <Component key={section.id} section={section} />;
}
