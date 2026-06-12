import React from 'react';
import { motion } from 'motion/react';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';
import SectionImagePlaceholder from '../components/SectionImagePlaceholder';
import { hasSectionImage } from '../utils/sectionImage';
import HtmlContent from '../components/HtmlContent';

const ImageWithTextSection: React.FC<{ section: any }> = ({ section }) => {
  const { isRtl } = useThemeConfig();
  const content = section?.content || {};
  
  const layoutStyle = content.layout_style || 'image_left';
  const paddingTop = content.padding_top || '80px';
  const paddingBottom = content.padding_bottom || '80px';
  
  const title = content.title || '';
  const subtitle = content.subtitle || '';
  const image = content.image || '';
  const buttonText = content.button_text || '';
  const buttonLink = content.button_link || '/shop';

  const isImageLeft = layoutStyle === 'image_left';

  return (
    <section 
      className="overflow-hidden"
      style={{ paddingTop, paddingBottom, background: 'var(--storify-bg)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className={`flex flex-col ${isImageLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 lg:gap-24`}>
          
          {/* Image Side */}
          <motion.div 
            initial={{ opacity: 0, x: isImageLeft ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-1/2"
          >
            <div className="relative w-full aspect-[4/5] md:aspect-square rounded-3xl overflow-hidden shadow-2xl group">
              {hasSectionImage(image) ? (
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <SectionImagePlaceholder className="w-full h-full" />
              )}
            </div>
          </motion.div>

          {/* Content Side */}
          <motion.div 
            initial={{ opacity: 0, x: isImageLeft ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full md:w-1/2 flex flex-col justify-center"
          >
            {title && (
              <h2 
                className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight tracking-tighter"
                style={{ color: 'var(--storify-headings)' }}
              >
                {title}
              </h2>
            )}

            {subtitle && (
              <div 
                className="text-lg mb-10 leading-relaxed opacity-80"
                style={{ color: 'var(--storify-text)' }}
              >
                <HtmlContent html={subtitle} tag="div" />
              </div>
            )}

            {buttonText && (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => navigateStorefront(buttonLink)}
                  className="px-10 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1"
                  style={{ 
                    background: 'var(--storify-btn-primary-bg)', 
                    color: 'var(--storify-btn-primary-fg)' 
                  }}
                >
                  {buttonText}
                </button>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default ImageWithTextSection;
