import React from 'react';
import { useThemeConfig } from '../ThemeContext';
import { buildSchemeCssVariables, resolveSchemeFromSettings } from '@storify/theme';
import SectionImagePlaceholder from '../components/SectionImagePlaceholder';
import { hasSectionImage } from '../utils/sectionImage';

const AboutPageSection: React.FC<{ section: any }> = ({ section }) => {
  const { settings, t } = useThemeConfig();
  const content = section?.content || {};

  const sectionSchemeId = content?.color_scheme;
  const sectionSchemeVars = buildSchemeCssVariables(
    resolveSchemeFromSettings((settings ?? {}) as Record<string, unknown>, sectionSchemeId),
  );

  const asBool = (val: any, def: boolean) => (val === 'true' || val === true) ? true : (val === 'false' || val === false) ? false : def;
  const showStats = asBool(content.show_stats, true);
  const stats = Array.isArray(content.stats) ? content.stats : [];

  return (
    <div 
      style={{ ...sectionSchemeVars, background: 'var(--storify-bg)', color: 'var(--storify-text)' }}
      className="storify-scheme-scope"
    >
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <span className="font-bold uppercase tracking-widest text-sm mb-2 block" style={{ color: 'var(--storify-primary)' }}>
            {content.kicker || t('about_kicker')}
          </span>
          <h1 className="text-5xl font-black mb-6" style={{ color: 'var(--storify-headings)' }}>
            {content.title || t('about_title')}
          </h1>
          <p className="text-xl leading-relaxed opacity-70">
            {content.subtitle || t('about_subtitle')}
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden mb-16 h-[500px] relative border shadow-xl" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
          {hasSectionImage(content.image) ? (
            <img src={content.image} alt={content.title} className="w-full h-full object-cover" />
          ) : (
            <SectionImagePlaceholder
              className="w-full h-full"
              label={t('section_image_placeholder')}
            />
          )}
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        </div>

        <div className="grid md:grid-cols-2 gap-12 text-lg leading-relaxed opacity-80">
          <p>
            {content.content_p1 || t('about_content_p1')}
          </p>
          <p>
            {content.content_p2 || t('about_content_p2')}
          </p>
        </div>

        {showStats && stats.length > 0 && (
          <div className="mt-20 border-t pt-16" style={{ borderColor: 'var(--storify-border)' }}>
            <div className={`grid grid-cols-1 md:grid-cols-${Math.min(stats.length, 3)} gap-8 text-center`}>
              {stats.map((stat: any, i: number) => (
                <div key={i} className="p-6">
                  <div className="text-4xl font-black mb-2" style={{ color: 'var(--storify-primary)' }}>
                    {stat.value}
                  </div>
                  <div className="font-bold opacity-70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutPageSection;
