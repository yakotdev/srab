import React from 'react';
import { useThemeConfig } from '../ThemeContext';

export const WhatsAppPopup: React.FC = () => {
  const { settings, store, isRtl } = useThemeConfig();

  // Read settings with safe fallbacks
  const isEnabled = settings?.whatsapp_enable === 'true';
  const whatsappNumber = String(settings?.whatsapp_number || store?.phone || '').trim().replace(/\+/g, '');
  const rawMessage = String(settings?.whatsapp_message || 'مرحباً، أود الاستفسار عن المنتجات.').trim();

  if (!isEnabled || !whatsappNumber) return null;

  const handleOpenChat = () => {
    const encodedMessage = encodeURIComponent(rawMessage);
    const url = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 end-6 z-[95]" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Floating Pulse Button */}
      <div className="relative">
        {/* Pulsing ring backdrops */}
        <span className="absolute -inset-2 rounded-full bg-emerald-500/40 animate-ping opacity-60 z-0" />
        <span className="absolute -inset-3.5 rounded-full bg-emerald-400/25 animate-ping opacity-45 z-0 [animation-delay:0.3s]" />

        <button
          type="button"
          onClick={handleOpenChat}
          aria-label="Contact WhatsApp"
          className="relative z-10 w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none cursor-pointer"
        >
          {/* Official SVG WhatsApp Icon */}
          <svg className="w-8 h-8 fill-current transition-transform duration-300 group-hover:scale-105" viewBox="0 0 24 24">
            <path d="M12.031 6c-3.302 0-5.992 2.691-5.992 5.993 0 1.055.275 2.086.8 2.997l-.852 3.113 3.186-.835c.878.479 1.859.731 2.858.731 3.302 0 5.992-2.691 5.992-5.993 0-3.302-2.69-5.993-5.992-5.993zm3.507 8.468c-.144.404-.838.79-1.116.829-.279.039-.554.189-1.794-.325-1.585-.658-2.593-2.278-2.672-2.383-.079-.105-.668-.888-.668-1.693 0-.805.421-1.201.571-1.359.15-.158.33-.237.441-.237.11 0 .221.002.316.007.101.005.237-.038.371.282.144.343.493 1.202.536 1.29.043.088.072.19.014.308-.058.118-.088.19-.175.29-.087.1-.183.224-.263.303-.092.091-.189.19-.081.375.108.185.479.79.1.02.825 1.472 1.821 1.76.108.028.225.031.338-.098.113-.129.493-.574.622-.772.13-.197.26-.164.44-.099.18.066 1.139.537 1.335.635.195.099.326.148.375.231.05.083.05.48-.094.884z" />
            <path fillRule="evenodd" clipRule="evenodd" d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.762.456 3.48 1.32 5.004L2 22l5.124-1.332a9.924 9.924 0 0 0 4.877 1.336c5.524 0 10.003-4.48 10.003-10.004C22.004 6.48 17.528 2 12.004 2zM4 12.004c0-4.413 3.591-8.004 8.004-8.004 4.413 0 8.004 3.591 8.004 8.004 0 4.413-3.591 8.004-8.004 8.004a7.96 7.96 0 0 1-4.086-1.124l-.293-.174-3.037.791.805-2.937-.191-.303A7.954 7.954 0 0 1 4 12.004z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
