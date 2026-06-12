import React, { useState, useEffect } from 'react';
import type { Product, ProductVariant } from '../../types';
import { getEffectiveStock, isProductPurchasable } from '../../lib/productHelpers';
import { ShoppingBag, X } from '../ui/Icons';

interface VariantPickerModalProps {
  product: Product;
  onAdd: (productWithVariant: Product, quantity: number) => void;
  onClose: () => void;
  formatPrice: (price: number) => string;
  t: (key: string) => string;
  primaryColor?: string;
}

export const VariantPickerModal: React.FC<VariantPickerModalProps> = ({
  product,
  onAdd,
  onClose,
  formatPrice,
  t,
  primaryColor = '#4f46e5',
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  const variants = product.variants && product.variants.length > 0 ? product.variants : [];
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) setSelectedVariant(variants[0]);
  }, [variants.length, selectedVariant]);

  const effectiveStock = getEffectiveStock(product, selectedVariant);
  const purchasable = isProductPurchasable(product, selectedVariant);
  const maxQty = Math.max(1, purchasable ? (effectiveStock > 0 ? effectiveStock : 999) : 1);

  const handleAdd = () => {
    if (!purchasable) return;
    const toAdd = {
      ...product,
      price: selectedVariant ? selectedVariant.price : product.price,
      selectedVariant: selectedVariant || undefined,
    };
    onAdd(toAdd, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {variants.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">{t('options_label') || 'اختر الخيار'}</label>
              <select
                className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={selectedVariant?.id ?? ''}
                onChange={e => {
                  const v = variants.find(v => v.id === e.target.value);
                  setSelectedVariant(v || null);
                  setQuantity(1);
                }}
              >
                {variants.map(v => {
                  const variantPurchasable = !product.trackQuantity || (Number(v.stock) ?? 0) > 0 || !!product.sellWhenOutOfStock;
                  return (
                    <option key={v.id} value={v.id} disabled={!variantPurchasable}>
                      {v.title} - {formatPrice(v.price)}
                      {!variantPurchasable ? ` (${t('out_of_stock') || 'نفد'})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('quantity') || 'الكمية'}</label>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={quantity}
              onChange={e => {
                const n = Math.max(1, Math.min(maxQty, Number(e.target.value) || 1));
                setQuantity(Number.isNaN(n) ? 1 : n);
              }}
              className="w-full p-3 rounded-xl border border-slate-200 text-center"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              {t('cancel_button') || 'إلغاء'}
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!purchasable}
              className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag className="w-5 h-5" />
              {!purchasable ? (t('out_of_stock') || 'نفد') : (t('add_to_cart') || 'أضف للسلة')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
