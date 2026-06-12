export const hasSectionImage = (src: unknown): src is string =>
  typeof src === 'string' && src.trim().length > 0;
