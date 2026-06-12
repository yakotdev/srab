import React, { useState } from 'react';
import { Settings, X, ChevronDown, ChevronUp, Eye, EyeOff, Save } from 'lucide-react';
import { ThemeConfigPayload } from '../types';

interface SettingsSimulatorProps {
  config: ThemeConfigPayload;
  onUpdateConfig: (newConfig: ThemeConfigPayload) => void;
}

const SettingsSimulator: React.FC<SettingsSimulatorProps> = ({ config, onUpdateConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'layout' | 'settings' | 'store'>('layout');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    const newLayout = config.layout.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    onUpdateConfig({ ...config, layout: newLayout });
  };

  const updateSectionContent = (id: string, key: string, value: any) => {
    const newLayout = config.layout.map(s => {
      if (s.id === id) {
        return {
          ...s,
          content: { ...s.content, [key]: value }
        };
      }
      return s;
    });
    onUpdateConfig({ ...config, layout: newLayout });
  };

  const updateStoreInfo = (key: string, value: string) => {
    onUpdateConfig({
      ...config,
      store: { ...config.store!, [key]: value }
    });
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = config.layout.findIndex(s => s.id === id);
    if (index === -1) return;
    
    const newLayout = [...config.layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newLayout.length) {
      [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
      onUpdateConfig({ ...config, layout: newLayout });
    }
  };

  const duplicateSection = (id: string) => {
    const section = config.layout.find(s => s.id === id);
    if (!section) return;
    const newSection = { ...section, id: `${section.id}_copy_${Math.floor(Math.random() * 1000)}` };
    const index = config.layout.findIndex(s => s.id === id);
    const newLayout = [...config.layout];
    newLayout.splice(index + 1, 0, newSection);
    onUpdateConfig({ ...config, layout: newLayout });
  };

  const deleteSection = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القسم؟')) {
      const newLayout = config.layout.filter(s => s.id !== id);
      onUpdateConfig({ ...config, layout: newLayout });
    }
  };

  const addSection = (type: string) => {
    const newSection = {
      id: `${type}_${Math.floor(Math.random() * 1000)}`,
      type,
      enabled: true,
      group: 'template_group',
      content: {}
    };
    onUpdateConfig({ ...config, layout: [...config.layout, newSection] });
  };

  const resetLayout = () => {
    if (window.confirm('هل تريد إعادة تعيين التخطيط إلى الوضع الافتراضي؟')) {
      window.location.reload();
    }
  };

  const getFieldLabel = (key: string) => {
    const labels: Record<string, string> = {
      buttonText: 'نص الزر',
      cta_link: 'رابط الزر',
      image: 'رابط الصورة',
      sticky: 'تثبيت عند التمرير',
      copyright: 'حقوق النشر',
      username: 'اسم المستخدم',
      end_date: 'تاريخ الانتهاء',
      posts_count: 'عدد المقالات',
      items: 'العناصر المتكررة',
      show_search: 'إظهار أيقونة البحث',
      show_wishlist: 'إظهار أيقونة المفضلة',
      show_cart: 'إظهار أيقونة السلة',
      menu: 'القائمة الرئيسية',
      logo: 'الشعار (Metafield)',
      title: 'العنوان (Metafield)',
      name: 'الاسم',
      role: 'الوظيفة',
      desc: 'الوصف',
      avatar: 'الصورة الشخصية',
      show_social: 'إظهار أيقونات التواصل',
      nav_primary: 'القائمة الرئيسية (إعدادات)',
      footer_col_1: 'قائمة الفوتر (إعدادات)',
      footer_menu_title: 'عنوان قائمة المتجر',
      support_menu_title: 'عنوان قائمة الدعم',
      show_newsletter: 'إظهار النشرة البريدية',
      newsletter_title: 'عنوان النشرة البريدية',
      newsletter_desc: 'وصف النشرة البريدية',
      bg_color: 'لون الخلفية',
      text_color: 'لون النص',
      items_per_row: 'عدد العناصر في الصف',
      show_advanced_toolbar: 'شريط الفلاتر والترتيب المتقدم',
      items_count: 'عدد الصور/العناصر',
      autoplay: 'تشغيل تلقائي',
      interval: 'سرعة التبديل (ثواني)',
      alignment: 'المحاذاة',
      overlay_opacity: 'شفافية طبقة التعتيم فوق الصورة',
      overlayOpacity: 'شفافية طبقة التعتيم فوق الصورة',
      slide_badge: 'شارة السلايدر الافتراضية',
      discount_percent: 'نسبة الخصم'
    };
    return labels[key] || key;
  };

  const filteredLayout = config.layout.filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[9999] bg-brand-primary text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 group border border-white/10"
      >
        <div className="relative">
          <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full animate-ping"></span>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-right">تخصيص الثيم الاحترافي</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 left-0 w-96 bg-white shadow-2xl z-[9999] flex flex-col border-r border-neutral-200 font-sans text-right animate-in slide-in-from-left duration-300" dir="rtl">
      <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center rotate-3">
            <Settings size={20} className="text-brand-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-tight">أومينو ستوديو</h2>
            <p className="text-[9px] text-brand-accent uppercase tracking-[0.3em] font-bold">محاكي الإعدادات المتقدم</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="flex border-b border-neutral-100 bg-white sticky top-0 z-20 shadow-sm">
        {(['layout', 'settings', 'store'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab ? 'text-brand-primary' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {tab === 'layout' ? 'الأقسام' : tab === 'settings' ? 'المظهر' : 'المتجر'}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary animate-in fade-in duration-500" />}
          </button>
        ))}
      </div>

      {activeTab === 'layout' && (
        <div className="p-4 bg-white border-b border-neutral-100 space-y-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="بحث عن قسم..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-100 border-none p-3 pr-10 text-xs rounded-xl focus:ring-2 focus:ring-brand-primary/20 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Settings size={14} />
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              onChange={(e) => { if(e.target.value) addSection(e.target.value); e.target.value = ''; }}
              className="flex-1 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest p-3 rounded-xl cursor-pointer hover:bg-neutral-800 transition-colors appearance-none text-center"
            >
              <option value="">+ إضافة قسم جديد</option>
              <option value="HERO">بنر رئيسي</option>
              <option value="FEATURED_PRODUCTS">منتجات مميزة</option>
              <option value="CATEGORIES_GRID">شبكة تصنيفات</option>
              <option value="NEWSLETTER">نشرة بريدية</option>
              <option value="TESTIMONIALS">آراء عملاء</option>
            </select>
            <button 
              onClick={resetLayout}
              className="p-3 bg-neutral-100 text-neutral-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
              title="إعادة تعيين"
            >
              <Save size={16} className="rotate-180" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50">
        {activeTab === 'layout' && (
          <div className="space-y-3">
            {filteredLayout.map((section, index) => (
              <div 
                key={section.id} 
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                  expandedSection === section.id 
                    ? 'border-brand-primary shadow-xl ring-4 ring-brand-primary/5 translate-x-2' 
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                } ${hoveredSection === section.id ? 'ring-2 ring-brand-accent/20' : ''}`}
              >
                <div className="p-4 flex items-center justify-between group cursor-pointer" onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
                        disabled={index === 0}
                        className="text-neutral-300 hover:text-brand-primary disabled:opacity-0 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
                        disabled={index === config.layout.length - 1}
                        className="text-neutral-300 hover:text-brand-primary disabled:opacity-0 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${section.enabled !== false ? 'bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20' : 'bg-neutral-100 text-neutral-300'}`}
                    >
                      {section.enabled !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <div>
                      <p className="text-sm font-bold tracking-tight">{section.id}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-medium">{section.type || 'SECTION'}</p>
                        {section.group === 'header_group' && <span className="text-[7px] bg-blue-50 text-blue-500 px-1 rounded uppercase">Header</span>}
                        {section.group === 'footer_group' && <span className="text-[7px] bg-orange-50 text-orange-500 px-1 rounded uppercase">Footer</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }}
                        className="p-2 text-neutral-400 hover:text-brand-primary hover:bg-neutral-100 rounded-lg transition-all"
                        title="تكرار"
                      >
                        <Save size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {expandedSection === section.id ? <ChevronUp size={16} className="text-brand-primary" /> : <ChevronDown size={16} className="text-neutral-300" />}
                  </div>
                </div>

                {expandedSection === section.id && (
                  <div className="p-5 bg-white border-t border-neutral-100 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {Object.entries(section.content || {}).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{getFieldLabel(key)}</label>
                          <span className="text-[8px] text-neutral-300 font-mono bg-neutral-50 px-1 rounded">{key}</span>
                        </div>
                        
                        {key === 'menu' || key === 'slides' || key === 'items' ? (
                          <div className="space-y-4">
                            {(Array.isArray(value) ? value : []).map((item: any, i: number) => (
                              <div key={i} className="p-4 bg-neutral-100 rounded-2xl space-y-3 relative group/item">
                                <button 
                                  onClick={() => {
                                    const newValue = (Array.isArray(value) ? value : []).filter((_, idx) => idx !== i);
                                    updateSectionContent(section.id, key, newValue);
                                  }}
                                  className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-lg z-10"
                                >
                                  <X size={12} />
                                </button>
                                
                                {Object.entries(item).map(([fieldKey, fieldValue]) => (
                                  <div key={fieldKey} className="space-y-1">
                                    <label className="text-[8px] font-bold uppercase text-neutral-400">{getFieldLabel(fieldKey)}</label>
                                    {fieldKey === 'alignment' ? (
                                      <div className="flex bg-white p-1 rounded-lg border border-neutral-100">
                                        {['right', 'center', 'left'].map(opt => (
                                          <button
                                            key={opt}
                                            onClick={() => {
                                              const newValue = [...(Array.isArray(value) ? value : [])];
                                              newValue[i] = { ...newValue[i], [fieldKey]: opt };
                                              updateSectionContent(section.id, key, newValue);
                                            }}
                                            className={`flex-1 py-1 text-[8px] font-bold uppercase rounded-md transition-all ${item[fieldKey] === opt ? 'bg-brand-primary text-white shadow-sm' : 'text-neutral-400'}`}
                                          >
                                            {opt === 'right' ? 'يمين' : opt === 'center' ? 'وسط' : 'يسار'}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <input 
                                        type="text" 
                                        value={String(fieldValue)} 
                                        onChange={(e) => {
                                          const newValue = [...(Array.isArray(value) ? value : [])];
                                          newValue[i] = { ...newValue[i], [fieldKey]: e.target.value };
                                          updateSectionContent(section.id, key, newValue);
                                        }}
                                        className="w-full bg-white border-none p-2 text-xs rounded-lg focus:ring-2 focus:ring-brand-primary/10"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newItem = key === 'menu' ? { name: 'رابط جديد', href: '/' } : 
                                               key === 'slides' ? { image: '', title: 'عنوان جديد', subtitle: '', desc: '', buttonText: 'اكتشف المزيد', cta_link: '/' } :
                                               { name: 'عميل جديد', role: '', content: '', avatar: '' };
                                const newValue = [...(Array.isArray(value) ? value : []), newItem];
                                updateSectionContent(section.id, key, newValue);
                              }}
                              className="w-full py-3 border-2 border-dashed border-neutral-200 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:border-brand-primary hover:text-brand-primary rounded-xl transition-all bg-white"
                            >
                              + إضافة {key === 'menu' ? 'رابط' : key === 'slides' ? 'شريحة' : 'رأي'} جديد
                            </button>
                          </div>
                        ) : key === 'items_per_row' ? (
                          <div className="flex bg-neutral-100 p-1 rounded-xl">
                            {['2', '3', '4'].map(opt => (
                              <button
                                key={opt}
                                onClick={() => updateSectionContent(section.id, key, opt)}
                                className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${String(value) === opt ? 'bg-white text-brand-primary shadow-sm' : 'text-neutral-400'}`}
                              >
                                {opt} عناصر
                              </button>
                            ))}
                          </div>
                        ) : typeof value === 'boolean' ? (
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => updateSectionContent(section.id, key, !value)}
                              className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-brand-accent' : 'bg-neutral-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'right-1' : 'right-7'}`} />
                            </button>
                            <span className="text-xs font-medium text-neutral-500">{value ? 'مفعل' : 'معطل'}</span>
                          </div>
                        ) : key === 'items_count' || key === 'posts_count' || key === 'interval' ? (
                          <input 
                            type="number" 
                            value={Number(value)} 
                            onChange={(e) => updateSectionContent(section.id, key, Number(e.target.value))}
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 text-sm rounded-xl focus:outline-none focus:border-brand-primary transition-all"
                          />
                        ) : key === 'alignment' ? (
                          <div className="flex bg-neutral-100 p-1 rounded-xl">
                            {['right', 'center', 'left'].map(opt => (
                              <button
                                key={opt}
                                onClick={() => updateSectionContent(section.id, key, opt)}
                                className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${value === opt ? 'bg-white text-brand-primary shadow-sm' : 'text-neutral-400'}`}
                              >
                                {opt === 'right' ? 'يمين' : opt === 'center' ? 'وسط' : 'يسار'}
                              </button>
                            ))}
                          </div>
                        ) : key === 'posts_count' ? (
                          <div className="space-y-2">
                            <input 
                              type="range" min="1" max="6" step="1"
                              value={Number(value)}
                              onChange={(e) => updateSectionContent(section.id, key, Number(e.target.value))}
                              className="w-full h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                            />
                            <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                              <span>1</span>
                              <span className="text-brand-primary">{value} مقالات</span>
                              <span>6</span>
                            </div>
                          </div>
                        ) : typeof value === 'boolean' ? (
                          <div 
                            onClick={() => updateSectionContent(section.id, key, !value)}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${value ? 'bg-brand-primary' : 'bg-neutral-200'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${value ? 'translate-x-0' : 'translate-x-6'}`} />
                          </div>
                        ) : (
                          <div className="relative group/input">
                            <div className="flex gap-2">
                              {key.toLowerCase().includes('color') && (
                                <input 
                                  type="color" 
                                  value={String(value).startsWith('#') ? String(value) : '#000000'} 
                                  onChange={(e) => updateSectionContent(section.id, key, e.target.value)}
                                  className="w-12 h-12 p-1 bg-white border border-neutral-200 rounded-xl cursor-pointer"
                                />
                              )}
                              <input 
                                type="text" 
                                value={String(value)} 
                                onChange={(e) => updateSectionContent(section.id, key, e.target.value)}
                                className="flex-1 bg-neutral-50 border border-neutral-200 p-3 text-sm rounded-xl focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all"
                              />
                            </div>
                            {key.toLowerCase().includes('image') && String(value).startsWith('http') && (
                              <div className="mt-3 relative h-24 w-full rounded-xl overflow-hidden border border-neutral-100 group-hover/input:border-brand-primary/30 transition-colors">
                                <img src={String(value)} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2">
                                  <span className="text-[8px] text-white font-bold uppercase">معاينة الصورة</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {Object.keys(section.content || {}).length === 0 && (
                      <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-3xl bg-neutral-50/50">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Settings size={20} className="text-neutral-200" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">لا توجد حقول قابلة للتعديل</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filteredLayout.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-300">
                  <X size={40} />
                </div>
                <p className="text-sm text-neutral-400 font-bold">لم يتم العثور على نتائج لـ "{searchTerm}"</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'store' && config.store && (
          <div className="space-y-4">
            {Object.entries(config.store).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{key}</label>
                <input 
                  type="text" 
                  value={String(value)} 
                  onChange={(e) => updateStoreInfo(key, e.target.value)}
                  className="w-full p-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-accent"
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Save size={16} className="text-indigo-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-900 mb-1">إعدادات الثيم العامة</h4>
                <p className="text-[10px] text-indigo-700 leading-relaxed">هذه الإعدادات تؤثر على المتجر بالكامل.</p>
              </div>
            </div>

            {Object.entries(config.settings || {}).map(([key, value]) => (
              <div key={key} className="space-y-3 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {getFieldLabel(key)}
                  </label>
                  <span className="text-[8px] font-bold px-2 py-1 bg-neutral-100 text-neutral-400 rounded-full uppercase">
                    {typeof value === 'object' ? 'قائمة' : 'نص'}
                  </span>
                </div>

                {key === 'nav_primary' || key === 'footer_col_1' || Array.isArray(value) ? (
                  <div className="space-y-3">
                    {(Array.isArray(value) ? value : []).map((item: any, i: number) => (
                      <div key={i} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2 relative group">
                        <button 
                          onClick={() => {
                            const newValue = [...(Array.isArray(value) ? value : [])];
                            newValue.splice(i, 1);
                            onUpdateConfig({ ...config, settings: { ...config.settings, [key]: newValue } });
                          }}
                          className="absolute -top-2 -left-2 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X size={12} />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text" value={item.name || ''} placeholder="الاسم"
                            onChange={(e) => {
                              const newValue = [...(Array.isArray(value) ? value : [])];
                              newValue[i] = { ...newValue[i], name: e.target.value };
                              onUpdateConfig({ ...config, settings: { ...config.settings, [key]: newValue } });
                            }}
                            className="w-full bg-white border-none p-2 text-[10px] rounded-lg"
                          />
                          <input 
                            type="text" value={item.href || ''} placeholder="الرابط"
                            onChange={(e) => {
                              const newValue = [...(Array.isArray(value) ? value : [])];
                              newValue[i] = { ...newValue[i], href: e.target.value };
                              onUpdateConfig({ ...config, settings: { ...config.settings, [key]: newValue } });
                            }}
                            className="w-full bg-white border-none p-2 text-[10px] rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newValue = [...(Array.isArray(value) ? value : []), { name: 'رابط جديد', href: '/' }];
                        onUpdateConfig({ ...config, settings: { ...config.settings, [key]: newValue } });
                      }}
                      className="w-full py-2 border-2 border-dashed border-neutral-200 text-[10px] font-bold uppercase text-neutral-400 hover:border-brand-primary hover:text-brand-primary rounded-xl transition-all"
                    >
                      + إضافة رابط
                    </button>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={String(value)} 
                    onChange={(e) => onUpdateConfig({ ...config, settings: { ...config.settings, [key]: e.target.value } })}
                    className="w-full bg-neutral-50 border border-neutral-200 p-3 text-sm rounded-xl focus:outline-none focus:border-brand-primary transition-all"
                  />
                )}
              </div>
            ))}

            {(!config.settings || Object.keys(config.settings).length === 0) && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-200">
                  <Save size={32} />
                </div>
                <p className="text-sm text-neutral-400 font-bold">لا توجد إعدادات عامة معرفة</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-neutral-100 bg-neutral-50">
        <p className="text-[10px] text-neutral-400 leading-relaxed">
          هذا المحاكي مخصص للتطوير فقط. التغييرات هنا لا تُحفظ بشكل دائم، بل تُستخدم لاختبار استجابة الثيم للإعدادات المختلفة.
        </p>
      </div>
    </div>
  );
};

export default SettingsSimulator;
