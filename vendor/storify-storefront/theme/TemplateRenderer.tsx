import React from 'react';
import { TemplateProvider } from './TemplateContext';
import { renderSection, getDefaultRegistry } from './sectionRegistry';
import { LazySection } from './LazySection';
import type { TemplateContextValue } from './types';
import type { LayoutSection } from '../types';

export type RegistryMap = Record<string, React.FC<{ section: LayoutSection }>>;

/** عدد الأقسام التي تُرسم فوراً (above-the-fold) — الباقي يُحمّل عند الاقتراب من viewport */
const IMMEDIATE_SECTIONS_COUNT = 4;

interface TemplateRendererProps {
  layout: LayoutSection[];
  context: TemplateContextValue;
  /** Registry محمّل للثيم الحالي (من loadThemeRegistry). إن لم يُمرَّر يُستخدم الافتراضي. */
  registry?: RegistryMap | null;
}

/**
 * Renders a theme template. First N sections render immediately; the rest load when near viewport (كاشنج + تحميل تدريجي).
 */
const TemplateRenderer: React.FC<TemplateRendererProps> = ({ layout, context, registry }) => {
  const enabled = Array.isArray(layout) ? layout.filter((s: LayoutSection) => s.enabled) : [];
  const effectiveRegistry = registry ?? getDefaultRegistry();
  return (
    <TemplateProvider value={context}>
      {enabled.map((section, index) =>
        index < IMMEDIATE_SECTIONS_COUNT ? (
          <React.Fragment key={section.id}>{renderSection(section, effectiveRegistry)}</React.Fragment>
        ) : (
          <LazySection key={section.id} section={section} registry={effectiveRegistry} />
        )
      )}
    </TemplateProvider>
  );
};

export default TemplateRenderer;
