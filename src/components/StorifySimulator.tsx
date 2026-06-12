import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Layout, Store, Send, X, Plus, Trash2, ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';
import manifest from '../../theme-manifest.json';

const buildDefaultContent = (schema: Record<string, any> = {}) => {
  const content: Record<string, any> = {};

  Object.entries(schema).forEach(([key, field]) => {
    if (!field || field.type === 'header') return;

    if (field.type === 'repeater') {
      content[key] = Array.isArray(field.default) ? field.default : [];
      return;
    }

    if (field.default !== undefined) {
      content[key] = field.default;
      return;
    }

    if (field.type === 'checkbox') {
      content[key] = false;
      return;
    }

    content[key] = '';
  });

  return content;
};

const StorifySimulator: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const config = useThemeConfig();
  const [activeTab, setActiveTab] = useState<'layout' | 'settings' | 'store'>('layout');
  const [localLayout, setLocalLayout] = useState(config.layout);
  const [localSettings, setLocalSettings] = useState(config.settings);
  const [localStore, setLocalStore] = useState(config.store);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Sync with config if it changes externally
  useEffect(() => {
    setLocalLayout(config.layout);
    setLocalSettings(config.settings);
    setLocalStore(config.store);
  }, [config.layout, config.settings, config.store]);

  const applyChanges = () => {
    const payload = {
      layout: localLayout,
      settings: localSettings,
      store: localStore,
      storeId: 'sim-123'
    };
    
    window.postMessage({
      type: 'STORIFY_THEME_CONFIG',
      payload
    }, '*');
  };

  const updateSectionContent = (id: string, key: string, value: any) => {
    setLocalLayout(prev => prev.map(s => 
      s.id === id ? { ...s, content: { ...s.content, [key]: value } } : s
    ));
  };

  const toggleSectionEnabled = (id: string) => {
    setLocalLayout(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...localLayout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;
    
    [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
    setLocalLayout(newLayout);
  };

  const removeSection = (id: string) => {
    setLocalLayout(prev => prev.filter(s => s.id !== id));
  };

  const addSection = (type: string) => {
    const sectionDefinition = manifest.sections.find(
      (s: any) => s.id === type || s.component === type,
    );

    const newSection = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      enabled: true,
      group: sectionDefinition?.group || 'template_group',
      content: buildDefaultContent(sectionDefinition?.contentSchema || {}),
    };
    setLocalLayout(prev => [...prev, newSection]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed top-0 right-0 w-full md:w-[450px] h-full bg-white shadow-2xl z-[100] flex flex-col border-l border-slate-200"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary text-white rounded-lg">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">محاكي إعدادات ستوريفاي</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Simulator Mode v1.1</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {[
              { id: 'layout', icon: Layout, label: 'الأقسام' },
              { id: 'settings', icon: Palette, label: 'المظهر' },
              { id: 'store', icon: Store, label: 'المتجر' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${
                  activeTab === tab.id ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-accent/5' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {activeTab === 'layout' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">ترتيب الأقسام</h3>
                  <div className="relative group">
                    <button className="flex items-center gap-2 text-[10px] font-bold bg-brand-accent text-white px-3 py-1.5 rounded-full hover:bg-brand-accent/90 transition-all">
                      <Plus size={14} />
                      إضافة قسم
                    </button>
                    <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-2">
                      {['HERO', 'HERO_SLIDER', 'FEATURED_PRODUCTS', 'CATEGORIES', 'FLASH_SALE', 'TESTIMONIALS', 'IMAGE_WITH_TEXT', 'VIDEO', 'BRANDS', 'FAQ', 'NEWSLETTER'].map(type => (
                        <button 
                          key={type}
                          onClick={() => addSection(type)}
                          className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 text-slate-700"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {localLayout.map((section, index) => (
                  <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm group/section">
                    <div 
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-400"
                            disabled={index === 0}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-400"
                            disabled={index === localLayout.length - 1}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${section.enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <div>
                          <span className="font-bold text-sm text-slate-700 block">{section.type}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{section.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleSectionEnabled(section.id); }}
                          className={`text-[10px] px-2 py-1 rounded font-bold ${section.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {section.enabled ? 'مفعل' : 'معطل'}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                        {expandedSection === section.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </div>
                    
                    {expandedSection === section.id && (
                      <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4">
                        {Object.entries(section.content || {}).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{key}</label>
                            {key.toLowerCase().includes('color') ? (
                              <div className="flex gap-2">
                                <input 
                                  type="color" 
                                  value={String(value)} 
                                  onChange={(e) => updateSectionContent(section.id, key, e.target.value)}
                                  className="w-10 h-10 rounded cursor-pointer"
                                />
                                <input 
                                  type="text" 
                                  value={String(value)} 
                                  onChange={(e) => updateSectionContent(section.id, key, e.target.value)}
                                  className="flex-1 p-2 text-xs border rounded bg-white"
                                />
                              </div>
                            ) : typeof value === 'string' && value.length > 50 ? (
                              <textarea 
                                value={value}
                                onChange={(e) => updateSectionContent(section.id, key, e.target.value)}
                                className="w-full p-2 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-brand-accent h-24"
                              />
                            ) : (
                              <input 
                                type="text"
                                value={String(value)}
                                onChange={(e) => updateSectionContent(section.id, key, e.target.value)}
                                className="w-full p-2 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-brand-accent"
                              />
                            )}
                          </div>
                        ))}
                        
                        {section.type === 'FEATURED_PRODUCTS' && (
                          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">نمط العرض</label>
                            <div className="flex gap-2">
                              {['grid', 'carousel', 'masonry', 'minimal_list'].map(style => (
                                <button
                                  key={style}
                                  onClick={() => updateSectionContent(section.id, 'style', style)}
                                  className={`flex-1 py-2 text-[10px] rounded-lg border transition-all ${
                                    (section.content?.style || 'grid') === style 
                                      ? 'bg-brand-primary text-white border-brand-primary' 
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {style === 'grid' ? 'شبكة' : style === 'carousel' ? 'دوار' : style === 'masonry' ? 'موزاييك' : 'قائمة'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {section.type === 'CATEGORIES' && (
                          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">نمط العرض</label>
                            <div className="flex gap-2">
                              {['grid', 'bento', 'circles'].map(style => (
                                <button
                                  key={style}
                                  onClick={() => updateSectionContent(section.id, 'style', style)}
                                  className={`flex-1 py-2 text-[10px] rounded-lg border transition-all ${
                                    (section.content?.style || 'grid') === style 
                                      ? 'bg-brand-primary text-white border-brand-primary' 
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {style === 'grid' ? 'شبكة' : style === 'bento' ? 'بينتو' : 'دوائر'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {Object.keys(section.content || {}).length === 0 && (
                          <div className="text-center py-6 space-y-2">
                            <p className="text-xs text-slate-400 italic">لا توجد حقول قابلة للتعديل لهذا القسم</p>
                            <button 
                              onClick={() => updateSectionContent(section.id, 'title', 'عنوان جديد')}
                              className="text-[10px] text-brand-accent font-bold hover:underline"
                            >
                              + إضافة حقل تجريبي
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b pb-2">الألوان العامة</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">اللون الأساسي</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.primaryColor || '#0f172a'} 
                          onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={localSettings.primaryColor || '#0f172a'} 
                          onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                          className="flex-1 p-2 text-xs border rounded"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">اللون المميز</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={localSettings.accentColor || '#f27d26'} 
                          onChange={(e) => setLocalSettings({ ...localSettings, accentColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={localSettings.accentColor || '#f27d26'} 
                          onChange={(e) => setLocalSettings({ ...localSettings, accentColor: e.target.value })}
                          className="flex-1 p-2 text-xs border rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">نصف قطر الزوايا</label>
                      <select 
                        value={localSettings.borderRadius || '24px'}
                        onChange={(e) => setLocalSettings({ ...localSettings, borderRadius: e.target.value })}
                        className="w-full p-2 text-xs border rounded bg-white"
                      >
                        <option value="0px">حادة (0px)</option>
                        <option value="8px">صغيرة (8px)</option>
                        <option value="16px">متوسطة (16px)</option>
                        <option value="24px">كبيرة (24px)</option>
                        <option value="40px">دائرية جداً (40px)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">نوع الخط</label>
                      <select 
                        value={localSettings.fontFamily || 'Inter'}
                        onChange={(e) => setLocalSettings({ ...localSettings, fontFamily: e.target.value })}
                        className="w-full p-2 text-xs border rounded bg-white"
                      >
                        <option value="Inter">Inter (Sans)</option>
                        <option value="Playfair Display">Playfair (Serif)</option>
                        <option value="JetBrains Mono">JetBrains (Mono)</option>
                        <option value="Cairo">Cairo (Arabic)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'store' && (
              <div className="space-y-4">
                {Object.entries(localStore || {}).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{key}</label>
                    <input 
                      type="text"
                      value={String(value)}
                      onChange={(e) => setLocalStore({ ...localStore, [key]: e.target.value } as any)}
                      className="w-full p-2 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
            <button 
              onClick={applyChanges}
              className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
              <Send size={18} />
              تطبيق التغييرات (postMessage)
            </button>
            <p className="text-[9px] text-slate-400 text-center leading-relaxed">
              هذا الزر يحاكي عملية الحفظ في لوحة تحكم ستوريفاي ويرسل البيانات عبر postMessage.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StorifySimulator;
