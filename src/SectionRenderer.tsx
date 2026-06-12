import React, { Suspense } from 'react';
import { useThemeConfig, LayoutSection } from './ThemeContext';
import {
  buildSchemeCssVariables,
  buildThemeFontCssVariables,
  resolveSchemeFromSettings,
} from '@storify/theme';

// Header/Footer always needed on first paint — keep eager.
import HeaderSection from './sections/HeaderSection';
import FooterSection from './sections/FooterSection';

const HeroSliderSection = React.lazy(() => import('./sections/HeroSliderSection'));
const FeaturedProductsSection = React.lazy(() => import('./sections/FeaturedProductsSection'));
const ImageWithTextSection = React.lazy(() => import('./sections/ImageWithTextSection'));
const MarqueeSection = React.lazy(() => import('./sections/MarqueeSection'));
const CategoriesSection = React.lazy(() => import('./sections/CategoriesSection'));
const NewsletterSection = React.lazy(() => import('./sections/NewsletterSection'));
const EmptyStateSection = React.lazy(() => import('./sections/EmptyStateSection'));
const ProductDetailsSettingsSection = React.lazy(() => import('./sections/ProductDetailsSettingsSection'));
const ShopPageSection = React.lazy(() => import('./sections/ShopPageSection'));
const AboutPageSection = React.lazy(() => import('./sections/AboutPageSection'));
const ContactPageSection = React.lazy(() => import('./sections/ContactPageSection'));
const WishlistPageSection = React.lazy(() => import('./sections/WishlistPageSection'));
const TrackOrderPageSection = React.lazy(() => import('./sections/TrackOrderPageSection'));
const ProfilePageSection = React.lazy(() => import('./sections/ProfilePageSection'));
const PolicyPageSection = React.lazy(() => import('./sections/PolicyPageSection'));
const ProductReviewsSection = React.lazy(() => import('./sections/ProductReviewsSection'));
const ProductCarouselSection = React.lazy(() => import('./sections/ProductCarouselSection'));
const SlideshowSection = React.lazy(() => import('./sections/SlideshowSection'));
const FloatingPromoSection = React.lazy(() => import('./sections/FloatingPromoSection'));
const NewsletterPopup = React.lazy(() => import('./sections/NewsletterPopup'));
const PromoPopup = React.lazy(() => import('./sections/PromoPopup'));

const SECTION_MAP: Record<string, React.LazyExoticComponent<React.FC<{ section: LayoutSection }>> | React.FC<{ section: LayoutSection }>> = {
  HEADER: HeaderSection,
  HERO_SLIDER: HeroSliderSection,
  SLIDESHOW: SlideshowSection,
  FEATURED_PRODUCTS: FeaturedProductsSection,
  IMAGE_WITH_TEXT: ImageWithTextSection,
  MARQUEE: MarqueeSection,
  PRODUCT_CAROUSEL: ProductCarouselSection,
  CATEGORIES: CategoriesSection,
  NEWSLETTER: NewsletterSection,
  EMPTY_STATE: EmptyStateSection,
  PRODUCT_DETAILS_SETTINGS: ProductDetailsSettingsSection,
  PRODUCT_REVIEWS: ProductReviewsSection,
  SHOP_PAGE: ShopPageSection,
  ABOUT_PAGE: AboutPageSection,
  CONTACT_PAGE: ContactPageSection,
  WISHLIST_PAGE: WishlistPageSection,
  TRACK_ORDER_PAGE: TrackOrderPageSection,
  PROFILE_PAGE: ProfilePageSection,
  POLICY_PAGE: PolicyPageSection,
  FLOATING_PROMO: FloatingPromoSection,
  NEWSLETTER_POPUP: NewsletterPopup,
  PROMO_POPUP: PromoPopup,
  FOOTER: FooterSection,
};

const normalizeSectionToken = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');

/** Popups/floating promos: optional add-ons (template_group) but rendered as overlays when enabled. */
const OPTIONAL_OVERLAY_TYPES = new Set(['FLOATING_PROMO', 'PROMO_POPUP', 'NEWSLETTER_POPUP']);

