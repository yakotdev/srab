import React from 'react';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';

const MarqueeSection: React.FC<{ section: any }> = ({ section }) => {
  const { isRtl } = useThemeConfig();
  const content = section?.content || {};
  
  const items = Array.isArray(content.items) && content.items.length > 0 
    ? content.items 
    : [
        { text: 'شحن مجاني للطلبات فوق 500 ' },
        { text: 'خصم 20% على المنتجات الجديدة' },
        { text: 'ضمان استرجاع خلال 14 يوم' }
      ];
      
  const layoutStyle = content.layout_style || 'classic';
  const speed = Number(content.speed) || 20;
  const pauseOnHover = content.pause_on_hover !== 'false' && content.pause_on_hover !== false;
  const direction = content.direction || 'auto';
  
  const paddingTop = content.padding_top || '20px';
  const paddingBottom = content.padding_bottom || '20px';
  const textSize = content.text_size || 'text-lg';

  let animClass = 'animate-marquee-left';
  if (direction === 'right' || (direction === 'auto' && isRtl)) {
    animClass = 'animate-marquee-right';
  }
  if (direction === 'left' || (direction === 'auto' && !isRtl)) {
    animClass = 'animate-marquee-left';
  }

  const renderItem = (item: any, idx: number) => {
    if (layoutStyle === 'ticker') {
      return (
        <div key={idx} className={`flex items-center gap-12 whitespace-nowrap px-6 ${item.link ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={() => item.link && navigateStorefront(item.link)}>
          <span className={`font-bold uppercase tracking-widest ${textSize}`} style={{ color: 'var(--storify-bg)' }}>
            {item.text}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--storify-bg)', opacity: 0.5 }}></span>
        </div>
      );
    }

    if (layoutStyle === 'large_outline') {
      return (
        <div key={idx} className={`flex items-center gap-16 whitespace-nowrap ${item.link ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`} onClick={() => item.link && navigateStorefront(item.link)}>
          <span 
            className="font-black uppercase tracking-tighter text-6xl md:text-8xl lg:text-9xl" 
            style={{ 
              WebkitTextStroke: '2px var(--storify-headings)', 
              color: 'transparent',
              opacity: 0.3
            }}
          >
            {item.text}
          </span>
        </div>
      );
    }

    if (layoutStyle === 'slanted') {
      return (
        <div key={idx} className={`flex items-center gap-10 whitespace-nowrap ${item.link ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={() => item.link && navigateStorefront(item.link)}>
          <span className={`font-black italic uppercase tracking-widest ${textSize}`} style={{ color: 'var(--storify-bg)' }}>
            {item.text}
          </span>
          <span className="text-xl font-black opacity-50" style={{ color: 'var(--storify-bg)' }}>//</span>
        </div>
      );
    }

    // classic
    return (
      <div key={idx} className={`flex items-center gap-8 whitespace-nowrap ${item.link ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`} onClick={() => item.link && navigateStorefront(item.link)}>
        <span className={`font-black uppercase tracking-widest ${textSize}`} style={{ color: 'var(--storify-headings)' }}>{item.text}</span>
        <span className="w-2 h-2 rounded-full opacity-30" style={{ background: 'var(--storify-primary)' }}></span>
      </div>
    );
  };

  const marqueeContent = (
    <>
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left { animation: marquee-left var(--marquee-speed, 20s) linear infinite; }
        .animate-marquee-right { animation: marquee-right var(--marquee-speed, 20s) linear infinite; }
        .pause-on-hover:hover .animate-marquee-left,
        .pause-on-hover:hover .animate-marquee-right { animation-play-state: paused; }
      `}</style>
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className={`flex min-w-full shrink-0 w-max items-center justify-around gap-8 px-4 ${animClass}`}
          aria-hidden={i !== 0 ? "true" : "false"}
        >
          {items.map((item: any, idx: number) => renderItem(item, idx))}
        </div>
      ))}
    </>
  );

  if (layoutStyle === 'crossed') {
    return (
      <section 
        className="relative overflow-hidden flex items-center justify-center min-h-[300px] md:min-h-[400px]" 
        style={{ background: 'var(--storify-bg)', paddingTop, paddingBottom }}
        dir="ltr"
      >
        <style>{`
          @keyframes marquee-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
          @keyframes marquee-right {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(0); }
          }
          .animate-marquee-left { animation: marquee-left var(--marquee-speed, 20s) linear infinite; }
          .animate-marquee-right { animation: marquee-right var(--marquee-speed, 20s) linear infinite; }
          .pause-on-hover:hover .animate-marquee-left,
          .pause-on-hover:hover .animate-marquee-right { animation-play-state: paused; }
        `}</style>
        
        {/* Track 1 (Back) */}
        <div 
          className={`absolute w-[110vw] flex flex-nowrap shadow-2xl ${pauseOnHover ? 'pause-on-hover' : ''}`}
          style={{
            background: 'var(--storify-primary)',
            color: 'var(--storify-bg)',
            paddingTop: '16px',
            paddingBottom: '16px',
            transform: 'rotate(-4deg)',
            zIndex: 1,
            '--marquee-speed': `${speed}s`
          } as React.CSSProperties}
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex min-w-full shrink-0 w-max items-center justify-around gap-8 px-4 animate-marquee-left" aria-hidden={i !== 0 ? "true" : "false"}>
              {items.map((item: any, idx: number) => (
                <div key={idx} className={`flex items-center gap-10 whitespace-nowrap ${item.link ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={() => item.link && navigateStorefront(item.link)}>
                  <span className={`font-black uppercase tracking-widest ${textSize}`}>{item.text}</span>
                  <span className="text-xl font-black opacity-50">//</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Track 2 (Front) */}
        <div 
          className={`absolute w-[110vw] flex flex-nowrap shadow-2xl ${pauseOnHover ? 'pause-on-hover' : ''}`}
          style={{
            background: 'var(--storify-headings)',
            color: 'var(--storify-bg)',
            paddingTop: '16px',
            paddingBottom: '16px',
            transform: 'rotate(4deg)',
            zIndex: 2,
            '--marquee-speed': `${speed * 1.2}s`
          } as React.CSSProperties}
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex min-w-full shrink-0 w-max items-center justify-around gap-8 px-4 animate-marquee-right" aria-hidden={i !== 0 ? "true" : "false"}>
              {items.map((item: any, idx: number) => (
                <div key={idx} className={`flex items-center gap-10 whitespace-nowrap ${item.link ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={() => item.link && navigateStorefront(item.link)}>
                  <span className={`font-black uppercase tracking-widest ${textSize}`}>{item.text}</span>
                  <span className="text-xl font-black opacity-50">//</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (layoutStyle === 'slanted') {
    return (
      <section className="overflow-hidden" style={{ paddingTop, paddingBottom, background: 'var(--storify-bg)' }}>
        <div 
          className={`relative flex flex-nowrap ${pauseOnHover ? 'pause-on-hover' : ''} shadow-xl`}
          style={{
            background: 'var(--storify-headings)',
            paddingTop: '16px',
            paddingBottom: '16px',
            transform: 'rotate(-2deg) scale(1.05)',
            '--marquee-speed': `${speed}s`
          } as React.CSSProperties}
          dir="ltr"
        >
          {marqueeContent}
        </div>
      </section>
    );
  }

  const sectionStyle: React.CSSProperties = {
    paddingTop, 
    paddingBottom, 
    '--marquee-speed': `${speed}s` 
  } as React.CSSProperties;

  if (layoutStyle === 'ticker') {
    sectionStyle.background = 'var(--storify-headings)';
    sectionStyle.paddingTop = '16px';
    sectionStyle.paddingBottom = '16px';
  } else {
    sectionStyle.background = 'var(--storify-bg)';
  }

  return (
    <section 
      className={`overflow-hidden relative flex flex-nowrap ${pauseOnHover ? 'pause-on-hover' : ''}`}
      style={sectionStyle}
      dir="ltr"
    >
      {marqueeContent}
    </section>
  );
};

export default MarqueeSection;
