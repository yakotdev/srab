import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';

const Contact: React.FC = () => {
  const { t, theme, addMessage, storeConfig } = useStore();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(formData.name && formData.email && formData.message) {
          addMessage({
              name: formData.name,
              email: formData.email,
              message: formData.message
          });
          addToast(t('message_sent'), 'success');
          setFormData({ name: '', email: '', message: '' });
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 animate-fade-in">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
           <div>
               <span className="text-indigo-600 font-bold uppercase tracking-widest text-sm mb-2 block">{t('contact')}</span>
               <h1 className="text-5xl font-black text-slate-900 mb-6">{t('contact_title')}</h1>
               <p className="text-xl text-slate-500 mb-10 leading-relaxed">
               هل لديك سؤال أو ترغب فقط في إلقاء التحية؟ يسعدنا التواصل معك. املأ النموذج أو تواصل معنا عبر البريد الإلكتروني او رقم الهاتف.
               </p>

               <div className="space-y-8">
                   <div className="flex items-start gap-4">
                       <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                           <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                       </div>
                       <div>
                           <h3 className="font-bold text-slate-900 text-lg">{t('email')}</h3>
                           {storeConfig.email ? (
                             <a href={`mailto:${storeConfig.email}`} className="text-slate-500 hover:text-slate-900 transition">
                               {storeConfig.email}
                             </a>
                           ) : (
                             <p className="text-slate-500">{t('email_not_set') || 'Email not set'}</p>
                           )}
                       </div>
                   </div>
                   {storeConfig.address && (
                     <div className="flex items-start gap-4">
                         <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                             <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                         </div>
                         <div>
                             <h3 className="font-bold text-slate-900 text-lg">{t('office_label') || t('address')}</h3>
                             <p className="text-slate-500">{storeConfig.address}</p>
                         </div>
                     </div>
                   )}
                   {storeConfig.phone && (
                     <div className="flex items-start gap-4">
                         <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                             <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                         </div>
                         <div>
                             <h3 className="font-bold text-slate-900 text-lg">{t('phone')}</h3>
                             <a href={`tel:${storeConfig.phone}`} className="text-slate-500 hover:text-slate-900 transition">
                               {storeConfig.phone}
                             </a>
                         </div>
                     </div>
                   )}
               </div>
           </div>

           <div className="bg-slate-50 p-8 md:p-10 rounded-3xl shadow-sm border border-slate-100">
               <form onSubmit={handleSubmit} className="space-y-6">
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">{t('name')}</label>
                       <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition" 
                        />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">{t('email')}</label>
                       <input 
                            required
                            type="email" 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition" 
                        />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">{t('message_label')}</label>
                       <textarea 
                            required
                            rows={4} 
                            value={formData.message}
                            onChange={e => setFormData({...formData, message: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                        ></textarea>
                   </div>
                   <button 
                       type="submit" 
                       className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition"
                       style={{backgroundColor: theme.primaryColor}}
                    >
                       {t('send_message')}
                   </button>
               </form>
           </div>
       </div>
    </div>
  );
};

export default Contact;