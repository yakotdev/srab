import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Quote, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useThemeConfig } from '../ThemeContext';
import { interpolateTheme } from '../locales';
import {
  fetchProductReviews,
  fetchStoreReviews,
  useResolvedStoreId,
  useSectionProducts,
} from '@storify/theme';

type DisplayReview = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  avatar?: string;
  productName?: string;
  date?: string;
};

const clampRating = (value: unknown) =>
  Math.min(5, Math.max(1, Math.round(Number(value) || 5)));

const normalizeManualReviews = (items: unknown[]): DisplayReview[] =>
  items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: `manual-${index}`,
      customerName: String(item.customer_name || item.customerName || '').trim(),
      rating: clampRating(item.rating),
      comment: String(item.comment || '').trim(),
      avatar: typeof item.avatar === 'string' ? item.avatar : undefined,
      productName: String(item.product_name || item.productName || '').trim() || undefined,
    }))
    .filter((item) => item.comment || item.customerName);

const normalizeProductReview = (
  row: unknown,
  productName?: string,
): DisplayReview | null => {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const comment = String(r.comment || '').trim();
  const customerName = String(r.customerName || r.customer_name || '').trim();
  if (!comment && !customerName) return null;

  return {
    id: String(r.id || `${customerName}-${r.date || productName || 'review'}`),
    customerName,
    rating: clampRating(r.rating),
    comment,
    productName: productName || String(r.productName || r.product_name || '').trim() || undefined,
    date: typeof r.date === 'string' ? r.date : undefined,
  };
};

