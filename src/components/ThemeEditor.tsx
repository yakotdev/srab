import React, { useState } from 'react';
import { useThemeConfig } from '../ThemeContext';
import { Settings, ChevronRight, ChevronDown, Code, Eye, X, Image as ImageIcon, Type, AlignLeft, Palette, List, CheckSquare, Link as LinkIcon, Edit3 } from 'lucide-react';
import manifest from '../../theme-manifest.json';

const normalizeToken = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

const resolveSectionManifest = (section: { id?: string; type?: string }) => {
  const byId = normalizeToken(section.id);
  const byType = normalizeToken(section.type);
  const byTypeUpper = String(section.type || '').toUpperCase().replace(/-/g, '_');

  return manifest.sections.find((s: any) => {
    const sectionId = normalizeToken(s.id);
    const sectionComponent = normalizeToken(s.component);
    const sectionComponentUpper = String(s.component || '').toUpperCase();

    if (sectionId === byId) return true;
    if (sectionId === byType) return true;
    if (sectionComponent === byType) return true;
    return sectionComponentUpper === byTypeUpper;
  });
};

const ThemeEditor: React.FC = () => {
  const { layout, updateSectionContent, updateSectionEnabled, currentPage, setCurrentPage } = useThemeConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui');

  const PAGES = (manifest.pages || []).map((page: any) => ({
    id: page.id,
    name: page.id,
  }));

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-6 bottom-6 z-[100] bg-brand-primary text-white p-4 rounded-full shadow-2xl hover:bg-brand-accent transition-all flex items-center gap-2 group"
      >
        <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
        <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">إعدادات الثيم</span>
      </button>
    );
  }

  const renderField = (key: string, field: any, value: any, onChange: (val: any) => void) => {
    const label = field.label || key;
    
    switch (field.type) {
      case 'text':
      case 'link':
      case 'menu':
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              {field.type === 'link' ? <LinkIcon size={10} /> : field.type === 'menu' ? <List size={10} /> : <Type size={10} />}
              {label}
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={String(value || '')} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.type === 'menu' ? 'اختر قائمة...' : ''}
                className="w-full bg-white border border-neutral-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
              />
              {field.type === 'menu' && (
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <ChevronDown size={12} className="text-neutral-300" />
                </div>
              )}
            </div>
          </div>
        );
      case 'select':
        const options = Array.isArray(field.options) ? field.options : [];
        
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <List size={10} />
              {label}
            </label>
            <div className="relative">
              <select 
                value={String(value || '')} 
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white border border-neutral-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/20 appearance-none"
              >
                {options.map((opt: any) => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const lbl = typeof opt === 'string' ? opt : opt.label;
                  return <option key={val} value={val}>{lbl}</option>;
                })}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown size={12} className="text-neutral-300" />
              </div>
            </div>
          </div>
        );
      case 'textarea':
      case 'richtext':
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <AlignLeft size={10} />
              {label}
            </label>
            <textarea 
              value={String(value || '')} 
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              className="w-full bg-white border border-neutral-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/20 resize-none"
            />
          </div>
        );
      case 'color':
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Palette size={10} />
              {label}
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="color"
                value={String(value || '#000000')}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded-lg border border-neutral-100 shadow-sm shrink-0 cursor-pointer overflow-hidden"
              />
              <input 
                type="text" 
                value={String(value || '')} 
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 bg-white border border-neutral-100 rounded-lg px-3 py-2 text-xs font-mono uppercase"
              />
            </div>
          </div>
        );
      case 'image':
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <ImageIcon size={10} />
              {label}
            </label>
            <div className="space-y-2">
              {value && (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-neutral-100 bg-neutral-50">
                  <img src={String(value)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <input 
                type="text" 
                value={String(value || '')} 
                onChange={(e) => onChange(e.target.value)}
                placeholder="رابط الصورة..."
                className="w-full bg-white border border-neutral-100 rounded-lg px-3 py-2 text-[10px] font-mono truncate"
              />
            </div>
          </div>
        );
      case 'checkbox':
        return (
          <div key={key} className="flex items-center justify-between py-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <CheckSquare size={10} />
              {label}
            </label>
            <button 
              onClick={() => onChange(!value)}
              className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-neutral-200'} relative`}
            >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${value ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        );
      case 'repeater':
        const items = Array.isArray(value) ? value : [];
        return (
          <div key={key} className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                <List size={10} />
                {label} ({items.length})
              </label>
              <button 
                onClick={() => {
                  const newItem: Record<string, any> = {};
                  Object.entries(field.fields || {}).map(([k, f]: [string, any]) => {
                    newItem[k] = f.default || '';
                  });
                  onChange([...items, newItem]);
                }}
                className="text-[9px] font-black uppercase text-brand-primary hover:text-brand-accent"
              >
                + إضافة
              </button>
            </div>
            <div className="space-y-2 pl-2 border-l-2 border-neutral-50">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-white border border-neutral-100 rounded-xl shadow-sm relative group/item">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-black uppercase text-neutral-300">عنصر #{idx + 1}</p>
                    <button 
                      onClick={() => onChange(items.filter((_: any, i: number) => i !== idx))}
                      className="text-[9px] text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                    >
                      حذف
                    </button>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(field.fields || {}).map(([subKey, subField]) => 
                      renderField(`${key}_${idx}_${subKey}`, subField, item[subKey], (newVal) => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], [subKey]: newVal };
                        onChange(newItems);
                      })
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-[10px] text-neutral-400 italic py-2 text-center">لا توجد عناصر مضافة حالياً.</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-80 md:w-96 bg-white z-[100] shadow-2xl border-r border-neutral-100 flex flex-col animate-in slide-in-from-left duration-300">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary p-2 rounded-lg text-white">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter">محاكي الإعدادات</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Storify Editor UI</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400">
            <X size={20} />
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex bg-neutral-100 p-1 rounded-xl mb-4">
          <button 
            onClick={() => setViewMode('ui')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'ui' ? 'bg-white shadow-sm text-brand-primary' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <Edit3 size={12} />
            الواجهة
          </button>
          <button 
            onClick={() => setViewMode('json')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'json' ? 'bg-white shadow-sm text-brand-primary' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <Code size={12} />
            JSON
          </button>
        </div>

        {/* Page Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Eye size={10} />
            الصفحة الحالية
          </label>
          <div className="relative">
            <select
              value={currentPage}
              onChange={(e) => setCurrentPage(e.target.value)}
              className="w-full bg-white border border-neutral-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/20 appearance-none"
            >
              {PAGES.map(page => (
                <option key={page.id} value={page.id}>{page.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDown size={12} className="text-neutral-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/30">
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 px-2 mb-4">أقسام الصفحة</h4>
          
          {layout.map((section) => {
            const sectionManifest = resolveSectionManifest(section);
            const schema = sectionManifest?.contentSchema || {};
            
            return (
              <div 
                key={section.id} 
                className={`border rounded-2xl transition-all overflow-hidden ${
                  activeSectionId === section.id 
                    ? 'border-brand-primary ring-1 ring-brand-primary/10 shadow-md bg-white' 
                    : 'border-neutral-100 hover:border-neutral-200 bg-white/50'
                }`}
              >
                <div
                  className="w-full p-4 flex items-center justify-between text-right group"
                >
                  <div className="flex items-center gap-3 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSectionEnabled(section.id, section.enabled === false);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${section.enabled !== false ? 'bg-emerald-500 scale-125' : 'bg-neutral-300 hover:bg-neutral-400'}`} 
                    />
                    <div onClick={() => setActiveSectionId(activeSectionId === section.id ? null : section.id)} className="cursor-pointer">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                        {sectionManifest?.name || section.type || section.id}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-medium">{section.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveSectionId(activeSectionId === section.id ? null : section.id)}>
                    {activeSectionId === section.id ? <ChevronDown size={16} /> : <ChevronRight size={16} className="text-neutral-300 group-hover:text-brand-primary" />}
                  </button>
                </div>

                {activeSectionId === section.id && (
                  <div className="p-5 pt-0 border-t border-neutral-50">
                    {viewMode === 'ui' ? (
                      <div className="space-y-5 mt-4">
                        {Object.keys(schema).length > 0 ? (
                          Object.entries(schema).map(([key, field]) => 
                            renderField(key, field, (section.content as any)?.[key], (newVal) => {
                              updateSectionContent(section.id, { [key]: newVal });
                            })
                          )
                        ) : (
                          <p className="text-[10px] text-neutral-400 italic text-center py-4">لا توجد حقول قابلة للتخصيص لهذا القسم.</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <pre className="bg-brand-primary text-white/90 p-4 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed shadow-inner">
                          {JSON.stringify(section.content || {}, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 border-t border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center gap-3 text-brand-primary/40">
          <Eye size={14} />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] leading-tight">
            هذا العرض يحاكي تماماً شكل الإعدادات داخل لوحة تحكم ستوريفاي.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThemeEditor;
