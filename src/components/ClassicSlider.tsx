import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SLIDES } from '../constants';

import { useThemeConfig } from '../ThemeContext';

const ClassicSlider: React.FC = () => {
  const { isRtl, t } = useThemeConfig();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: isRtl ? (direction > 0 ? -1000 : 1000) : (direction > 0 ? 1000 : -1000),
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: isRtl ? (direction < 0 ? -1000 : 1000) : (direction < 0 ? 1000 : -1000),
      opacity: 0
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => (prevIndex + newDirection + SLIDES.length) % SLIDES.length);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[500px] overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl group">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);

            if (swipe < -swipeConfidenceThreshold) {
              paginate(1);
            } else if (swipe > swipeConfidenceThreshold) {
              paginate(-1);
            }
          }}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        >
          <img
            src={SLIDES[currentIndex].url}
            alt={SLIDES[currentIndex].title}
            className="w-full h-full object-cover pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent text-white text-start">
            <h2 className="text-3xl font-bold mb-2" dir="auto">{SLIDES[currentIndex].title}</h2>
            <p className="text-lg opacity-80" dir="auto">{SLIDES[currentIndex].description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <button
        className="absolute start-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors z-10 opacity-0 group-hover:opacity-100"
        onClick={() => paginate(isRtl ? 1 : -1)}
        aria-label={t('carousel_prev')}
      >
        {isRtl ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
      </button>
      <button
        className="absolute end-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors z-10 opacity-0 group-hover:opacity-100"
        onClick={() => paginate(isRtl ? -1 : 1)}
        aria-label={t('carousel_next')}
      >
        {isRtl ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            aria-label={t('carousel_go_to_slide').replace('{{n}}', String(index + 1))}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-6' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ClassicSlider;
