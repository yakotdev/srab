import React from 'react';
import { ImageIcon } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';

type SectionImagePlaceholderProps = {
  label?: string;
  className?: string;
  rounded?: string;
};

const SectionImagePlaceholder: React.FC<SectionImagePlaceholderProps> = ({
  label,
  className = 'w-full h-full',
  rounded,
}) => {
  const { t } = useThemeConfig();

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 border border-dashed ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--storify-border) 22%, var(--storify-bg))',
        borderColor: 'var(--storify-border)',
        color: 'var(--storify-text)',
        borderRadius: rounded,
      }}
    >
      <ImageIcon className="w-9 h-9 opacity-30" strokeWidth={1.25} aria-hidden />
      <span className="text-xs sm:text-sm font-medium opacity-45 px-4 text-center max-w-[220px]">
        {label || t('section_image_placeholder')}
      </span>
    </div>
  );
};

export default SectionImagePlaceholder;
