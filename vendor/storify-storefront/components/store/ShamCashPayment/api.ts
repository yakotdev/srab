/**
 * استدعاءات شام كاش — إنشاء نية دفع (معرف المحفظة + QR لمرة واحدة).
 */
import { fetchApi } from '../../../lib/api';

export interface ShamCashIntentResponse {
  intentId: string;
  recipientId: string;
  qrCodeData: string;
}

export function shamCashCreateIntent(
  amount: number,
  currency: string,
  sessionKey?: string | null
): Promise<ShamCashIntentResponse> {
  const body: { amount: number; currency: string; sessionKey?: string } = {
    amount,
    currency: currency || 'ILS',
  };
  if (sessionKey && sessionKey.trim()) body.sessionKey = sessionKey.trim();
  return fetchApi<ShamCashIntentResponse>('/checkout/shamcash-create-intent', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
