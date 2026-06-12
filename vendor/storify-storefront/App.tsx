
import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { useStore } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { StorefrontErrorBoundary } from './components/StorefrontErrorBoundary';
import { localizePath, normalizeLocale, stripLocaleFromPath } from './lib/locale-routing';

import StoreLayout from './components/store/StoreLayout';
import StoreSkeleton from './components/store/StoreSkeleton';

const StoreFront = React.lazy(() => import('./pages/store/StoreFront'));
const Checkout = React.lazy(() => import('./pages/store/Checkout'));
const CheckoutResume = React.lazy(() => import('./pages/store/CheckoutResume'));
const OrderSuccess = React.lazy(() => import('./pages/store/OrderSuccess'));
const Error404 = React.lazy(() => import('./pages/errors/Error404').then(m => ({ default: m.Error404 })));
const Error500 = React.lazy(() => import('./pages/errors/Error500').then(m => ({ default: m.Error500 })));
const Error403 = React.lazy(() => import('./pages/errors/Error403').then(m => ({ default: m.Error403 })));
const Error503 = React.lazy(() => import('./pages/errors/Error503').then(m => ({ default: m.Error503 })));

const RouteFallback = () => <StoreSkeleton dir="ltr" />;

/**
 * Layout shell: one StoreFront instance for all theme pages so ThemeDirectLoader is not
 * torn down on every route change (which caused «جاري تحميل» to stick on navigation).
 */
const StorefrontShell: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  return (
    <Suspense fallback={<RouteFallback />}>
      <StoreFront productPageProductId={id} />
    </Suspense>
  );
};

/**
 * بعد تحميل لغات المتجر: إن كان أول مقطع في المسار لغة (مثل /fr/) وليست ضمن اللغات المفعّلة
 * نعيد التوجيه إلى لغة المتجر الافتراضية (`baseLocale`). قبل التحميل نسمح بالعرض لتفادي وميض.
 * إن لم يكن المقطع بصيغة لغة (مثل /shop/) لا نفرض إعادة التوجيه هنا.
 */
const LOCALE_PATTERN = /^[a-z]{2}(-[a-z]{2})?$/i;

const LocaleLayout: React.FC = () => {
  const { locale } = useParams<{ locale: string }>();
  const { language, setLanguage, baseLocale, enabledLanguages, localizationLoaded } = useStore();
  const activeCodes = enabledLanguages.filter((item) => item.isActive !== false).map((item) => normalizeLocale(item.code));
  const nextLocale = normalizeLocale(locale || language || baseLocale);
  const isValidLocaleSegment = Boolean(locale) && LOCALE_PATTERN.test(locale ?? '');
  const hasEnforcedList = localizationLoaded && activeCodes.length > 0;
  const segmentAllowedInStore =
    !hasEnforcedList || !isValidLocaleSegment || activeCodes.includes(normalizeLocale(locale || ''));
  const canUseLocale = !localizationLoaded || segmentAllowedInStore;
  const location = useLocation();

  useEffect(() => {
    if (canUseLocale && nextLocale !== normalizeLocale(language)) {
      setLanguage(nextLocale);
    }
  }, [canUseLocale, language, nextLocale, setLanguage]);

  if (!canUseLocale) {
    return <Navigate to={`${localizePath(stripLocaleFromPath(location.pathname), baseLocale)}${location.search}`} replace />;
  }

  return <StoreLayout />;
};

const LegacyLocaleRedirect: React.FC = () => {
  const { language, baseLocale } = useStore();
  const location = useLocation();
  return <Navigate to={`${localizePath(location.pathname, language || baseLocale)}${location.search}`} replace />;
};

const AppRoutes: React.FC = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/:locale" element={<LocaleLayout />}>
        <Route element={<StorefrontShell />}>
          <Route index />
          <Route path="shop" />
          <Route path="collection" />
          <Route path="cart" />
          <Route path="wishlist" />
          <Route path="track-order" />
          <Route path="profile" />
          <Route path="policies/:slug" />
          <Route path="product/:id" />
          <Route path="about" />
          <Route path="contact" />
          <Route path="blog" />
          <Route path="lookbook" />
        </Route>
        {/* ثابتة — لا يتجاوزها الثيم */}
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout/resume/:token" element={<CheckoutResume />} />
        <Route path="order-success" element={<OrderSuccess />} />
        <Route path="404" element={<Error404 />} />
        <Route path="500" element={<Error500 />} />
        <Route path="403" element={<Error403 />} />
        <Route path="503" element={<Error503 />} />
        <Route path="*" element={<Error404 />} />
      </Route>
      <Route path="/" element={<LegacyLocaleRedirect />} />
      <Route path="/shop" element={<LegacyLocaleRedirect />} />
      <Route path="/collection" element={<LegacyLocaleRedirect />} />
      <Route path="/cart" element={<LegacyLocaleRedirect />} />
      <Route path="/wishlist" element={<LegacyLocaleRedirect />} />
      <Route path="/track-order" element={<LegacyLocaleRedirect />} />
      <Route path="/profile" element={<LegacyLocaleRedirect />} />
      <Route path="/policies/:slug" element={<LegacyLocaleRedirect />} />
      <Route path="/product/:id" element={<LegacyLocaleRedirect />} />
      <Route path="/about" element={<LegacyLocaleRedirect />} />
      <Route path="/contact" element={<LegacyLocaleRedirect />} />
      <Route path="/blog" element={<LegacyLocaleRedirect />} />
      <Route path="/lookbook" element={<LegacyLocaleRedirect />} />
      <Route path="/checkout" element={<LegacyLocaleRedirect />} />
      <Route path="/checkout/resume/:token" element={<LegacyLocaleRedirect />} />
      <Route path="/order-success" element={<LegacyLocaleRedirect />} />
      <Route path="/404" element={<LegacyLocaleRedirect />} />
      <Route path="/500" element={<LegacyLocaleRedirect />} />
      <Route path="/403" element={<LegacyLocaleRedirect />} />
      <Route path="/503" element={<LegacyLocaleRedirect />} />
      <Route path="*" element={<LegacyLocaleRedirect />} />
    </Routes>
  </Suspense>
);

const AppContent: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

const App: React.FC = () => (
  <StorefrontErrorBoundary>
    <AuthProvider>
      <StoreProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </StoreProvider>
    </AuthProvider>
  </StorefrontErrorBoundary>
);

export default App;
