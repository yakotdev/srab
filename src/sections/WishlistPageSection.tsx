import React from 'react';
import { Heart } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { navigateStorefront } from '@storify/theme';
import { useThemeConfig } from '../ThemeContext';

/** Matches themes/tempcode/pages/store/Wishlist.tsx */
const WishlistPageSection: React.FC<{ section: { content?: Record<string, unknown> } }> = () => {
  const { wishlist: ctxWishlist, onAddToCart, onToggleWishlist, t } = useThemeConfig();
  const wishlist = ctxWishlist ?? [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 min-h-[50vh]" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--storify-headings)' }}>{t('wishlist_title')}</h1>
        <p className="opacity-60">{t('wishlist_subtitle')}</p>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
            <Heart className="w-8 h-8 opacity-20" strokeWidth={2} style={{ color: 'var(--storify-text)' }} />
          </div>
          <p className="text-xl font-bold mb-4" style={{ color: 'var(--storify-headings)' }}>{t('wishlist_empty')}</p>
          <button
            type="button"
            onClick={() => navigateStorefront('/shop')}
            className="font-bold hover:underline"
            style={{ color: 'var(--storify-primary)' }}
          >
            {t('wishlist_continue_shopping')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {wishlist.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart || (() => {})}
              onToggleWishlist={onToggleWishlist || (() => {})}
              isWishlisted
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPageSection;
