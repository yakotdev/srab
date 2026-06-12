import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';
import HtmlContent from '../components/HtmlContent';

import { navigateStorefront, normalizeLinkPath } from '@storify/theme';
import SectionImagePlaceholder from '../components/SectionImagePlaceholder';
import { hasSectionImage } from '../utils/sectionImage';

const HeroSliderSection: React.FC<{ section: any }> = ({ section }) => {
  const { isRtl, t } = useThemeConfig();
  const content = section?.content || {};
  const layoutStyle = content.layout_style || 'classic';
  const autoplay = content.autoplay === 'true';
  const interval = (Number(content.interval) || 5) * 1000;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  /**
   * Hard-coded Arabic fallbacks used to leak through when a merchant browsed `/en/...` but the
   * section had no content yet (e.g. fresh install, deleted slide). We now route every default
   * through the theme translator so bundled `en.json`/`fr.json` strings actually win when the
   * storefront locale isn't Arabic.
   */
  const defaultSlide = {
    image: content.image,
    title: content.title || t('mock_hero_title'),
    subtitle: content.subtitle || t('mock_hero_subtitle'),
    buttonText: content.buttonText || content.button_text || t('mock_hero_cta'),
    link: content.link,
    alignment: content.alignment || 'center',
    overlayOpacity: content.overlayOpacity || 0.3
  };

  const slides = Array.isArray(content.slides) && content.slides.length > 0 
    ? content.slides 
    : [defaultSlide];

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (autoplay && slides.length > 1) {
      const timer = setInterval(nextSlide, interval);
      return () => clearInterval(timer);
    }
  }, [autoplay, interval, nextSlide, slides.length]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: isRtl ? (direction > 0 ? '-100%' : '100%') : (direction > 0 ? '100%' : '-100%'),
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: isRtl ? (direction < 0 ? '-100%' : '100%') : (direction < 0 ? '100%' : '-100%'),
      opacity: 0
    } as any)
  };

  const getSlideKicker = (slide: any) => String(slide.subtitle_top || '').trim();

  const renderSlideContent = (slide: any) => {
    const kicker = getSlideKicker(slide);
    const align = slide.alignment || 'center';
    let textAlignClass = 'text-center';
    let boxAlign = 'mx-auto';

    if (align === 'right') {
      textAlignClass = isRtl ? 'text-start' : 'text-end';
      boxAlign = isRtl ? 'me-auto' : 'ms-auto';
    } else if (align === 'left') {
      textAlignClass = isRtl ? 'text-end' : 'text-start';
      boxAlign = isRtl ? 'ms-auto' : 'me-auto';
    }
    
    const shopHref = normalizeLinkPath(slide.link, '/shop');

    if (layoutStyle === 'split') {
      return (
        <div className="flex flex-col md:flex-row h-full w-full" style={{ background: 'var(--storify-bg)' }}>
          <div className="w-full md:w-1/2 h-1/2 md:h-full relative overflow-hidden">
            {hasSectionImage(slide.image) ? (
              <img
                src={slide.image}
                className="absolute inset-0 w-full h-full object-cover"
                alt={slide.title}
                width={1200}
                height={800}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : (
              <SectionImagePlaceholder className="absolute inset-0 w-full h-full" />
            )}
          </div>
          <div className="w-full md:w-1/2 h-1/2 md:h-full flex items-center justify-center p-8 md:p-16" style={{ background: 'var(--storify-bg)' }}>
            <div className={`max-w-xl ${isRtl ? 'text-right' : 'text-left'}`}>
              {kicker && (
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block text-xs font-black uppercase tracking-[0.3em] mb-4"
                  style={{ color: 'var(--storify-primary)' }}
                >
                  {kicker}
                </motion.span>
              )}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-black mb-6 leading-tight"
                style={{ color: 'var(--storify-headings)' }}
              >
                <HtmlContent html={slide.title} tag="span" />
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg mb-8 leading-relaxed"
                style={{ color: 'var(--storify-text)' }}
              >
                <HtmlContent html={slide.subtitle} tag="span" />
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => navigateStorefront(shopHref)}
                  className="inline-block px-10 py-4 font-black text-sm uppercase tracking-widest rounded-full transition-colors shadow-xl"
                  style={{ 
                    background: 'var(--storify-btn-primary-bg)', 
                    color: 'var(--storify-btn-primary-fg)' 
                  }}
                >
                  {slide.buttonText || t('mock_hero_cta')}
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      );
    }

    if (layoutStyle === 'minimal') {
      return (
        <div className="h-full w-full flex items-center justify-center px-6" style={{ background: 'var(--storify-bg)' }}>
          <div className="max-w-3xl text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 shadow-2xl mb-6" style={{ borderColor: 'var(--storify-bg)' }}>
                {hasSectionImage(slide.image) ? (
                  <img
                    src={slide.image}
                    className="w-full h-full object-cover"
                    alt=""
                    width={400}
                    height={400}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                ) : (
                  <SectionImagePlaceholder className="w-full h-full" rounded="9999px" />
                )}
              </div>
              {kicker && (
                <span className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: 'var(--storify-text)', opacity: 0.6 }}>
                  {kicker}
                </span>
              )}
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-8xl font-black mb-8 tracking-tighter"
              style={{ color: 'var(--storify-headings)' }}
            >
              <HtmlContent html={slide.title} tag="span" />
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <button
                type="button"
                onClick={() => navigateStorefront(shopHref)}
                className="text-sm font-black uppercase tracking-[0.3em] border-b-2 pb-2 transition-all"
                style={{ 
                  color: 'var(--storify-headings)', 
                  borderColor: 'var(--storify-headings)' 
                }}
              >
                {slide.buttonText || t('hero_slide_cta_explore')}
              </button>
            </motion.div>
          </div>
        </div>
      );
    }

    // Default: Classic
    return (
      <div className="relative h-full w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {hasSectionImage(slide.image) ? (
            <>
              <img
                src={slide.image}
                className="w-full h-full object-cover"
                alt={slide.title}
                width={1920}
                height={1080}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div
                className="absolute inset-0 bg-black"
                style={{ opacity: Number(slide.overlayOpacity) || 0.3 }}
              />
            </>
          ) : (
            <SectionImagePlaceholder className="w-full h-full" />
          )}
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
          <div className={`max-w-2xl w-full ${boxAlign} ${textAlignClass}`}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {kicker && (
                <span
                  className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.2em] uppercase border rounded-full backdrop-blur-md"
                  style={{
                    color: 'var(--storify-headings)',
                    borderColor: 'color-mix(in srgb, var(--storify-headings) 35%, transparent)',
                    background: 'color-mix(in srgb, var(--storify-headings) 10%, transparent)',
                  }}
                >
                  {kicker}
                </span>
              )}
              <h1
                className="text-5xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter drop-shadow-2xl"
                style={{ color: 'var(--storify-headings)' }}
              >
                <HtmlContent html={slide.title} tag="span" />
              </h1>
              <p
                className="text-lg md:text-xl mb-10 max-w-lg leading-relaxed font-medium"
                style={{ color: 'color-mix(in srgb, var(--storify-text) 88%, transparent)' }}
              >
                <HtmlContent html={slide.subtitle} tag="span" />
              </p>
              <button
                type="button"
                onClick={() => navigateStorefront(shopHref)}
                className="inline-block px-12 py-5 font-black text-xs uppercase tracking-[0.2em] rounded-full transition-all shadow-2xl transform hover:-translate-y-1"
                style={{ 
                  background: 'var(--storify-btn-primary-bg)', 
                  color: 'var(--storify-btn-primary-fg)' 
                }}
              >
                {slide.buttonText || t('mock_hero_cta')}
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="relative h-[85vh] min-h-[650px] overflow-hidden" style={{ background: 'var(--storify-bg)' }}>
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          drag={slides.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragEnd={(_, { offset, velocity }) => {
            if (slides.length <= 1) return;
            const swipeByDistance = Math.abs(offset.x) > 90;
            const swipeByVelocity = Math.abs(velocity.x) > 500;
            if (!swipeByDistance && !swipeByVelocity) return;
            const shouldGoNext = isRtl ? offset.x > 0 : offset.x < 0;
            if (shouldGoNext) nextSlide();
            else prevSlide();
          }}
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.4 }
          }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing touch-pan-y"
        >
          {renderSlideContent(slides[currentIndex])}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          {/* Navigation Arrows */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex justify-between px-4 md:px-10 pointer-events-none">
            {isRtl ? (
              <>
                <button
                  onClick={nextSlide}
                  className="p-3 md:p-4 rounded-full backdrop-blur-md border transition-all pointer-events-auto shadow-2xl"
                  style={{
                    background: 'color-mix(in srgb, var(--storify-bg) 30%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--storify-border) 60%, transparent)',
                    color: 'var(--storify-headings)',
                  }}
                  aria-label={t('carousel_next')}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  onClick={prevSlide}
                  className="p-3 md:p-4 rounded-full backdrop-blur-md border transition-all pointer-events-auto shadow-2xl"
                  style={{
                    background: 'color-mix(in srgb, var(--storify-bg) 30%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--storify-border) 60%, transparent)',
                    color: 'var(--storify-headings)',
                  }}
                  aria-label={t('carousel_prev')}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={prevSlide}
                  className="p-3 md:p-4 rounded-full backdrop-blur-md border transition-all pointer-events-auto shadow-2xl"
                  style={{
                    background: 'color-mix(in srgb, var(--storify-bg) 30%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--storify-border) 60%, transparent)',
                    color: 'var(--storify-headings)',
                  }}
                  aria-label={t('carousel_prev')}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextSlide}
                  className="p-3 md:p-4 rounded-full backdrop-blur-md border transition-all pointer-events-auto shadow-2xl"
                  style={{
                    background: 'color-mix(in srgb, var(--storify-bg) 30%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--storify-border) 60%, transparent)',
                    color: 'var(--storify-headings)',
                  }}
                  aria-label={t('carousel_next')}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Pagination Dots */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3" dir="ltr">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                aria-label={t('carousel_go_to_slide').replace('{{n}}', String(idx + 1))}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  idx === currentIndex ? 'w-12' : 'w-3'
                }`}
                style={{
                  background: idx === currentIndex
                    ? 'var(--storify-link)'
                    : 'color-mix(in srgb, var(--storify-text) 35%, transparent)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroSliderSection;
