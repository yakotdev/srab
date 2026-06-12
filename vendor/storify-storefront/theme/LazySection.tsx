import React, { useState, useEffect, useRef } from 'react';
import { renderSection } from './sectionRegistry';
import type { LayoutSection } from '../types';

type RegistryMap = Record<string, React.FC<{ section: LayoutSection }>>;

const ROOT_MARGIN = '200px'; // حمّل القسم قبل ظهوره بـ 200px

interface LazySectionProps {
  section: LayoutSection;
  registry: RegistryMap;
}

/**
 * يرسم القسم فقط عند اقترابه من الـ viewport — يقلل العمل عند التحميل الأول (لا نحمّل كل الأقسام دفعة واحدة).
 */
export const LazySection: React.FC<LazySectionProps> = ({ section, registry }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible(true);
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (visible) return <>{renderSection(section, registry)}</>;

  return <div ref={ref} key={section.id} style={{ minHeight: 80 }} aria-hidden="true" />;
};
