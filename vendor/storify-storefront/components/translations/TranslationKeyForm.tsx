import React, { useState } from 'react';
import { translationsApi, TranslationKey } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface TranslationKeyFormProps {
  onKeyCreated: (key: TranslationKey) => void;
}

export const TranslationKeyForm: React.FC<TranslationKeyFormProps> = ({ onKeyCreated }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    key: '',
    description: '',
    category: 'common',
  });

  const categories = ['common', 'admin', 'products', 'orders', 'themes', 'shipping', 'payments'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const translationKey = await translationsApi.createKey(formData);
      onKeyCreated(translationKey);
      setFormData({ key: '', description: '', category: 'common' });
      addToast('Translation key created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating translation key:', error);
      addToast(error.message || 'Failed to create translation key', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Key</label>
        <input
          type="text"
          value={formData.key}
          onChange={(e) => setFormData({ ...formData, key: e.target.value })}
          placeholder="e.g., welcome_message, product_title"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
          required
        />
        <p className="text-xs text-slate-400 mt-1">Use lowercase with underscores (snake_case)</p>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of what this key is for"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold"
      >
        Create Translation Key
      </button>
    </form>
  );
};
