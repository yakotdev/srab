import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ShoppingBag, Heart, Trash } from '../../components/ui/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { usePreserveSearch } from '../../lib/usePreserveSearch';
import { useToast } from '../../context/ToastContext';
import { isProductPurchasable } from '../../lib/productHelpers';
import { VariantPickerModal } from '../../components/store/VariantPickerModal';

const Wishlist: React.FC = () => {
  const { wishlist, addToCart, toggleWishlist, theme, formatPrice, t } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const to = usePreserveSearch();
  const [variantModalProduct, setVariantModalProduct] = useState<any>(null);

  const textPrimaryStyle = { color: theme.primaryColor };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black text-slate-900 mb-4">{t('wishlist')}</h1>
        <p className="text-slate-500">{t('wishlist_desc')}</p>
      </div>

      {wishlist.length === 0 ? (
          <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-xl font-bold text-slate-800 mb-4">{t('empty_wishlist')}</p>
              <Link to={to('/shop')} className="text-indigo-600 font-bold hover:underline">{t('continue_shopping')}</Link>
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {wishlist.map(product => {
              const productImage = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '');
              const hasVariants = !!(product.hasVariants && product.variants && product.variants.length > 0);
              const purchasable = isProductPurchasable(product);
              const handleAddClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (hasVariants) setVariantModalProduct(product);
                else if (purchasable) { addToCart(product, 1); addToast(t('product_added_to_cart') || 'Added to Cart', 'success'); }
              };
              return (
            <div key={product.id} className={`group bg-white rounded-${theme.borderRadius} overflow-hidden shadow-sm hover:shadow-2xl transition duration-500`}>
                <div className="h-80 overflow-hidden bg-slate-100 relative cursor-pointer" onClick={() => navigate(to(`/product/${product.id}`))}>
                    {productImage && String(productImage).trim() !== '' ? (
                      <img src={productImage} alt={product.name} className="w-full h-full object-cover transition duration-700 transform group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-2xl" aria-hidden>{product.name?.charAt(0) || '?'}</div>
                    )}
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(product); addToast('Removed from Wishlist', 'info'); }}
                        className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg text-red-500 hover:bg-slate-100 transition"
                    >
                        <Trash className="w-5 h-5" />
                    </button>
                    {!purchasable && !hasVariants && (
                        <span className="absolute top-4 left-4 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">{t('out_of_stock')}</span>
                    )}
                    <button 
                    onClick={handleAddClick}
                    disabled={!hasVariants && !purchasable}
                    className="absolute bottom-4 right-4 bg-white text-slate-900 p-3 rounded-full shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300 hover:bg-slate-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    <ShoppingBag className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-xs font-bold uppercase opacity-40 mb-2 tracking-widest">{product.category}</p>
                    <Link to={to(`/product/${product.id}`)} className="block font-bold text-xl text-slate-900 mb-2 truncate hover:text-indigo-600 transition">{product.name}</Link>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <span className="font-bold text-lg" style={textPrimaryStyle}>{formatPrice(product.price)}</span>
                        {product.compareAtPrice != null && Number(product.compareAtPrice) > Number(product.price) && (
                            <span className="text-sm text-slate-400 line-through">{formatPrice(Number(product.compareAtPrice))}</span>
                        )}
                    </div>
                </div>
            </div>
            );
            })}
          </div>
      )}

      {variantModalProduct && (
        <VariantPickerModal
          product={variantModalProduct}
          onAdd={(p, qty) => { addToCart(p, qty); addToast(t('product_added_to_cart') || 'Added to Cart', 'success'); }}
          onClose={() => setVariantModalProduct(null)}
          formatPrice={formatPrice}
          t={t}
          primaryColor={theme.primaryColor}
        />
      )}
    </div>
  );
};

export default Wishlist;