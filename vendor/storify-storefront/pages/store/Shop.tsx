import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ShoppingBag, Heart } from '../../components/ui/Icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePreserveSearch } from '../../lib/usePreserveSearch';
import { useToast } from '../../context/ToastContext';
import { useProductFilters } from '../../features/products/hooks/useProductFilters';
import { isProductPurchasable } from '../../lib/productHelpers';
import { VariantPickerModal } from '../../components/store/VariantPickerModal';

const Shop: React.FC = () => {
  const { products, categories: storeCategories, addToCart, theme, formatPrice, t, wishlist, toggleWishlist } = useStore();
  const { searchQuery, setSearchQuery, filteredProducts: baseFilteredProducts } = useProductFilters({ products });
  const { addToast } = useToast();
  const navigate = useNavigate();
  const to = usePreserveSearch();
  const [searchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [variantModalProduct, setVariantModalProduct] = useState<any>(null);

  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.category)))];

  useEffect(() => {
    if (!categoryIdFromUrl) return;
    const decoded = decodeURIComponent(categoryIdFromUrl);
    if (storeCategories?.length) {
      const byId = storeCategories.find((c: { id: string; name: string }) => c.id === decoded);
      const byName = storeCategories.find((c: { id: string; name: string }) => c.name === decoded);
      const cat = byId || byName;
      if (cat?.name) setSelectedCategory(cat.name);
      else setSelectedCategory(decoded);
    } else {
      setSelectedCategory(decoded);
    }
  }, [categoryIdFromUrl, storeCategories]);
  
  // Apply category filter on top of search filter (name or id from ?category=)
  const filteredProducts = baseFilteredProducts.filter((p) => {
    if (selectedCategory === 'الكل') return true;
    if (p.category === selectedCategory) return true;
    if ((p as { categoryId?: string }).categoryId === selectedCategory) return true;
    if (p.categories && p.categories.includes(selectedCategory)) return true;
    const ids = (p as { categoryIds?: string[] }).categoryIds;
    if (Array.isArray(ids) && ids.includes(selectedCategory)) return true;
    return false;
  });

  const textPrimaryStyle = { color: theme.primaryColor };

  const handleWishlist = (e: React.MouseEvent, product: any) => {
      e.stopPropagation();
      toggleWishlist(product);
      const isAdded = !wishlist.some(p => p.id === product.id);
      addToast(isAdded ? 'Added to Wishlist' : 'Removed from Wishlist', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black text-slate-900 mb-4">{t('shop')}</h1>
        <p className="text-slate-500 max-w-2xl mx-auto mb-8">{t('shop_intro')}</p>
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
            <input 
                type="text" 
                placeholder={t('search_products')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3 px-6 rounded-full border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
            />
            <div className="absolute right-4 top-3.5 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {categories.map(cat => (
            <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition ${
                    selectedCategory === cat 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
                {cat}
            </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {filteredProducts.map(product => {
            const isWishlisted = wishlist.some(p => p.id === product.id);
            const productImage = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '');
            const hasVariants = !!(product.hasVariants && product.variants && product.variants.length > 0);
            const purchasable = isProductPurchasable(product);
            const totalStock = hasVariants && product.variants
              ? product.variants.reduce((s: number, v: any) => s + (Number(v.stock) || 0), 0)
              : Number(product.stock) || 0;
            const handleAddClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (hasVariants) setVariantModalProduct(product);
              else if (purchasable) { addToCart(product, 1); addToast(t('product_added_to_cart') || 'Added to Cart', 'success'); }
            };
            return (
                <div key={product.id} className={`group bg-white rounded-${theme.borderRadius} overflow-hidden shadow-sm hover:shadow-2xl transition duration-500 relative`}>
                    <div className="h-80 overflow-hidden bg-slate-100 relative cursor-pointer" onClick={() => navigate(to(`/product/${product.id}`))}>
                        {productImage && String(productImage).trim() !== '' ? (
                          <img src={productImage} alt={product.name} className="w-full h-full object-cover transition duration-700 transform group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-2xl" aria-hidden>{product.name?.charAt(0) || '?'}</div>
                        )}
                        
                        <button 
                            onClick={(e) => handleWishlist(e, product)}
                            className={`absolute top-4 right-4 p-2 rounded-full shadow-md z-10 transition hover:scale-110 ${isWishlisted ? 'bg-white text-red-500' : 'bg-white/80 text-slate-400 hover:text-red-500'}`}
                        >
                            <Heart className="w-5 h-5" filled={isWishlisted} />
                        </button>

                        {totalStock > 0 && totalStock < 20 && (
                            <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">{t('low_stock')}</span>
                        )}
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

      {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-slate-400">
              <p>{t('no_products_found_search')}</p>
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

export default Shop;