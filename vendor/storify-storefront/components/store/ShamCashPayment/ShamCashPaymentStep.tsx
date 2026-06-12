/**
 * خطوة الدفع شام كاش: عرض رقم المحفظة + QR، ثم "دفعت"، ثم رفع الإيصال.
 */
import React, { useState, useRef } from 'react';
import type { ShamCashIntentResponse } from './api';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

export function ShamCashPaymentStep({
  intent,
  formatPrice,
  total,
  language,
  onReceiptReady,
  primaryStyle,
  t,
}: {
  intent: ShamCashIntentResponse;
  formatPrice: (n: number) => string;
  total: number;
  language: string;
  onReceiptReady: (receiptBase64: string) => void;
  primaryStyle: React.CSSProperties;
  t: (key: string) => string | undefined;
}) {
  const [step, setStep] = useState<'show' | 'upload'>('show');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyId = async () => {
    const text = intent.recipientId;
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch { }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError(language === 'ar' ? 'يرجى اختيار صورة (JPG، PNG)' : 'Please choose an image (JPG, PNG)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(language === 'ar' ? 'حجم الملف كبير جداً (الحد 10 ميجا)' : 'File too large (max 10MB)');
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setReceiptPreview(dataUrl);
      onReceiptReady(dataUrl); // تحديث الحالة فوراً — زر "تأكيد الطلب" الوحيد يظهر في أسفل الصفحة
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onReceiptReady(''); // إزالة الإيصال من الحالة
  };

  const qrUrl = `${QR_API}?size=200x200&data=${encodeURIComponent(intent.qrCodeData)}`;

  if (step === 'show') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="p-4 md:p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-500 mb-2">
            {language === 'ar' ? 'المبلغ المطلوب تحويله' : 'Amount to transfer'}
          </p>
          <p className="text-3xl md:text-4xl font-black text-slate-900 mb-8" style={{ color: primaryStyle.backgroundColor }}>
            {formatPrice(total)}
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                {language === 'ar' ? 'رقم المحفظة / المستخدم' : 'Wallet / User ID'}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl font-mono text-lg font-bold text-slate-800 break-all text-center sm:text-left">
                  {intent.recipientId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-6 py-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 active:scale-95 transition-all font-bold text-sm text-slate-700 whitespace-nowrap bg-white shadow-sm"
                >
                  {copied ? (language === 'ar' ? 'تم النسخ' : 'Copied!') : (language === 'ar' ? 'نسخ' : 'Copy')}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                {language === 'ar' ? 'مسح رمز الاستجابة السريع (QR)' : 'Scan QR Code'}
              </p>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                  <img src={qrUrl} alt="QR Code" className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] block" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStep('upload')}
          className="w-full py-5 rounded-3xl text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={primaryStyle}
        >
          <span>{language === 'ar' ? 'لقد قمت بالتحويل' : "I've paid"}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 md:p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-emerald-900 font-black text-lg">
              {language === 'ar' ? 'رفع الإيصال' : 'Upload Receipt'}
            </h3>
            <p className="text-emerald-700/70 text-sm font-bold">
              {language === 'ar' ? 'قم برفع صورة إيصال التحويل للمراجعة' : 'Upload a photo of your transfer receipt'}
            </p>
          </div>
        </div>

        <div
          onClick={() => !receiptPreview && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-3xl p-8 transition-all cursor-pointer
            ${receiptPreview
              ? 'border-emerald-200 bg-white'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!receiptPreview ? (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm mx-auto flex items-center justify-center text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-slate-900 font-black">
                  {language === 'ar' ? 'اضغط هنا لاختيار الصورة' : 'Click to select image'}
                </p>
                <p className="text-slate-500 text-xs font-bold mt-1">
                  {language === 'ar' ? 'يدعم JPG, PNG (بحد أقصى 10 ميجا)' : 'Supports JPG, PNG (Max 10MB)'}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <img src={receiptPreview} alt="Receipt" className="w-full h-auto max-h-[400px] object-contain rounded-2xl mx-auto shadow-sm" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-all active:scale-90"
                title={language === 'ar' ? 'حذف' : 'Remove'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setStep('show')}
          className="px-8 py-4 rounded-2xl border-2 border-slate-200 font-black text-slate-700 hover:bg-slate-50 transition-all text-center"
        >
          {language === 'ar' ? 'رجوع' : 'Back'}
        </button>
        {receiptPreview && (
          <p className="mr-4 self-center text-emerald-600 font-bold text-sm">
            {language === 'ar' ? 'تم رفع الإيصال — اضغط "تأكيد الطلب" أدناه' : 'Receipt uploaded — click "Place order" below'}
          </p>
        )}
      </div>
    </div>
  );
}
