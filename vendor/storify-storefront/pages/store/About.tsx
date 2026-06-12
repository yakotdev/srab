import React from 'react';
import { useStore } from '../../context/StoreContext';

const About: React.FC = () => {
  const { t, theme } = useStore();

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
       <div className="text-center mb-16">
           <span className="text-indigo-600 font-bold uppercase tracking-widest text-sm mb-2 block">{t('about')}</span>
           <h1 className="text-5xl font-black text-slate-900 mb-6">{t('our_story_title')}</h1>
           <p className="text-xl text-slate-500 leading-relaxed">
               {t('our_story_desc')}
           </p>
       </div>

       <div className="bg-slate-100 rounded-3xl overflow-hidden mb-16 h-96 relative">
            <div className="w-full h-full bg-slate-200"></div>
            <div className="absolute inset-0 bg-black/20"></div>
       </div>

       <div className="grid md:grid-cols-2 gap-12 text-slate-600 text-lg leading-relaxed">
           <p>
               {t('founded_story')}
           </p>
           <p>
               {t('team_story')} {t('thank_you_story')}
           </p>
       </div>
       
       <div className="mt-20 border-t border-slate-200 pt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="p-6">
                    <div className="text-4xl font-black text-slate-900 mb-2" style={{color: theme.primaryColor}}>10k+</div>
                    <div className="font-bold text-slate-600">{t('happy_customers')}</div>
                </div>
                <div className="p-6">
                    <div className="text-4xl font-black text-slate-900 mb-2" style={{color: theme.primaryColor}}>500+</div>
                    <div className="font-bold text-slate-600">{t('premium_products')}</div>
                </div>
                <div className="p-6">
                    <div className="text-4xl font-black text-slate-900 mb-2" style={{color: theme.primaryColor}}>24/7</div>
                    <div className="font-bold text-slate-600">{t('support_24_7')}</div>
                </div>
            </div>
       </div>
    </div>
  );
};

export default About;