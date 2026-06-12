import React, { useState, useEffect } from 'react';
import { translationsApi, Language, TranslationKey, Translation } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface TranslationManagerProps {
  languages: Language[];
  keys: TranslationKey[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  onRefresh: () => void;
}

export const TranslationManager: React.FC<TranslationManagerProps> = ({
  languages,
  keys,
  selectedLanguage,
  onLanguageChange,
  onRefresh,
}) => {
  const { addToast } = useToast();
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const categories = Array.from(new Set(keys.map(k => k.category || 'common')));

  useEffect(() => {
    loadTranslations();
  }, [selectedLanguage]);

  const loadTranslations = async () => {
    try {
      setLoading(true);
      const response = await translationsApi.getByLanguage(selectedLanguage);
      
      // Load full translation objects for editing
      const allTranslations = await translationsApi.getAll({ language: selectedLanguage });
      const translationsMap: Record<string, Translation> = {};
      // Filter out admin translations - only show storefront translations
      allTranslations.forEach(t => {
        if (t.key && 
            t.key.category !== 'admin' && 
            !t.key.key.startsWith('admin_') &&
            !t.key.key.includes('_admin')) {
          translationsMap[t.key.key] = t;
        }
      });
      setTranslations(translationsMap);
    } catch (error) {
      console.error('Error loading translations:', error);
      addToast('Failed to load translations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (key: string) => {
    const translation = translations[key];
    setEditingKey(key);
    setEditingValue(translation?.value || '');
  };

  const handleSave = async (key: string) => {
    try {
      const translation = translations[key];
      if (translation) {
        await translationsApi.updateTranslation(translation.id, editingValue);
      } else {
        // Create new translation
        const translationKey = keys.find(k => k.key === key);
        if (translationKey) {
          await translationsApi.createTranslation({
            key,
            languageCode: selectedLanguage,
            value: editingValue,
          });
        }
      }
      
      await loadTranslations();
      setEditingKey(null);
      addToast('Translation saved successfully', 'success');
      onRefresh();
    } catch (error) {
      console.error('Error saving translation:', error);
      addToast('Failed to save translation', 'error');
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const filteredKeys = keys.filter(key => {
    const matchesSearch = key.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (translations[key.key]?.value || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || key.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedLang = languages.find(l => l.code === selectedLanguage);

  return (
    <div className="space-y-6">
      {/* Language Selector and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
            >
              {languages.filter(l => l.isActive).map(lang => (
                <option key={lang.id} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keys or values..."
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Translations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Translations for {selectedLang?.name} ({selectedLang?.code})
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {filteredKeys.length} keys found
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading translations...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Key</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Translation</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredKeys.map((key) => {
                  const translation = translations[key.key];
                  const isEditing = editingKey === key.key;

                  return (
                    <tr key={key.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{key.key}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                          {key.category || 'common'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {isEditing ? (
                          <textarea
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            rows={2}
                          />
                        ) : (
                          <span className={translation ? 'text-slate-900' : 'text-slate-400 italic'}>
                            {translation?.value || 'Not translated'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(key.key)}
                              className="px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(key.key)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold"
                          >
                            {translation ? 'Edit' : 'Add'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
