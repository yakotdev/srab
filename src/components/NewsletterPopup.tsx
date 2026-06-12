import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, ArrowRight } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';

interface NewsletterPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewsletterPopup: React.FC<NewsletterPopupProps> = ({ isOpen, onClose }) => {
  const { isRtl, t } = useThemeConfig();
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('umino_newsletter_seen', 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="relative w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 end-6 z-30 w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-primary hover:bg-brand-accent hover:text-white transition-all shadow-lg"
            >
              <X size={20} />
            </button>

            {/* Image Section */}
            <div className="w-full md:w-1/2 aspect-square md:aspect-auto relative bg-neutral-100">
              <img 
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1000" 
                alt="Newsletter" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-brand-primary/10" />
            </div>

            {/* Content Section */}
            <div className={`w-full md:w-1/2 p-12 md:p-20 flex flex-col justify-center ${isRtl ? 'text-start' : 'text-start'}`}>
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">{t('newsletter_modal_kicker')}</p>
                  <h2 className="text-5xl font-extrabold tracking-tighter leading-none uppercase text-brand-primary">{t('newsletter_modal_title')}</h2>
                  <p className="text-neutral-500 text-sm leading-relaxed">
                    {t('newsletter_modal_subtitle')}
                  </p>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div className="relative">
                    <input 
                      type="email" 
                      required
                      placeholder={t('shop_newsletter_email_placeholder')} 
                      className="w-full bg-neutral-50 border-2 border-transparent px-6 py-5 rounded-2xl text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all text-brand-primary"
                    />
                    <Mail className="absolute start-6 top-1/2 -translate-y-1/2 text-neutral-300" size={20} />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-brand-accent transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20"
                  >
                    {t('newsletter_popup_button')} <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />
                  </button>
                </form>

                <div className="flex items-center justify-start gap-2">
                  <input type="checkbox" id="no-show" className="accent-brand-primary" />
                  <label htmlFor="no-show" className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 cursor-pointer">{t('newsletter_modal_no_show_again')}</label>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewsletterPopup;
