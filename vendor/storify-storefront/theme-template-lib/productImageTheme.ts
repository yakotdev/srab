/**
 * إعدادات الثيم الموحّدة لصور المنتجات (بطاقات، صفحة المنتج، معاينة سريعة، بحث، سلة…).
 */

export function productImageAspectClass(settings: Record<string, unknown> | undefined): string {
  const raw = String(settings?.product_image_aspect ?? '4_5').trim();
  switch (raw) {
    case '1_1':
      return 'aspect-square';
    case '3_4':
      return 'aspect-[3/4]';
    case '16_9':
      return 'aspect-video';
    case '4_3':
      return 'aspect-[4/3]';
    case '4_5':
    default:
      return 'aspect-[4/5]';
  }
}

export function productImageObjectFitClass(settings: Record<string, unknown> | undefined): string {
  const fit = String(settings?.product_image_fit ?? 'cover').trim();
  return fit === 'contain' ? 'object-contain' : 'object-cover';
}
