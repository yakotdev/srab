import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SLIDES } from '../constants';
import { RefreshCcw } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';

const StackedSlider: React.FC = () => {
  const { t } = useThemeConfig();
  const [cards, setCards] = useState(SLIDES);

  const removeCard = (id: number, direction: number) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  const reset = () => {
    setCards(SLIDES);
  };

  return (
    <div className="relative w-full max-w-md mx-auto h-[600px] flex flex-col items-center justify-center">
      <div className="relative w-full h-[450px]">
        <AnimatePresence>
          {cards.map((card, index) => {
            const isTop = index === cards.length - 1;
            
            return (
              <motion.div
                key={card.id}
                style={{
                  zIndex: index,
                }}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ 
                  scale: 1 - (cards.length - 1 - index) * 0.05,
                  opacity: 1,
                  y: (cards.length - 1 - index) * -15,
                }}
                exit={{ 
                  x: 500, 
                  opacity: 0, 
                  rotate: 20,
                  transition: { duration: 0.3 } 
                }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => {
                  if (info.offset.x > 100) {
                    removeCard(card.id, 1);
                  } else if (info.offset.x < -100) {
                    removeCard(card.id, -1);
                  }
                }}
                className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing border border-zinc-200"
              >
                <img
                  src={card.url}
                  alt={card.title}
                  className="w-full h-2/3 object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                <div className="p-6 text-right">
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">{card.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      {t('stacked_slider_swipe_skip')}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {cards.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400"
          >
            <p className="mb-4">{t('stacked_slider_finished')}</p>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-all shadow-lg"
            >
              <RefreshCcw size={18} />
              {t('stacked_slider_reset')}
            </button>
          </motion.div>
        )}
      </div>
      
      <div className="mt-12 text-center text-zinc-400 text-sm">
        <p>{t('stacked_slider_hint')}</p>
      </div>
    </div>
  );
};

export default StackedSlider;
