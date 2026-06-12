import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { usePreserveSearch } from '../../lib/usePreserveSearch';
import { useToast } from '../../context/ToastContext';
import { ShoppingBag, ChevronLeft, Heart, Star } from '../../components/ui/Icons';
import { ProductVariant } from '../../types';
import { getEffectiveStock, isProductPurchasable } from '../../lib/productHelpers';
import { prepareHtmlContent } from '../../lib/htmlContent';

const isVideoUrl = (url?: string | null) => !!url && /\.(mp4|webm|ogg|mov|mkv|avi|m4v)(\?.*)?$/i.test(url);

const ProductDetails: React.FC<{ productId?: string }> = ({ productId }) => {
    const { id } = useParams<{ id: string }>();
    const activeId = productId || id;
    const { products, addToCart, theme, formatPrice, t, wishlist, toggleWishlist } = useStore();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const to = usePreserveSearch();

    const product = products.find(p => p.id === activeId);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Initialize selected variant (prefer first purchasable) and image
    useEffect(() => {
        if (product?.hasVariants && product.variants && product.variants.length > 0) {
            const canBuy = (v: { stock?: number }) => product.trackQuantity !== false ? ((Number(v.stock) ?? 0) > 0 || !!product.sellWhenOutOfStock) : true;
            const firstPurchasable = product.variants.find((v: any) => canBuy(v));
            setSelectedVariant(firstPurchasable || product.variants[0]);
        } else {
            setSelectedVariant(null);
        }
        setQuantity(1);
        const images = product?.images && product.images.length > 0 ? product.images : (product?.image ? [product.image] : []);
        setSelectedImage(images[0] || null);
    }, [product]);

    if (!product) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('product_not_found')}</h2>
                <button onClick={() => navigate(to('/shop'))} className="text-indigo-600 hover:underline">{t('return_to_shop')}</button>
            </div>
        );
    }

    const handleAddToCart = () => {
        if (!isProductPurchasable(product, selectedVariant)) return;
        const resolvedCompareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
        const resolvedCatalogPromotionId = selectedVariant?.catalogPromotionId ?? product.catalogPromotionId;
        const productToAdd = {
            ...product,
            price: selectedVariant ? selectedVariant.price : product.price,
            compareAtPrice: resolvedCompareAtPrice,
            catalogPromotionId: resolvedCatalogPromotionId,
            selectedVariant: selectedVariant || undefined
        };

        addToCart(productToAdd as any, quantity);
        addToast(t('product_added_to_cart') || `${product.name} added to cart!`, 'success');
    };

    const handleWishlist = () => {
        toggleWishlist(product);
        const inWishlist = wishlist.some(p => p.id === product.id);
        addToast(inWishlist ? 'Removed from Wishlist' : 'Added to Wishlist', 'success');
    }

    const isWishlisted = wishlist.some(p => p.id === product.id);
    const effectiveStock = getEffectiveStock(product, selectedVariant);
    const purchasable = isProductPurchasable(product, selectedVariant);
    const maxQty = purchasable ? (effectiveStock > 0 ? effectiveStock : 999) : 1;
    const currentPrice = selectedVariant ? selectedVariant.price : product.price;
    const currentCompareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
    const averageRating = product.rating ?? (
        product.reviews && product.reviews.length > 0
            ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
            : undefined
    );
    const images = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
    const allImages = Array.from(new Set([selectedVariant?.image, ...images].filter(Boolean))) as string[];
    // Keep user-selected media (image/video) as highest priority.
    const displayImage = selectedImage || selectedVariant?.image || product.image;
    const primaryStyle = { backgroundColor: theme.primaryColor, color: '#ffffff' };
    const textPrimaryStyle = { color: theme.primaryColor };

    const pd = (theme as any).productDetailsSettings;
    const gridColsMobile = pd?.gridColsMobile ?? 1;
    const gridColsDesktop = pd?.gridColsDesktop ?? 2;
    const gap = pd?.gap ?? 12;
    const gapLg = pd?.gapLg ?? 20;
    const colsMap: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };
    const mdColsMap: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' };
    const gapMap: Record<number, string> = { 4: 'gap-4', 6: 'gap-6', 8: 'gap-8', 12: 'gap-12', 16: 'gap-16', 20: 'gap-20', 24: 'gap-24' };
    const lgGapMap: Record<number, string> = { 4: 'lg:gap-4', 6: 'lg:gap-6', 8: 'lg:gap-8', 12: 'lg:gap-12', 16: 'lg:gap-16', 20: 'lg:gap-20', 24: 'lg:gap-24' };
    const gridClass = `grid ${colsMap[gridColsMobile] ?? 'grid-cols-1'} ${mdColsMap[gridColsDesktop] ?? 'md:grid-cols-2'} ${gapMap[gap] ?? 'gap-12'} ${lgGapMap[gapLg] ?? 'lg:gap-20'}`;

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition rtl:flex-row-reverse">
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" /> {t('back') || 'Back'}
            </button>

            <div className={gridClass}>
                {/* Image Gallery */}
                <div className="space-y-4">
                    <div className="bg-slate-100 rounded-3xl overflow-hidden aspect-square shadow-sm relative group">
                        {displayImage && String(displayImage).trim() !== '' ? (
                          isVideoUrl(displayImage) ? (
                            <video
                                src={displayImage}
                                className="w-full h-full object-cover bg-black"
                                controls
                                playsInline
                                preload="metadata"
                            />
                          ) : (
                            <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold" aria-hidden>{product.name?.charAt(0) || '?'}</div>
                        )}
                        <button
                            onClick={handleWishlist}
                            className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg text-slate-400 hover:text-red-500 transition hover:scale-110 z-10"
                        >
                            <Heart className={`w-6 h-6 ${isWishlisted ? "text-red-500" : ""}`} filled={isWishlisted} />
                        </button>
                    </div>
                    {allImages.length > 1 && (
                        <div className="grid grid-cols-4 gap-4">
                            {allImages.map((img, i) => (
                                <button
                                    key={`${img}-${i}`}
                                    onClick={() => setSelectedImage(img)}
                                    className={`bg-slate-50 rounded-xl aspect-square overflow-hidden cursor-pointer hover:opacity-80 transition border ${img === displayImage ? 'border-slate-900' : 'border-slate-100'}`}
                                >
                                    {img && String(img).trim() !== '' ? (
                                        isVideoUrl(img) ? (
                                            <video src={img} className="w-full h-full object-cover bg-black" muted playsInline preload="metadata" />
                                        ) : (
                                            <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                                        )
                                    ) : <div className="w-full h-full bg-slate-200" aria-hidden />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                            {product.category === 'Uncategorized' || product.category === 'UNCATEGORIZED' ? (t('uncategorized') || 'Uncategorized') : product.category}
                        </span>
                        <div className="flex items-center text-amber-400 text-sm">
                            <Star className="w-4 h-4" filled />
                            <span className="ml-1 font-bold text-slate-700">{averageRating ? averageRating.toFixed(1) : t('new') || 'New'}</span>
                            <span className="text-slate-400 font-normal ml-1">({product.reviews?.length || 0} {t('reviews') || 'reviews'})</span>
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">{product.name}</h1>

                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-3xl font-bold" style={textPrimaryStyle}>{formatPrice(currentPrice)}</span>
                        {currentCompareAtPrice && currentCompareAtPrice > currentPrice && (
                            <span className="text-xl text-slate-400 line-through">{formatPrice(currentCompareAtPrice)}</span>
                        )}
                        {effectiveStock > 0 && effectiveStock < 10 && (
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{t('only_left') || 'Only'} {effectiveStock} {t('left') || 'left'}</span>
                        )}
                    </div>

                    <div
                        className="prose prose-slate mb-10 text-slate-600 text-lg leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: prepareHtmlContent(product.description || '') }}
                    />

                    {/* Variants Selection */}
                    {product.hasVariants && product.variants && (
                        <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-sm font-bold text-slate-900 mb-2">{t('options_label')}</p>
                            <select
                                className="w-full p-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                onChange={(e) => {
                                    const v = product.variants?.find(v => v.id === e.target.value);
                                    if (v) setSelectedVariant(v);
                                }}
                                value={selectedVariant?.id}
                            >
                                {product.variants.map(v => {
                                    const vPurchasable = product.trackQuantity !== false ? ((Number(v.stock) ?? 0) > 0 || !!product.sellWhenOutOfStock) : true;
                                    return (
                                        <option key={v.id} value={v.id} disabled={!vPurchasable}>
                                            {v.title} - {formatPrice(v.price)} {v.compareAtPrice && v.compareAtPrice > v.price ? `(${formatPrice(v.compareAtPrice)})` : ''} {!vPurchasable ? `(${t('out_of_stock') || 'Out of stock'})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <div className="w-32">
                            <input
                                type="number"
                                value={quantity}
                                min={1}
                                max={maxQty}
                                onChange={(e) => {
                                    const next = Math.max(1, Math.min(maxQty, Number(e.target.value) || 1));
                                    setQuantity(Number.isNaN(next) ? 1 : next);
                                }}
                                className="w-full p-4 text-center text-lg font-bold border border-slate-200 rounded-full focus:outline-none focus:border-slate-900"
                            />
                        </div>
                        <button
                            onClick={handleAddToCart}
                            disabled={!purchasable}
                            className="flex-1 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={primaryStyle}
                        >
                            <ShoppingBag className="w-5 h-5" />
                            {!purchasable ? (t('out_of_stock') || 'Out of Stock') : (t('add_to_cart') || 'Add to Cart')}
                        </button>
                    </div>

                    {(() => {
                        const badges = Array.isArray((theme as any).productDetailsSettings?.trustBadges) && (theme as any).productDetailsSettings.trustBadges.length > 0
                            ? (theme as any).productDetailsSettings.trustBadges
                            : [
                                { id: '1', title: t('fast_delivery') || 'توصيل سريع', subtitle: t('fast_delivery_desc') || '1-3 أيام عمل' },
                                { id: '2', title: t('free_returns') || 'إرجاع مجاني', subtitle: t('free_returns_desc') || 'خلال 30 يوماً' },
                                { id: '3', title: t('secure_pay') || 'دفع آمن', subtitle: t('secure_pay_desc') || 'محمي بنسبة 100%' },
                            ];
                        if (badges.length === 0) return null;
                        return (
                            <div className={`mt-10 grid gap-4 text-center border-t border-slate-100 pt-8`} style={{ gridTemplateColumns: `repeat(${badges.length}, minmax(0, 1fr))` }}>
                                {badges.map((b: { id: string; title: string; subtitle: string }) => (
                                    <div key={b.id}>
                                        <div className="font-bold text-slate-900 mb-1">{b.title}</div>
                                        <p className="text-xs text-slate-500">{b.subtitle}</p>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;