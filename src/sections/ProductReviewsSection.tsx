import React, { useEffect, useState, useMemo } from 'react';
import { Star, MessageSquare, User, Send, CheckCircle2, AlertCircle, Plus, X, Filter, ChevronDown } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';
import { interpolateTheme } from '../locales';
import { getStorifySDK, fetchProductReviews, submitProductReview } from '@storify/theme';
import { motion, AnimatePresence } from 'motion/react';

const RATING_FILTERS = ['all', '5', '4', '3', '2', '1'] as const;

type ReviewRow = {
  id?: string;
  customerName?: string;
  rating?: number;
  comment?: string;
  date?: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
};

const ProductReviewsSection: React.FC<{ section: { content?: Record<string, unknown> } }> = ({ section }) => {
  const { productId, sdkReady, t, isRtl } = useThemeConfig();
  const content = section?.content || {};
  const title = (content.title as string) || t('reviews_title_default');
  
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    const savedName = localStorage.getItem('storify_customer_name');
    if (savedName) {
      setFormData(prev => ({ ...prev, customerName: savedName }));
    }
  }, []);

  const fetchReviews = async () => {
    if (!productId?.trim()) return;
    
    setLoading(true);
    try {
      const list = await fetchProductReviews(productId);
      setReviews(Array.isArray(list) ? (list as ReviewRow[]) : []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, sdkReady]);

  const [filter, setFilter] = useState<(typeof RATING_FILTERS)[number]>('all');

  const filteredReviews = useMemo(() => {
    if (filter === 'all') return reviews;
    return reviews.filter((r) => Math.round(r.rating || 0) === parseInt(filter, 10));
  }, [reviews, filter]);

  const stats = useMemo(() => {
    if (reviews.length === 0) return { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
    
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const average = Math.round((sum / total) * 10) / 10;
    
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      const rating = Math.round(r.rating || 0);
      if (rating >= 1 && rating <= 5) {
        distribution[5 - rating]++;
      }
    });

    return { average, total, distribution };
  }, [reviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    if (!formData.customerName.trim()) {
      setSubmitError(t('reviews_error_name'));
      return;
    }
    if (!formData.comment.trim()) {
      setSubmitError(t('reviews_error_comment'));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitProductReview(productId, {
        customerName: formData.customerName,
        rating: formData.rating,
        comment: formData.comment
      });
      localStorage.setItem('storify_customer_name', formData.customerName);
      setSubmitSuccess(true);
      setFormData({ ...formData, comment: '' });
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowModal(false);
        fetchReviews();
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setSubmitError(t('reviews_error_submit'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!productId) {
    return null;
  }

  return (
    <section className="py-24 border-t" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Header with Title and Summary */}
        <div className="flex flex-col lg:flex-row gap-12 mb-16">
          <div className="lg:w-1/3 space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--storify-headings)' }}>{title}</h2>
              <p className="opacity-60">{t('reviews_intro')}</p>
            </div>

            <div className="rounded-[2.5rem] p-8 border shadow-sm" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
              <div className="flex items-center gap-6 mb-8">
                <div className="text-6xl font-black" style={{ color: 'var(--storify-headings)' }}>{stats.average}</div>
                <div>
                  <div className="flex gap-1 text-amber-400 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        fill={i < Math.floor(stats.average) ? "currentColor" : "none"}
                        className={i < Math.floor(stats.average) ? 'text-amber-400' : 'opacity-20'}
                        style={{ color: i < Math.floor(stats.average) ? '#fbbf24' : 'var(--storify-text)' }}
                      />
                    ))}
                  </div>
                  <p className="opacity-40 text-xs font-bold uppercase tracking-widest">
                    {interpolateTheme(t('reviews_based_on'), { count: stats.total })}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {stats.distribution.map((count, i) => {
                  const rating = 5 - i;
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <span className="text-xs font-bold opacity-40 w-4">{rating}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--storify-border)' }}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className="h-full"
                          style={{ background: '#fbbf24' }}
                        />
                      </div>
                      <span className="text-xs font-bold opacity-40 w-8 text-end">{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-6 pt-6 border-t" style={{ borderColor: 'var(--storify-border)' }}>
                <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--storify-headings)' }}>
                  {t('reviews_share_experience')}
                </h4>
                <div className="flex justify-between items-center p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, rating: star }));
                          setShowModal(true);
                        }}
                        className="opacity-20 hover:opacity-100 transition-colors hover:scale-110 active:scale-90"
                        style={{ color: 'var(--storify-text)' }}
                      >
                        <Star size={28} fill="none" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-black opacity-40">{t('reviews_tap_to_rate')}</span>
                </div>
                
                <button 
                  onClick={() => setShowModal(true)}
                  className="w-full py-4 font-bold rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: 'var(--storify-btn-primary-bg)', color: 'var(--storify-btn-primary-fg)' }}
                >
                  <Plus size={20} />
                  {t('reviews_write_detailed')}
                </button>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:w-2/3">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 rounded-[2.5rem] animate-pulse" style={{ background: 'var(--storify-border)' }} />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 rounded-[3rem] border border-dashed" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                  <MessageSquare size={40} className="opacity-20" />
                </div>
                <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--storify-headings)' }}>{t('reviews_empty_title')}</h3>
                <p className="opacity-40 text-sm max-w-xs text-center">{t('reviews_empty_body')}</p>
                <button 
                  onClick={() => setShowModal(true)}
                  className="mt-8 px-8 py-3 border-2 font-bold rounded-xl transition-all"
                  style={{ borderColor: 'var(--storify-primary)', color: 'var(--storify-primary)' }}
                >
                  {t('reviews_cta_first')}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
                  <h3 className="font-black text-xl" style={{ color: 'var(--storify-headings)' }}>
                    {interpolateTheme(t('reviews_list_heading'), { count: reviews.length })}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {RATING_FILTERS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                          filter === f 
                            ? 'shadow-lg' 
                            : 'opacity-40 hover:opacity-100'
                        }`}
                        style={{ 
                          background: filter === f ? 'var(--storify-primary)' : 'var(--storify-bg)',
                          color: filter === f ? 'white' : 'var(--storify-text)',
                          border: filter === f ? 'none' : '1px solid var(--storify-border)'
                        }}
                      >
                        {f === 'all' ? t('shop_all') : interpolateTheme(t('reviews_filter_stars'), { n: f })}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-6">
                  {filteredReviews.length === 0 ? (
                    <div className="text-center py-12 rounded-[2.5rem] border border-dashed" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                      <p className="opacity-40 font-bold">{t('reviews_no_match_filter')}</p>
                    </div>
                  ) : (
                    filteredReviews.map((r, index) => (
                      <motion.div 
                        key={r.id || `${r.customerName}-${r.date}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-[2.5rem] p-8 border transition-all group relative overflow-hidden"
                    style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center opacity-40 group-hover:opacity-100 transition-colors border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                          <User size={28} />
                        </div>
                        <div>
                          <h4 className="font-black text-lg" style={{ color: 'var(--storify-headings)' }}>
                            {r.customerName || t('reviews_guest')}
                          </h4>
                          <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
                            {r.date || t('reviews_date_recent')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 px-4 py-2 rounded-full border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < (r.rating || 0) ? "currentColor" : "none"}
                            className={i < (r.rating || 0) ? 'text-amber-400' : 'opacity-20'}
                            style={{ color: i < (r.rating || 0) ? '#fbbf24' : 'var(--storify-text)' }}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <div className="relative">
                        <MessageSquare className={`absolute ${isRtl ? '-start-2' : '-end-2'} -top-2 opacity-5 w-12 h-12 -z-10`} />
                        <p className="opacity-70 leading-relaxed text-lg ps-4 border-s-4 transition-colors" style={{ borderColor: 'var(--storify-border)' }}>
                          {r.comment}
                        </p>
                      </div>
                    )}
                  </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowModal(false)}
              className="absolute inset-0 bg-brand-primary/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden"
              style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-8 start-8 opacity-40 hover:opacity-100 transition-colors z-10"
                style={{ color: 'var(--storify-text)' }}
              >
                <X size={24} />
              </button>

              <div className="p-12">
                {submitSuccess ? (
                  <div className="text-center py-12 space-y-6">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
                      style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                    >
                      <CheckCircle2 size={48} className="text-green-500" />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black" style={{ color: 'var(--storify-headings)' }}>{t('reviews_thanks_title')}</h3>
                      <p className="opacity-60">{t('reviews_thanks_body')}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black" style={{ color: 'var(--storify-headings)' }}>{t('reviews_form_title')}</h3>
                      <p className="opacity-60">{t('reviews_form_subtitle')}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest opacity-40 px-2">{t('reviews_label_full_name')}</label>
                        <div className="relative">
                          <input 
                            type="text"
                            value={formData.customerName}
                            onChange={e => setFormData({...formData, customerName: e.target.value})}
                            className="w-full border-2 rounded-2xl py-5 px-6 font-bold focus:outline-none transition-all"
                            style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
                            placeholder={t('reviews_placeholder_name')}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest opacity-40 px-2">{t('reviews_label_product_rating')}</label>
                        <div className="flex gap-3 p-4 rounded-2xl border-2" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFormData({...formData, rating: star})}
                              className="focus:outline-none transition-transform hover:scale-110 active:scale-90"
                            >
                              <Star 
                                size={36} 
                                fill={star <= formData.rating ? "currentColor" : "none"}
                                className={star <= formData.rating ? 'text-amber-400' : 'opacity-20'} 
                                style={{ color: star <= formData.rating ? '#fbbf24' : 'var(--storify-text)' }}
                              />
                            </button>
                          ))}
                          <span className="ms-auto self-center font-black text-xl" style={{ color: '#fbbf24' }}>{formData.rating}/5</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest opacity-40 px-2">{t('reviews_label_comment')}</label>
                        <textarea 
                          value={formData.comment}
                          onChange={e => setFormData({...formData, comment: e.target.value})}
                          rows={4}
                          className="w-full border-2 rounded-2xl p-6 font-medium focus:outline-none transition-all resize-none"
                          style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
                          placeholder={t('reviews_placeholder_comment')}
                        />
                      </div>

                      <div className="flex items-center gap-3 px-2">
                        <input 
                          type="checkbox" 
                          id="remember-me" 
                          defaultChecked 
                          className="w-5 h-5 rounded-lg border-2 focus:ring-0"
                          style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}
                        />
                        <label htmlFor="remember-me" className="text-sm font-bold opacity-60 cursor-pointer">
                          {t('reviews_remember_name')}
                        </label>
                      </div>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-bold border" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <AlertCircle size={20} />
                        {submitError}
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full py-5 font-black text-lg rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl"
                      style={{ background: 'var(--storify-btn-primary-bg)', color: 'var(--storify-btn-primary-fg)' }}
                    >
                      {submitting ? (
                        <div className="w-6 h-6 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--storify-btn-primary-fg)' }} />
                      ) : (
                        <>
                          <Send size={20} />
                          {t('reviews_submit')}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </section>
  );
};

export default ProductReviewsSection;
