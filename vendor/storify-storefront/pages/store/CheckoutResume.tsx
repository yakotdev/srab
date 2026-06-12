import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { getAnalyticsHeaders } from '../../lib/analytics/session';
import { localizePath } from '../../lib/locale-routing';
import StoreSkeleton from '../../components/store/StoreSkeleton';

const CheckoutResume: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addToCart, language, baseLocale, t } = useStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid recovery link');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/analytics/recover/${encodeURIComponent(token)}`, {
          headers: getAnalyticsHeaders(),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (!cancelled) setError(data.error || 'Recovery link expired');
          return;
        }

        const items = Array.isArray(data.lineItems) ? data.lineItems : [];
        for (const item of items) {
          addToCart({
            id: String(item.productId || item.id || ''),
            name: String(item.name || 'Product'),
            price: Number(item.price) || 0,
            image: item.image || '',
            quantity: Number(item.quantity) || 1,
            selectedVariant: item.variantTitle ? { id: item.variantTitle, title: item.variantTitle, price: item.price } : undefined,
          } as any, Number(item.quantity) || 1);
        }

        const locale = language || baseLocale;
        navigate(localizePath('/checkout', locale));
      } catch {
        if (!cancelled) setError('Failed to restore your cart');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, addToCart, navigate, language, baseLocale]);

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-bold mb-2">{t('error') || 'Error'}</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return <StoreSkeleton dir="ltr" />;
};

export default CheckoutResume;
