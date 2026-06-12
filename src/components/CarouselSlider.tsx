import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SLIDES } from '../constants';

import { useThemeConfig } from '../ThemeContext';

const CarouselSlider: React.FC = () => {
  const { isRtl, t } = useThemeConfig();
  const [currentIndex, setCurrentIndex] = useState(0);

  const getIndex = (index: number) => {
    return (index + SLIDES.length) % SLIDES.length;
  };

  const handleNext = () => {
    setCurrentIndex((prev) => getIndex(prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => getIndex(prev - 1));
  };

  const positions = ['left', 'center', 'right'];

  const getSlidePosition = (index: number) => {
    const diff = index - currentIndex;
    
    // Handle wrapping
    let normalizedDiff = diff;
    if (diff > 1) normalizedDiff = diff - SLIDES.length;
    if (diff < -1) normalizedDiff = diff + SLIDES.length;

    if (normalizedDiff === 0) return 'center';
    if (normalizedDiff === -1 || (currentIndex === 0 && index === SLIDES.length - 1)) return 'left';
    if (normalizedDiff === 1 || (currentIndex === SLIDES.length - 1 && index === 0)) return 'right';
    return 'hidden';
  };

  const variants = {
    center: {
      x: '0%',
      scale: 1,
      zIndex: 5,
      opacity: 1,
      filter: 'blur(0px)'
    },
    left: {
      x: isRtl ? '50%' : '-50%',
      scale: 0.8,
      zIndex: 2,
      opacity: 0.6,
      filter: 'blur(2px)'
    },
    right: {
      x: isRtl ? '-50%' : '50%',
      scale: 0.8,
      zIndex: 2,
      opacity: 0.6,
      filter: 'blur(2px)'
    },
    hidden: {
      x: '0%',
      scale: 0.5,
      zIndex: 0,
      opacity: 0,
      filter: 'blur(10px)'
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[500px] flex items-center justify-center overflow-hidden py-10">
      <div className="relative w-full h-full flex items-center justify-center">
        {SLIDES.map((slide, index) => {
          const position = getSlidePosition(index);
          
          return (
            <motion.div
              key={slide.id}
              initial={false}
              animate={position}
              variants={variants}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              className="absolute w-[60%] h-[350px] rounded-3xl overflow-hidden shadow-2xl cursor-pointer"
              onClick={() => {
                if (position === 'left') handlePrev();
                if (position === 'right') handleNext();
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x < -50) handleNext();
                if (info.offset.x > 50) handlePrev();
              }}
            >
              <img
                src={slide.url}
                alt={slide.title}
                className="w-full h-full object-cover pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute inset-0 bg-black/20 transition-opacity duration-500 ${position === 'center' ? 'opacity-0' : 'opacity-100'}`} />
              
              {position === 'center' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white text-start"
                >
                  <h3 className="text-2xl font-bold">{slide.title}</h3>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4 pb-4">
        <button 
          onClick={handlePrev}
          className="px-4 py-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors text-sm font-medium"
        >
          {t('carousel_prev')}
        </button>
        <button 
          onClick={handleNext}
          className="px-4 py-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors text-sm font-medium"
        >
          {t('carousel_next')}
        </button>
      </div>
    </div>
  );
};

export default CarouselSlider;
