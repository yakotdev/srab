import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { prepareHtmlContent } from '../../lib/htmlContent';

type PolicyKey = 'returnExchange' | 'privacy' | 'terms' | 'shipping';
const SLUG_MAP: Record<string, { key: PolicyKey; titleAr: string; titleEn: string }> = {
  'return-exchange': { key: 'returnExchange', titleAr: 'سياسة الاستبدال والاسترجاع', titleEn: 'Return & Exchange Policy' },
  privacy: { key: 'privacy', titleAr: 'سياسة الخصوصية', titleEn: 'Privacy Policy' },
  terms: { key: 'terms', titleAr: 'شروط الخدمة', titleEn: 'Terms of Service' },
  shipping: { key: 'shipping', titleAr: 'سياسة الشحن والتوصيل', titleEn: 'Shipping & Delivery Policy' },
};

const PolicyPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { storeConfig, t, theme, language } = useStore();

  if (!slug || !SLUG_MAP[slug]) return <Navigate to="/" replace />;

  const def = SLUG_MAP[slug];
  const policies = storeConfig.policies || {};
  const content = def.key === 'returnExchange'
    ? (policies.returnExchange ?? (policies as any).refund ?? '')
    : (policies[def.key] as string | undefined) ?? '';

  const title = language === 'ar' ? def.titleAr : def.titleEn;

  if (!content.trim()) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">{title}</h1>
        <p className="text-slate-500">{t('policy_not_available') || 'هذه السياسة غير متوفرة حالياً.'}</p>
      </div>
    );
  }

  const safeHtml = prepareHtmlContent(content);

  return (
    <div className="min-h-screen bg-[#fcfcfd] animate-fade-in font-sans selection:bg-slate-900 selection:text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-32">
        <div className="mb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                    {language === 'ar' ? 'السياسات والشروط' : 'Official Store Policies'}
                </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-none mb-6">
                {title}
            </h1>
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.25em]">
                {language === 'ar' ? 'آخر تحديث: أبريل ٢٠٢٤' : 'Last Updated: April 2024'}
            </p>
        </div>

        <div className="relative">
            <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-slate-100 hidden md:block" />
            <div
                className="prose prose-slate max-w-none text-slate-600 leading-[1.8] policy-content policy-rich-content font-medium text-[15px]"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
        </div>

        <div className="mt-32 pt-16 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed max-w-sm text-center md:text-start">
                {language === 'ar'
                    ? 'سياساتنا مصممة لضمان تجربة تسوق آمنة وعادلة لجميع عملائنا'
                    : 'Our policies are designed to ensure a safe and fair shopping experience for all customers'}
            </p>
            <div className="flex items-center gap-8">
                {['PCI DSS', '256-bit SSL'].map(badge => (
                    <span key={badge} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{badge}</span>
                ))}
            </div>
        </div>
      </div>

      <style>{`
        .policy-rich-content p { margin-bottom: 24px; }
        .policy-rich-content strong, .policy-rich-content b { color: #0f172a; font-weight: 800; }
        .policy-rich-content h2 { 
            color: #0f172a; 
            font-weight: 900; 
            font-size: 1.75em; 
            margin: 64px 0 24px; 
            letter-spacing: -0.025em;
            line-height: 1.2;
        }
        .policy-rich-content h3 { 
            color: #0f172a; 
            font-weight: 900; 
            font-size: 1.25em; 
            margin: 48px 0 16px; 
            letter-spacing: -0.01em;
        }
        .policy-rich-content ul { 
            list-style-type: none; 
            padding: 0; 
            margin: 24px 0; 
        }
        .policy-rich-content ul li { 
            position: relative; 
            padding-inline-start: 28px; 
            margin-bottom: 12px; 
        }
        .policy-rich-content ul li::before {
            content: "";
            position: absolute;
            left: 0;
            top: 10px;
            width: 8px;
            height: 2px;
            background: #0f172a;
        }
        [dir="rtl"] .policy-rich-content ul li::before {
            left: auto;
            right: 0;
        }
        .policy-rich-content a { 
            color: #0f172a; 
            text-decoration: underline; 
            text-underline-offset: 4px;
            font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default PolicyPage;
