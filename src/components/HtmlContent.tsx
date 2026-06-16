import React from 'react';
import { prepareHtmlContent } from '@storify/theme';

type TagName = keyof React.JSX.IntrinsicElements;

interface HtmlContentProps {
  html: string;
  tag?: TagName;
  className?: string;
  fallback?: string;
}

/** Matches themes/tempcode/components/store/HtmlContent.tsx */
const HtmlContent: React.FC<HtmlContentProps> = ({
  html,
  tag: Tag = 'span',
  className,
  fallback = '',
}) => {
  const content = prepareHtmlContent(html || '') || fallback;
  if (!content) return null;
  return <Tag className={className} dir="auto" dangerouslySetInnerHTML={{ __html: content }} />;
};

export default HtmlContent;
