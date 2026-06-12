import React from 'react';
import { prepareHtmlContent } from '../../lib/htmlContent';

type TagName = keyof JSX.IntrinsicElements;

interface HtmlContentProps {
  html: string;
  tag?: TagName;
  className?: string;
  fallback?: string;
}

/**
 * Renders rich text (HTML) from theme editor or policies.
 * Decodes entities so escaped content from API still displays correctly.
 */
const HtmlContent: React.FC<HtmlContentProps> = ({
  html,
  tag: Tag = 'span',
  className,
  fallback = '',
}) => {
  const content = prepareHtmlContent(html || '') || fallback;
  if (!content) return null;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: content }} />;
};

export default HtmlContent;
