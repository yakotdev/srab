import React, { useState } from 'react';
import { translationsApi, Language } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface LanguageManagerProps {
  languages: Language[];
  onLanguageCreated: (language: Language) => void;
  onLanguageUpdated: (language: Language) => void;
}

export const LanguageManager: React.FC<LanguageManagerProps> = ({
  languages,
  onLanguageCreated,
  onLanguageUpdated,
}) => {
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    isActive: true,
    isDefault: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const language = await translationsApi.createLanguage(formData);
      onLanguageCreated(language);
      setShowForm(false);
      setFormData({ code: '', name: '', isActive: true, isDefault: false });
      addToast('Language created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating language:', error);
      addToast(error.message || 'Failed to create language', 'error');
    }
  };

  const handleToggleActive = async (language: Language) => {
    try {
      const updated = await translationsApi.updateLanguage(language.id, {
        isActive: !language.isActive,
      });
      onLanguageUpdated(updated);
      addToast('Language updated successfully', 'success');
    } catch (error) {
      console.error('Error updating language:', error);
      addToast('Failed to update language', 'error');
    }
  };

  const handleSetDefault = async (language: Language) => {
    try {
      const updated = await translationsApi.updateLanguage(language.id, {
        isDefault: true,
      });
      onLanguageUpdated(updated);
      
      // Update other languages to not be default
      languages.forEach(l => {
        if (l.id !== language.id && l.isDefault) {
          translationsApi.updateLanguage(l.id, { isDefault: false });
        }
      });
      
      addToast('Default language updated', 'success');
    } catch (error) {
      console.error('Error setting default language:', error);
      addToast('Failed to set default language', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Language Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Languages</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold text-sm"
          >
            {showForm ? 'Cancel' : '+ Add Language'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  placeholder="e.g., fr, es, de"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">ISO 639-1 language code</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., French, Spanish, German"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Default</span>
              </label>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold"
            >
              Create Language
            </button>
          </form>
        )}
      </div>

      {/* Languages List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">All Languages</h2>
          <p className="text-sm text-slate-500 mt-1">{languages.length} languages</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Translations</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {languages.map((lang) => (
                <tr key={lang.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{lang.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {lang.name}
                    {lang.isDefault && (
                      <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      lang.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {lang.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {lang._count?.translations || 0} translations
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(lang)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${
                          lang.isActive
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {lang.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {!lang.isDefault && (
                        <button
                          onClick={() => handleSetDefault(lang)}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-bold text-xs"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
