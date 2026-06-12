import React, { useState } from 'react';
import { isStorifyThemeEmbedded } from '@storify/theme';
import { notifyNewsletterSubscribe } from '@storify/theme';
import { useThemeConfig } from '../ThemeContext';
const NewsletterSection: React.FC<{ section: any }> = ({ section }) => {
  const { t } = useThemeConfig();
  const content = section.content || {};
  const paddingTop = content.padding_top || '96px';
  const paddingBottom = content.padding_bottom || '96px';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  const embedded = isStorifyThemeEmbedded();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (embedded) {
      notifyNewsletterSubscribe(trimmed);
      setStatus('sent');
      setEmail('');
      return;
    }
    setStatus('error');
  };

  const primaryStyle = {
    backgroundColor: 'var(--storify-btn-primary-bg, var(--storify-primary, #6366f1))',
    color: 'var(--storify-btn-primary-fg, #ffffff)',
  };

  return (
    <section className="py-24 px-6" style={{ background: 'var(--storify-bg)', paddingTop, paddingBottom }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--storify-headings)' }}>
          {content.title || t('shop_newsletter_heading')}
        </h2>
        <p
          className="opacity-70 mb-10 max-w-xl mx-auto text-lg"
          style={{ color: 'var(--storify-text)' }}
        >
          {content.subtitle || t('newsletter_default_subtitle')}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-lg mx-auto gap-4">
          <input
            type="email"
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value);
              setStatus('idle');
            }}
            placeholder={t('shop_newsletter_email_placeholder')}
            disabled={status === 'loading'}
            className="flex-1 px-6 py-4 rounded-full focus:outline-none shadow-inner transition disabled:opacity-70"
            style={{ 
              background: 'var(--storify-bg)', 
              color: 'var(--storify-text)',
              borderColor: 'var(--storify-border)',
              borderWidth: '1px'
            }}
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-8 py-4 font-bold rounded-full whitespace-nowrap shadow-lg hover:shadow-xl transition disabled:opacity-70"
            style={primaryStyle}
          >
            {status === 'loading' ? t('newsletter_sending') : t('shop_newsletter_subscribe')}
          </button>
        </form>
        {status === 'sent' && (
          <p className="mt-4 font-medium text-sm" style={{ color: 'var(--storify-primary)' }}>{t('newsletter_thanks')}</p>
        )}
        {status === 'error' && !embedded && (
          <p className="mt-4 text-sm opacity-60" style={{ color: 'var(--storify-text)' }}>{t('newsletter_local_preview_only')}</p>
        )}
      </div>
    </section>
  );
};

export default NewsletterSection;
