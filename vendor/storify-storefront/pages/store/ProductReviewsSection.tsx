import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Star } from '../../components/ui/Icons';

interface ProductReviewsSectionProps {
  productId: string | undefined;
  title?: string;
}

const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ productId, title }) => {
  const { theme, t, addReview } = useStore();
  const { addToast } = useToast();
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');

  useEffect(() => {
    if (productId) {
      setLoadingReviews(true);
      import('../../lib/api').then(({ reviewsApi }) => {
        reviewsApi.getAll({ productId })
          .then(reviews => {
            const approvedReviews = reviews.filter((r: any) => r.status === 'Approved');
            setProductReviews(approvedReviews);
            setLoadingReviews(false);
          })
          .catch(() => setLoadingReviews(false));
      });
    }
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !reviewerName || !comment) return;
    try {
      await addReview(productId, {
        productId,
        customerName: reviewerName,
        rating,
        comment
      });
      setComment('');
      setReviewerName('');
      setRating(5);
      addToast(t('review_submitted_successfully') || 'Review submitted successfully!', 'success');
      const { reviewsApi } = await import('../../lib/api');
      const allReviews = await reviewsApi.getAll({ productId });
      setProductReviews(allReviews.filter((r: any) => r.status === 'Approved'));
    } catch (error) {
      console.error('Error submitting review:', error);
      addToast(t('failed_to_submit_review') || 'Failed to submit review. Please try again.', 'error');
    }
  };

  const primaryStyle = { backgroundColor: theme.primaryColor, color: '#ffffff' };

  if (!productId) return null;

  return (
    <section className="w-full border-t border-slate-200 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-10">{title ?? (t('reviews') || 'التقييمات')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
          {loadingReviews ? (
            <p className="text-slate-500 italic">{t('loading') || 'Loading reviews...'}</p>
          ) : productReviews.length > 0 ? (
            productReviews.map((review: any, idx: number) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{review.customerName}</h4>
                    <p className="text-xs text-slate-500">{review.date}</p>
                  </div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4" filled={i < review.rating} />
                    ))}
                  </div>
                </div>
                <p className="text-slate-600">{review.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 italic">{t('no_reviews_yet') || 'لا توجد تقييمات بعد.'}</p>
          )}
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h3 className="text-xl font-bold text-slate-900 mb-6">{t('add_review') || 'أضف تقييمك'}</h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('rating') || 'التقييم'}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-8 h-8 ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`}
                  >
                    <Star className="w-8 h-8" filled />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('name') || 'الاسم'}</label>
              <input
                required
                type="text"
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder={t('name_placeholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('comment') || 'التعليق'}</label>
              <textarea
                required
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none h-32"
                placeholder={t('tell_us_think')}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition"
              style={primaryStyle}
            >
              {t('submit_review') || 'إرسال التقييم'}
            </button>
          </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductReviewsSection;
