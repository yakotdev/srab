/**
 * Payment method brand logos (Visa, Mastercard, etc.) for checkout and admin.
 * Use in place of gateway names when showing "الدفع من خلال بطاقة الائتمان".
 */

import React from 'react';

const defaultSize = { width: 40, height: 28 };

/** Visa – blue brand color */
export function VisaLogo({ className, width, height }: { className?: string; width?: number; height?: number }) {
  const w = width ?? defaultSize.width;
  const h = height ?? defaultSize.height;
  return (
    <svg className={className} width={w} height={h} viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
      <rect width="40" height="28" rx="4" fill="#1A1F71" />
      <text x="20" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">VISA</text>
    </svg>
  );
}

/** Mastercard – overlapping circles (red + orange) */
export function MastercardLogo({ className, width, height }: { className?: string; width?: number; height?: number }) {
  const w = width ?? defaultSize.width;
  const h = height ?? defaultSize.height;
  return (
    <svg className={className} width={w} height={h} viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
      <rect width="40" height="28" rx="4" fill="#fff" stroke="#E8E8E8" strokeWidth="0.5" />
      <circle cx="15" cy="14" r="9" fill="#EB001B" />
      <circle cx="25" cy="14" r="9" fill="#F79E1B" />
    </svg>
  );
}

export type CardBrand = 'visa' | 'mastercard' | string;

interface PaymentMethodLogosProps {
  brands?: CardBrand[];
  className?: string;
  size?: number;
}

/** Renders a row of card brand logos (Visa, Mastercard) */
export function PaymentMethodLogos({ brands = ['visa', 'mastercard'], className = '', size = 36 }: PaymentMethodLogosProps) {
  const h = Math.round(size * 0.7);
  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      {brands.map((b) => {
        const key = String(b).toLowerCase();
        if (key === 'visa') return <VisaLogo key={b} width={size} height={h} className="shrink-0 rounded" />;
        if (key === 'mastercard') return <MastercardLogo key={b} width={size} height={h} className="shrink-0 rounded" />;
        return null;
      })}
    </div>
  );
}
