import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';
import HtmlContent from '../components/HtmlContent';
import { navigateStorefront, normalizeLinkPath } from '@storify/theme';
import SectionImagePlaceholder from '../components/SectionImagePlaceholder';
import { hasSectionImage } from '../utils/sectionImage';

const SlideshowSection: React.FC<{ section: any }> = ({ section }) => {
  const { isRtl, t } = useThemeConfig();
  const content = section?.content || {};
  const slides = Array.isArray(content.slides) ? content.slides : [];
  const layoutStyle = content.layout_style || 'classic';
  const autoplay = true; // Default to true for slideshow
  const interval = 5000; // 5 seconds

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (autoplay && slides.length > 1) {
      const timer = setInterval(nextSlide, interval);
      return () => clearInterval(timer);
    }
  }, [autoplay, interval, nextSlide, slides.length]);

  if (slides.length === 0) return null;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    } as any)
  };

  const renderSlide = (slide: any) => {
    const shopHref = normalizeLinkPath(slide.cta_link, '/shop');

    if (layoutStyle === 'split') {
      return (
        <div className="flex flex-col md:flex-row h-full w-full bg-white">
          <div className="w-full md:w-1/2 h-1/2 md:h-full relative overflow-hidden">
            {hasSectionImage(slide.image) ? (
              <img
                src={slide.image}
                className="absolute inset-0 w-full h-full object-cover"
                alt={slide.heading}
                referrerPolicy="no-referrer"
              />
            ) : (
              <SectionImagePlaceholder className="absolute inset-0 w-full h-full" />
            )}
          </div>
          <div className="w-full md:w-1/2 h-1/2 md:h-full flex items-center justify-center p-8 md:p-16">
            <div className="max-w-xl text-start">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight"
              >
                <HtmlContent html={slide.heading} tag="span" />
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-slate-500 mb-8 leading-relaxed"
              >
                <HtmlContent html={slide.subheading} tag="span" />
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button type="button" onClick={() => navigateStorefront(shopHref)} className="inline-block px-10 py-4 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-full hover:bg-[var(--storify-primary,#6366f1)] transition-colors shadow-xl">
                  {slide.buttonText || t('mock_hero_cta')}
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {hasSectionImage(slide.image) ? (
            <>
              <img
                src={slide.image}
                className="w-full h-full object-cover"
                alt={slide.heading}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30" />
            </>
          ) : (
            <SectionImagePlaceholder className="w-full h-full" />
          )}
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-8xl font-black mb-8 text-white leading-tight tracking-tighter drop-shadow-2xl">
              <HtmlContent html={slide.heading} tag="span" />
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              <HtmlContent html={slide.subheading} tag="span" />
            </p>
            <button type="button" onClick={() => navigateStorefront(shopHref)} className="inline-block px-12 py-5 bg-white text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-full hover:bg-[var(--storify-primary,#6366f1)] hover:text-white transition-all shadow-2xl">
              {slide.buttonText || t('mock_hero_cta')}
            </button>
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <section className="relative h-[80vh] min-h-[600px] overflow-hidden bg-slate-100">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.4 }
          }}
          className="absolute inset-0"
        >
          {renderSlide(slides[currentIndex])}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex justify-between px-4 md:px-10 pointer-events-none">
            <button 
              onClick={prevSlide}
              className="p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all pointer-events-auto"
            >
              {isRtl ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
            </button>
            <button 
              onClick={nextSlide}
              className="p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all pointer-events-auto"
            >
              {isRtl ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  idx === currentIndex ? 'w-12 bg-white' : 'w-3 bg-white/30'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default SlideshowSection;
