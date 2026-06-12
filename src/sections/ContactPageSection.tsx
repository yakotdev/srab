import React, { useState } from 'react';
import { useThemeConfig } from '../ThemeContext';
import { shouldUseThemeRuntimeBridge, themeRuntimeCall } from '@storify/theme';
import { isStorifyThemeEmbedded } from '@storify/theme';
import { buildSchemeCssVariables, resolveSchemeFromSettings } from '@storify/theme';

const ContactPageSection: React.FC<{ section: any }> = ({ section }) => {
  const { store, settings, t } = useThemeConfig();
  const content = section?.content || {};
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const embedded = isStorifyThemeEmbedded();

  const sectionSchemeId = content?.color_scheme;
  const sectionSchemeVars = buildSchemeCssVariables(
    resolveSchemeFromSettings((settings ?? {}) as Record<string, unknown>, sectionSchemeId),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;
    if (embedded) {
      if (shouldUseThemeRuntimeBridge()) {
        void themeRuntimeCall('submitContact', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          message: formData.message.trim(),
          storeId: (store as { id?: string })?.id,
        }).catch(() => {});
      } else {
        window.parent?.postMessage?.(
          {
            type: 'STORIFY_CONTACT_FORM',
            payload: { ...formData, storeId: (store as { id?: string })?.id },
          },
          '*',
        );
      }
    }
    setFormData({ name: '', email: '', message: '' });
  };

  const asBool = (val: any, def: boolean) => (val === 'true' || val === true) ? true : (val === 'false' || val === false) ? false : def;

  const showEmail = asBool(content.show_email, true);
  const showPhone = asBool(content.show_phone, true);
  const showAddress = asBool(content.show_address, true);

  const email = content.custom_email || store?.email;
  const phone = content.custom_phone || store?.phone;
  const address = content.custom_address || store?.address;

  return (
    <div 
      style={{ ...sectionSchemeVars, background: 'var(--storify-bg)', color: 'var(--storify-text)' }}
      className="storify-scheme-scope"
    >
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <span className="font-bold uppercase tracking-widest text-sm mb-2 block" style={{ color: 'var(--storify-primary)' }}>
              {content.kicker || t('contact_kicker')}
            </span>
            <h1 className="text-5xl font-black mb-6" style={{ color: 'var(--storify-headings)' }}>
              {content.title || t('contact_title')}
            </h1>
            <p className="text-xl mb-10 leading-relaxed opacity-60">
              {content.subtitle || t('contact_subtitle')}
            </p>

            <div className="space-y-8">
              {showEmail && email && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--storify-text)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--storify-headings)' }}>{t('contact_email')}</h3>
                    <a href={`mailto:${email}`} className="opacity-60 hover:opacity-100 transition" style={{ color: 'var(--storify-text)' }}>
                      {email}
                    </a>
                  </div>
                </div>
              )}
              
              {showAddress && address && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--storify-text)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--storify-headings)' }}>{t('contact_address')}</h3>
                    <p className="opacity-60">{address}</p>
                  </div>
                </div>
              )}

              {showPhone && phone && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--storify-text)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--storify-headings)' }}>{t('contact_phone')}</h3>
                    <a href={`tel:${phone}`} className="opacity-60 hover:opacity-100 transition" style={{ color: 'var(--storify-text)' }}>
                      {phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-3xl p-8 md:p-10 shadow-sm" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">{t('reviews_label_full_name')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full py-3 px-4 rounded-xl border focus:outline-none transition-all"
                  style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
                  placeholder={t('reviews_placeholder_name')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">{t('contact_email')}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  className="w-full py-3 px-4 rounded-xl border focus:outline-none transition-all"
                  style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">{t('contact_message')}</label>
                <textarea
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
                  className="w-full py-3 px-4 rounded-xl border focus:outline-none transition-all resize-none"
                  style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
                  placeholder={t('contact_message_placeholder')}
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-full font-bold shadow-lg hover:opacity-95 transition"
                style={{ background: 'var(--storify-btn-primary-bg)', color: 'var(--storify-btn-primary-fg)' }}
              >
                {content.submit_button_text || t('contact_submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPageSection;
