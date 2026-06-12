import React from 'react';
import { User } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';

const ProfilePageSection: React.FC<{ section: { content?: Record<string, unknown> } }> = ({ section }) => {
  const { t } = useThemeConfig();
  const content = section?.content || {};
  const title = (content.title as string) || t('profile');
  const desc =
    (content.subtitle as string) ||
    t('profile_theme_hint');

  return (
    <section className="py-20 md:py-28 min-h-[50vh]" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
      <div className="max-w-xl mx-auto px-6 text-center space-y-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)', color: 'var(--storify-primary)' }}>
          <User size={40} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-3" style={{ color: 'var(--storify-headings)' }}>{title}</h1>
          <p className="opacity-60 text-sm leading-relaxed">{desc}</p>
        </div>
        <button
          type="button"
          onClick={() => navigateStorefront('/profile')}
          className="inline-block px-10 py-4 rounded-full font-bold uppercase text-xs tracking-widest transition-all shadow-xl"
          style={{ background: 'var(--storify-btn-primary-bg)', color: 'var(--storify-btn-primary-fg)' }}
        >
          {t('open_profile')}
        </button>
      </div>
    </section>
  );
};

export default ProfilePageSection;
