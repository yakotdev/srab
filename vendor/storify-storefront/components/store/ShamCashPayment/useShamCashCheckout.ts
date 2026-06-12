/**
 * حالة وخطوة شام كاش في الـ Checkout: إنشاء intent (مرة واحدة ومخزّن)، حفظ الإيصال، وإرسال الطلب.
 * sessionKey ثابت لجلسة الدفع لاسترجاع نفس الـ QR من الخادم بدل إنشاء واحد جديد عند كل طلب.
 */
import { useState, useEffect, useRef } from 'react';
import { shamCashCreateIntent, type ShamCashIntentResponse } from './api';

export const SHAMCASH_APP_KEY = 'shamcash';

function generateSessionKey(): string {
  return `sham_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function useShamCashCheckout(options: {
  storeConfig: { payment?: { methods?: Array<{ id: string }> }; currency?: string };
  paymentMethod: string;
  step: number;
  total: number;
}) {
  const { storeConfig, paymentMethod, step, total } = options;
  const [intent, setIntent] = useState<ShamCashIntentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  const isShamCash = paymentMethod === SHAMCASH_APP_KEY;

  useEffect(() => {
    if (!isShamCash || step !== 3 || !Number.isFinite(total) || total <= 0) {
      setIntent(null);
      setErrorMessage(null);
      return;
    }
    if (!sessionKeyRef.current) sessionKeyRef.current = generateSessionKey();
    const sessionKey = sessionKeyRef.current;
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    shamCashCreateIntent(total, storeConfig.currency || 'ILS', sessionKey)
      .then((data) => {
        if (!cancelled) {
          setIntent(data);
          setErrorMessage(null);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setIntent(null);
          const msg = err?.message || err?.error || (typeof err === 'string' ? err : null);
          setErrorMessage(msg || 'Failed to load Sham Cash');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isShamCash, step, total, storeConfig.currency]);

  const showShamCashForm = isShamCash;
  const hasIntent = !!intent;
  const canSubmit = hasIntent && !!receiptBase64;

  const setReceipt = (base64: string) => setReceiptBase64(base64);
  const clearShamCash = () => {
    sessionKeyRef.current = null;
    setIntent(null);
    setErrorMessage(null);
    setReceiptBase64(null);
  };

  return {
    showShamCashForm,
    hasIntent,
    intent,
    loading,
    errorMessage,
    canSubmit,
    receiptBase64,
    setReceipt,
    clearShamCash,
  };
}