const mergeReviews = (lists: DisplayReview[][], max: number): DisplayReview[] => {
  const seen = new Set<string>();
  const merged: DisplayReview[] = [];

  for (const list of lists) {
    for (const review of list) {
      const key = review.id || `${review.customerName}-${review.comment.slice(0, 40)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(review);
      if (merged.length >= max) return merged;
    }
  }

  return merged;
};

const Stars: React.FC<{ rating: number; size?: number; className?: string }> = ({
  rating,
  size = 16,
  className = '',
}) => (
  <div className={`flex gap-0.5 ${className}`} aria-label={`${rating} / 5`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        size={size}
        fill={index < rating ? 'currentColor' : 'none'}
        strokeWidth={index < rating ? 0 : 1.5}
        className={index < rating ? 'text-amber-400' : 'opacity-25'}
        style={{ color: index < rating ? '#fbbf24' : 'var(--storify-text)' }}
      />
    ))}
  </div>
);

const reviewInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

const ReviewCard: React.FC<{
  review: DisplayReview;
  index: number;
  guestLabel: string;
  carouselWidth?: boolean;
}> = ({ review, index, guestLabel, carouselWidth }) => {
  const displayName = review.customerName || guestLabel;

  return (
    <motion.article
      data-review-card
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={`group flex flex-col rounded-3xl border p-7 md:p-8 transition-shadow hover:shadow-md ${
        carouselWidth ? 'shrink-0 snap-start w-[min(360px,85vw)]' : 'w-full'
      }`}
      style={{
        background: 'var(--storify-bg)',
        borderColor: 'var(--storify-border)',
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <Stars rating={review.rating} size={16} />
        {review.date && (
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-40">
            {review.date}
          </span>
        )}
      </div>

      <p
        className="flex-1 text-base md:text-[1.05rem] leading-relaxed mb-8 opacity-80"
      >
        "{review.comment}"
      </p>

      <div className="flex items-center gap-4 mt-auto">
        {review.avatar ? (
          <img
            src={review.avatar}
            alt={displayName}
            className="h-12 w-12 shrink-0 rounded-full object-cover border"
            style={{ borderColor: 'var(--storify-border)' }}
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold border"
            style={{
              background: 'color-mix(in srgb, var(--storify-bg) 95%, var(--storify-text) 5%)',
              color: 'var(--storify-text)',
              borderColor: 'var(--storify-border)',
            }}
          >
            {reviewInitials(displayName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold" style={{ color: 'var(--storify-headings)' }}>
            {displayName}
          </h3>
          {review.productName && (
            <p className="truncate text-xs font-medium opacity-50 mt-0.5">
              {review.productName}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
};

const CustomerReviewsSection: React.FC<{ section: { content?: Record<string, unknown> } }> = ({
  section,
}) => {
  const { t, isRtl, sdkReady } = useThemeConfig();
  const resolvedStoreId = useResolvedStoreId();
  const content = section?.content || {};

  const title = (content.title as string) || t('store_reviews_title_default');
  const subtitle = (content.subtitle as string) || t('store_reviews_subtitle_default');
  const source = (content.source as string) || 'combined';
  const layoutStyle = (content.layout_style as string) || 'carousel';
  const maxReviews = Math.max(1, Number(content.max_reviews) || 12);
  const productFetchLimit = 8;
  const paddingTop = (content.padding_top as string) || '80px';
  const paddingBottom = (content.padding_bottom as string) || '80px';

  const manualItems = Array.isArray(content.reviews) ? content.reviews : [];
  const manualReviews = useMemo(() => normalizeManualReviews(manualItems), [manualItems]);

  const catalogProducts = useSectionProducts({
    limit: Math.max(productFetchLimit, 12),
    preferHostPayload: true,
  });

  const [productReviews, setProductReviews] = useState<DisplayReview[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (source === 'manual') {
      setProductReviews([]);
      return;
    }

    let cancelled = false;

    const loadProductReviews = async () => {
      setLoadingProducts(true);
      try {
        const storeList = await fetchStoreReviews({ limit: maxReviews });
        const fromStore = storeList
          .map((row) => normalizeProductReview(row))
          .filter(Boolean) as DisplayReview[];

        if (fromStore.length > 0) {
          if (!cancelled) setProductReviews(fromStore.slice(0, maxReviews));
          return;
        }

        const products = catalogProducts.slice(0, productFetchLimit);
        if (products.length === 0) {
          if (!cancelled) setProductReviews([]);
          return;
        }

        const batches = await Promise.all(
          products.map(async (product) => {
            const list = await fetchProductReviews(String(product.id));
            const name = String(product.name || product.title || '').trim();
            return (Array.isArray(list) ? list : [])
              .map((row) => normalizeProductReview(row, name))
              .filter(Boolean) as DisplayReview[];
          }),
        );

        if (!cancelled) {
          setProductReviews(mergeReviews(batches, maxReviews));
        }
      } catch (err) {
        console.error('[CustomerReviewsSection] failed to load product reviews', err);
        if (!cancelled) setProductReviews([]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };

    void loadProductReviews();
    return () => {
      cancelled = true;
    };
  }, [source, maxReviews, productFetchLimit, catalogProducts, sdkReady, resolvedStoreId]);

  const reviews = useMemo(() => {
    if (source === 'manual') return manualReviews.slice(0, maxReviews);
    if (source === 'products') return productReviews.slice(0, maxReviews);
    return mergeReviews([manualReviews, productReviews], maxReviews);
  }, [source, manualReviews, productReviews, maxReviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const scroll = (direction: 'next' | 'prev') => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.querySelector('[data-review-card]') as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : container.clientWidth * 0.85;
    container.scrollBy({ left: direction === 'next' ? step : -step, behavior: 'smooth' });
  };

  const renderCard = (review: DisplayReview, index: number) => (
    <ReviewCard
      key={review.id}
      review={review}
      index={index}
      guestLabel={t('reviews_guest')}
      carouselWidth={layoutStyle === 'carousel'}
    />
  );

  const isEmpty = reviews.length === 0 && !loadingProducts;

  return (
    <section style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', paddingTop, paddingBottom }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--storify-headings)' }}>
              {title}
            </h2>
            <p className="opacity-60 text-lg">{subtitle}</p>
          </div>

          {reviews.length > 0 && (
            <div
              className="flex items-center gap-5 rounded-3xl px-6 py-5 shrink-0 shadow-sm border"
              style={{
                background: 'var(--storify-bg)',
                borderColor: 'var(--storify-border)',
              }}
            >
              <div className="text-5xl font-black leading-none" style={{ color: 'var(--storify-headings)' }}>
                {averageRating}
              </div>
              <div>
                <Stars rating={Math.round(averageRating)} size={18} />
                <p className="text-[11px] opacity-50 font-bold uppercase tracking-widest mt-2">
                  {interpolateTheme(t('reviews_based_on'), { count: reviews.length })}
                </p>
              </div>
            </div>
          )}
        </div>

        {loadingProducts && reviews.length === 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-64 rounded-[2rem] animate-pulse" style={{ background: 'var(--storify-border)' }} />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-[2.5rem] border border-dashed py-20 px-8 text-center" style={{ borderColor: 'var(--storify-border)' }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border opacity-30" style={{ borderColor: 'var(--storify-border)' }}>
              <MessageSquare size={36} />
            </div>
            <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--storify-headings)' }}>
              {t('store_reviews_empty_title')}
            </h3>
            <p className="opacity-50 max-w-md mx-auto">{t('store_reviews_empty_body')}</p>
          </div>
        ) : layoutStyle === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review, index) => renderCard(review, index))}
          </div>
        ) : layoutStyle === 'minimal' ? (
          <div className="mx-auto grid max-w-4xl gap-4">
            {reviews.map((review, index) => {
              const displayName = review.customerName || t('reviews_guest');
              return (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, x: isRtl ? 16 : -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-5 rounded-2xl border p-5 md:p-6 shadow-sm"
                  style={{
                    background: 'var(--storify-bg)',
                    borderColor: 'var(--storify-border)',
                  }}
                >
                  {review.avatar ? (
                    <img
                      src={review.avatar}
                      alt={displayName}
                      className="h-12 w-12 shrink-0 rounded-full object-cover border"
                      style={{ borderColor: 'var(--storify-border)' }}
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold border"
                      style={{
                        background: 'color-mix(in srgb, var(--storify-bg) 95%, var(--storify-text) 5%)',
                        color: 'var(--storify-text)',
                        borderColor: 'var(--storify-border)',
                      }}
                    >
                      {reviewInitials(displayName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <Stars rating={review.rating} size={14} />
                      <span className="text-sm font-bold" style={{ color: 'var(--storify-headings)' }}>
                        {displayName}
                      </span>
                      {review.productName && (
                        <span className="text-[11px] font-medium opacity-50">
                          {review.productName}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed opacity-80 text-base">"{review.comment}"</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 pt-1 px-1"
              style={{ scrollBehavior: 'smooth' }}
            >
              {reviews.map((review, index) => renderCard(review, index))}
            </div>

            {reviews.length > 1 && (
              <div className={`hidden md:flex gap-3 mt-8 ${isRtl ? 'justify-start' : 'justify-end'}`}>
                <button
                  type="button"
                  onClick={() => scroll('prev')}
                  className="w-12 h-12 rounded-full border flex items-center justify-center transition hover:opacity-80"
                  style={{ borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
                  aria-label={t('carousel_prev')}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => scroll('next')}
                  className="w-12 h-12 rounded-full border flex items-center justify-center transition hover:opacity-80"
                  style={{ borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
                  aria-label={t('carousel_next')}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerReviewsSection;
