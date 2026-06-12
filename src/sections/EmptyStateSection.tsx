import React from 'react';
import { motion } from 'motion/react';
import { PackageOpen } from 'lucide-react';
import { navigateStorefront } from '@storify/theme';
import { useThemeConfig } from '../ThemeContext';

const EmptyStateSection: React.FC<{ section: any }> = ({ section }) => {
  const { t } = useThemeConfig();
  const content = section?.content || {};
  
  return (
    <section className="py-32" style={{ background: 'var(--storify-bg)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center space-y-8 rounded-[3rem] py-24 px-12 border"
          style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}
        >
          <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', opacity: 0.2 }}>
            <PackageOpen size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tighter uppercase" style={{ color: 'var(--storify-headings)' }}>
              {content.title || t('empty_state_title')}
            </h2>
            <p className="max-w-md mx-auto text-lg opacity-60" style={{ color: 'var(--storify-text)' }}>
              {content.desc || t('empty_state_desc')}
            </p>
          </div>
          <div className="flex flex-wrap gap-6 justify-center">
            <button
              type="button"
              onClick={() => navigateStorefront('/shop')}
              className="px-12 py-5 rounded-full font-bold uppercase text-xs tracking-widest transition-all shadow-xl"
              style={{ background: 'var(--storify-btn-primary-bg)', color: 'var(--storify-btn-primary-fg)' }}
            >
              {t('empty_state_explore')}
            </button>
            <button
              type="button"
              onClick={() => navigateStorefront('/')}
              className="border-b-2 pb-2 font-bold uppercase text-xs tracking-widest transition-all"
              style={{ color: 'var(--storify-text)', borderColor: 'var(--storify-primary)' }}
            >
              {t('empty_state_back_home')}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EmptyStateSection;
