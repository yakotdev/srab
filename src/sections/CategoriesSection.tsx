import React from 'react';
import { motion } from 'motion/react';
import { CATEGORIES } from '../constants';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';
import SectionImagePlaceholder from '../components/SectionImagePlaceholder';
import { hasSectionImage } from '../utils/sectionImage';
import { useCategories, useResolvedStoreId, useSectionProducts } from '@storify/theme';
import { applyCategoryScope, parseCategoryScope } from '@storify/theme';

const CategoriesSection: React.FC<{ section: any }> = ({ section }) => {
  const { settings, categories: configCategories, isRtl, t } = useThemeConfig();
  const resolvedStoreId = useResolvedStoreId();
  const content = section?.content || {};
  const rawRadius = settings?.borderRadius;
  const borderRadius = typeof rawRadius === 'string' ? rawRadius : `${Number(rawRadius) || 24}px`;
  const grayscale = settings?.grayscale || false;
  const displayStyle = content.layout_style || content.style || 'grid';
  const enableHorizontalScroll = content.enable_horizontal_scroll === 'true' || content.enable_horizontal_scroll === true;
  const paddingTop = content.padding_top || '80px';
  const paddingBottom = content.padding_bottom || '80px';
  const apiCategories = useCategories(undefined, 100);
  const products = useSectionProducts({ limit: 200, preferHostPayload: true });
  const scope = parseCategoryScope(content.category_scope);
  
  const baseCategories =
    Array.isArray(configCategories) && configCategories.length > 0
      ? configCategories
      : resolvedStoreId
        ? apiCategories
        : apiCategories.length > 0
          ? apiCategories
          : CATEGORIES;
  
  const categories = applyCategoryScope(baseCategories, scope);

  const pickLastProductImage = (product: any) => {
    const imgs = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    if (imgs.length > 0) return imgs[imgs.length - 1];
    return product?.image || '';
  };

  const resolveCategoryImage = (cat: any) => {
    if (cat?.image) return cat.image;
    const catId = String(cat?.id ?? '').trim();
    const catName = String(cat?.name ?? '').trim().toLowerCase();
    
    const categoryProducts = products.filter((p: any) => {
      const pCategoryId = String(p?.categoryId ?? '').trim();
      const pCategory = String(p?.category ?? '').trim().toLowerCase();
      if (catId && pCategoryId && pCategoryId === catId) return true;
      if (catName && pCategory && pCategory === catName) return true;
      return false;
    }).sort((a: any, b: any) => {
      const at = new Date(a?.createdAt || 0).getTime();
      const bt = new Date(b?.createdAt || 0).getTime();
      return bt - at;
    });

    if (categoryProducts.length > 0) {
      return pickLastProductImage(categoryProducts[0]);
    }

    return '';
  };

  const renderCategoryImage = (cat: any, className: string, grayscale = false) => {
    const src = resolveCategoryImage(cat);
    if (hasSectionImage(src)) {
      return (
        <img
          src={src}
          alt={cat.name}
          className={`${className} ${grayscale ? 'grayscale' : ''}`}
          referrerPolicy="no-referrer"
        />
      );
    }
    return <SectionImagePlaceholder className={className} label={cat.name} />;
  };

  const containerRef = React.useRef<HTMLDivElement>(null);
  // Clone items to create infinite effect
  const items = categories.length > 0 ? [...categories, ...categories, ...categories] : [];

  const [isDragging, setIsDragging] = React.useState(false);
  const [lastX, setLastX] = React.useState(0);
  const [dragMoved, setDragMoved] = React.useState(false);

  const handleScroll = () => {
    if (!containerRef.current || categories.length === 0) return;
    const { scrollLeft, scrollWidth } = containerRef.current;
    const singleSetWidth = scrollWidth / 3;
    
    // In RTL, scrollLeft is 0 at far right and negative as we move left.
    if (isRtl) {
      const absLeft = Math.abs(scrollLeft);
      if (absLeft < 10) {
        containerRef.current.scrollLeft = -singleSetWidth;
      } else if (absLeft > (singleSetWidth * 2) - 10) {
        containerRef.current.scrollLeft = -singleSetWidth;
      }
    } else {
      if (scrollLeft < 10) {
        containerRef.current.scrollLeft = singleSetWidth;
      } else if (scrollLeft > (singleSetWidth * 2) - 10) {
        containerRef.current.scrollLeft = singleSetWidth;
      }
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!enableHorizontalScroll || !containerRef.current) return;
    setIsDragging(true);
    setDragMoved(false);
    setLastX(e.pageX);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - lastX) * 2;
    if (Math.abs(walk) > 0) setDragMoved(true);
    containerRef.current.scrollLeft -= walk;
    setLastX(x);
  };

  React.useEffect(() => {
    if (enableHorizontalScroll && containerRef.current && categories.length > 0) {
      const scrollWidth = containerRef.current.scrollWidth;
      const singleSetWidth = scrollWidth / 3;
      // Initialize to middle set
      containerRef.current.scrollLeft = isRtl ? -singleSetWidth : singleSetWidth;
    }
  }, [enableHorizontalScroll, categories.length]);

  const categoryPath = (cat: any) => `/shop?category=${encodeURIComponent(cat.id || cat.name || '')}`;

  const handleItemClick = (e: React.MouseEvent, cat: any) => {
    // If user dragged, don't trigger click
    if (dragMoved) {
      e.preventDefault();
      return;
    }
    navigateStorefront(categoryPath(cat));
  };

  const scroll = (direction: 'next' | 'prev') => {
    if (!containerRef.current) return;
    const { clientWidth } = containerRef.current;
    const amount = clientWidth * 0.8;
    
    // Logic: 
    // In LTR: Next = positive scrollLeft, Prev = negative scrollLeft
    // In RTL: Next = negative scrollLeft, Prev = positive scrollLeft
    const multiplier = isRtl ? -1 : 1;
    const move = direction === 'next' ? amount * multiplier : -amount * multiplier;
    
    containerRef.current.scrollBy({ left: move, behavior: 'smooth' });
  };

  const renderContent = () => {
    switch (displayStyle) {
      case 'bento':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-3 md:gap-6 h-[500px] md:h-[800px]">
            {categories.slice(0, 4).map((cat, i) => (
              <button
                type="button"
                onClick={(e) => handleItemClick(e, cat)}
                key={cat.id || cat.name || i}
                className={`group relative overflow-hidden cursor-pointer block ${
                  i === 0 ? 'col-span-2 row-span-2 md:col-span-2 md:row-span-2' : 
                  i === 1 ? 'col-span-2 row-span-1 md:col-span-2 md:row-span-1' : 
                  'col-span-1 row-span-1 md:col-span-1 md:row-span-1'
                }`}
                style={{ borderRadius }}
              >
                {renderCategoryImage(
                  cat,
                  `w-full h-full object-cover transition-transform duration-700 group-hover:scale-110`,
                  grayscale,
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 md:p-8 text-start md:text-end">
                  <h3 className="text-lg md:text-2xl font-extrabold text-white tracking-tighter uppercase">{cat.name}</h3>
                  <p className="text-white/70 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">
                    {cat.count != null ? `${cat.count} ${t('categories_units')}` : ''}
                  </p>
                  <div className="h-1 w-0 group-hover:w-12 transition-all duration-500 mt-2 md:mt-4 bg-[var(--storify-primary)]" />
                </div>
              </button>
            ))}
          </div>
        );
      case 'circles':
        return (
          <div className="relative group/slider overflow-hidden">
            <div
              ref={containerRef}
              onScroll={handleScroll}
              onMouseDown={onMouseDown}
              onMouseLeave={onMouseLeave}
              onMouseUp={onMouseUp}
              onMouseMove={onMouseMove}
              className={enableHorizontalScroll 
                ? `flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto pb-6 no-scrollbar cursor-grab active:cursor-grabbing ${isDragging ? '' : 'snap-x snap-mandatory'}`
                : "flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-12"
              }
            >
              {(enableHorizontalScroll ? items : categories).map((cat, i) => (
                <button
                  type="button"
                  onClick={(e) => handleItemClick(e, cat)}
                  key={`${cat.id || cat.name}-${i}`}
                  className={`group flex flex-col items-center gap-3 md:gap-6 transition-transform duration-300 hover:-translate-y-2 ${enableHorizontalScroll ? 'snap-center shrink-0' : ''}`}
                  style={{ width: enableHorizontalScroll ? 'auto' : undefined }}
                >
                  <div 
                    className="relative w-28 h-28 sm:w-40 sm:h-40 md:w-56 md:h-56 rounded-full p-1 md:p-2 transition-all duration-500 shadow-sm group-hover:shadow-xl flex items-center justify-center" 
                    style={{ background: 'var(--storify-bg)', border: '1px solid var(--storify-border)' }}
                  >
                    <div className="absolute inset-[-4px] md:inset-[-6px] rounded-full border-2 border-transparent group-hover:border-[var(--storify-primary)] transition-all duration-500 scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100" />
                    <div className="w-full h-full rounded-full overflow-hidden">
                      {renderCategoryImage(
                        cat,
                        `w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110`,
                        grayscale,
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm sm:text-base md:text-xl font-bold uppercase tracking-tight" style={{ color: 'var(--storify-headings)' }}>
                      {cat.name}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60" style={{ color: 'var(--storify-text)' }}>
                      {cat.count != null ? `${cat.count} ${t('categories_units')}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {enableHorizontalScroll && categories.length > 0 && (
              <>
                {/* Previous Button: Physically on the right for RTL, left for LTR */}
                <button
                  onClick={() => scroll('prev')}
                  className={`absolute ${isRtl ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition z-10`}
                  style={{ color: 'var(--storify-headings)', background: 'var(--storify-bg)', border: '2px solid var(--storify-border)' }}
                  aria-label={t('carousel_prev')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                  </svg>
                </button>
                {/* Next Button: Physically on the left for RTL, right for LTR */}
                <button
                  onClick={() => scroll('next')}
                  className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition z-10`}
                  style={{ color: 'var(--storify-headings)', background: 'var(--storify-bg)', border: '2px solid var(--storify-border)' }}
                  aria-label={t('carousel_next')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                  </svg>
                </button>
              </>
            )}
          </div>
        );
      case 'grid':
      default:
        return (
          <div className="relative group/slider overflow-hidden">
            <div
              ref={containerRef}
              onScroll={handleScroll}
              onMouseDown={onMouseDown}
              onMouseLeave={onMouseLeave}
              onMouseUp={onMouseUp}
              onMouseMove={onMouseMove}
              className={enableHorizontalScroll 
                ? `flex gap-6 overflow-x-auto pb-6 no-scrollbar cursor-grab active:cursor-grabbing ${isDragging ? '' : 'snap-x snap-mandatory'}`
                : "grid grid-cols-2 md:grid-cols-4 gap-6"
              }
            >
              {(enableHorizontalScroll ? items : categories).map((cat, i) => (
                <motion.button
                  type="button"
                  onClick={(e) => handleItemClick(e, cat)}
                  key={`${cat.id || cat.name}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className={`group relative h-64 overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 ${enableHorizontalScroll ? 'snap-center shrink-0 w-[280px]' : ''}`}
                  style={{ borderRadius }}
                >
                  {renderCategoryImage(
                    cat,
                    `w-full h-full object-cover transition duration-700 group-hover:scale-110`,
                    grayscale,
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-6">
                    <span className="text-white font-black text-2xl uppercase tracking-tighter text-center transform group-hover:scale-110 transition-transform duration-500">
                      {cat.name}
                    </span>
                    <div className="h-1 w-0 group-hover:w-12 transition-all duration-500 mt-2 bg-[var(--storify-primary)]" />
                  </div>
                </motion.button>
              ))}
            </div>

            {enableHorizontalScroll && categories.length > 0 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={() => scroll('prev')}
                  className={`absolute ${isRtl ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition z-10`}
                  aria-label={t('carousel_prev')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                  </svg>
                </button>
                {/* Next Button */}
                <button
                  onClick={() => scroll('next')}
                  className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition z-10`}
                  aria-label={t('carousel_next')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                  </svg>
                </button>
              </>
            )}
          </div>
        );
    }
  };

  const isEmpty = categories.length === 0;
  const sectionTitle = content.title || t('categories_section_title');
  const sectionSubtitle = content.subtitle || t('categories_section_subtitle');

  return (
    <section 
      className="max-w-7xl mx-auto px-6"
      style={{ paddingTop, paddingBottom, background: 'var(--storify-bg)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-10">
        <div className="text-center sm:text-start w-full sm:w-auto">
          <h2 className="text-3xl font-bold" style={{ color: 'var(--storify-headings)' }}>
            {sectionTitle}
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--storify-text)', opacity: 0.7 }}>
            {sectionSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigateStorefront('/shop')}
          className="hidden md:inline-block font-bold text-sm border-b-2 pb-1 transition"
          style={{ color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
        >
          {isRtl ? t('categories_shop_arrow_rtl') : t('categories_shop_arrow_ltr')}
        </button>
      </div>

      {isEmpty ? (
        <div className="col-span-full text-center py-10" style={{ color: 'var(--storify-text)', opacity: 0.4 }}>
          <p className="text-sm">{t('categories_empty')}</p>
        </div>
      ) : (
        renderContent()
      )}
    </section>
  );
};

export default CategoriesSection;