const resolveSectionType = (section: LayoutSection) => {
  const candidates = [
    normalizeSectionToken(section.type),
    normalizeSectionToken(section.id),
  ].filter(Boolean);
  return candidates.find((token) => SECTION_MAP[token]);
};

const isOverlaySection = (section: LayoutSection, resolvedType?: string) => {
  const type = resolvedType || resolveSectionType(section);
  return section.group === 'overlay_group' || (type ? OPTIONAL_OVERLAY_TYPES.has(type) : false);
};

const isHeaderSection = (section: LayoutSection) =>
  section.group === 'header_group' || normalizeSectionToken(section.type) === 'HEADER';

const isFooterSection = (section: LayoutSection) =>
  section.group === 'footer_group' || normalizeSectionToken(section.type) === 'FOOTER';

/** Preserve editor array order within each bucket (matches storefront host sorting). */
const sortLayoutForRender = (layout: LayoutSection[]): LayoutSection[] => {
  const withIndex = layout.map((section, idx) => ({ section, idx }));

  const header = withIndex.filter(({ section }) => isHeaderSection(section));
  const footer = withIndex.filter(({ section }) => isFooterSection(section));
  const overlay = withIndex.filter(
    ({ section }) =>
      !isHeaderSection(section) &&
      !isFooterSection(section) &&
      isOverlaySection(section),
  );
  const middle = withIndex.filter(
    ({ section }) =>
      !isHeaderSection(section) &&
      !isFooterSection(section) &&
      !isOverlaySection(section),
  );

  const byIndex = (a: { idx: number }, b: { idx: number }) => a.idx - b.idx;
  header.sort(byIndex);
  middle.sort(byIndex);
  footer.sort(byIndex);
  overlay.sort(byIndex);

  return [...header, ...middle, ...footer, ...overlay].map(({ section }) => section);
};

export const SectionRenderer: React.FC = () => {
  const { layout, settings, activeSectionId } = useThemeConfig();

  const sortedLayout = sortLayoutForRender(layout);

  const renderSection = (section: LayoutSection) => {
    if (section.enabled === false && activeSectionId !== section.id) return null;

    const candidates = [
      normalizeSectionToken(section.type),
      normalizeSectionToken(section.id),
    ].filter(Boolean);
    const resolvedType = candidates.find((token) => SECTION_MAP[token]);
    const Component = resolvedType ? SECTION_MAP[resolvedType] : undefined;

    if (!Component) {
      console.warn(`Section type "${section.type || section.id}" not found in SECTION_MAP`);
      return null;
    }

    const schemeId =
      section.content?.color_scheme ?? (section.content as { colorScheme?: string })?.colorScheme;
    const scheme = resolveSchemeFromSettings(
      (settings ?? {}) as Record<string, unknown>,
      schemeId,
    );

    const fontVars = buildThemeFontCssVariables((settings ?? {}) as Record<string, unknown>);
    const schemeVars = buildSchemeCssVariables(scheme);
    const schemeStyle = { ...schemeVars, ...fontVars };

    const isOverlay = isOverlaySection(section, resolvedType);
    const isEager = resolvedType === 'HEADER' || resolvedType === 'FOOTER';

    const inner = <Component section={{ ...section, type: resolvedType }} />;

    return (
      <div
        key={section.id}
        id={section.id}
        className={isOverlay ? 'absolute top-0 left-0 w-0 h-0 overflow-hidden' : 'storify-scheme-scope min-w-0'}
        style={isOverlay ? {} : {
          ...schemeStyle,
          fontFamily: 'var(--storify-font-body)',
          color: 'var(--storify-text)',
        }}
      >
        {isEager ? inner : <Suspense fallback={null}>{inner}</Suspense>}
      </div>
    );
  };

  const mainLayout = sortedLayout.filter((s) => !isOverlaySection(s));
  const overlayLayout = sortedLayout.filter((s) => isOverlaySection(s));

  return (
    <div className="flex flex-col min-h-screen">
      {mainLayout.map(renderSection)}
      {overlayLayout.map(renderSection)}
    </div>
  );
};
