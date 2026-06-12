import React from 'react';

/** هيكل الصفحة أثناء التحميل — بدل السبينر ليشعر المستخدم أن الموقع فوراً موجود */
const StoreSkeleton: React.FC<{ dir?: 'rtl' | 'ltr' }> = ({ dir = 'ltr' }) => (
  <div className="min-h-screen bg-white flex flex-col" dir={dir}>
    {/* هيدر */}
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        <nav className="hidden md:flex gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
          ))}
        </nav>
        <div className="h-9 w-9 bg-slate-200 rounded-full animate-pulse" />
      </div>
    </header>

    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
      {/* بانر أعلى */}
      <div className="h-48 sm:h-64 bg-slate-100 rounded-2xl animate-pulse mb-8" />

      {/* عنوان القسم */}
      <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-4" />

      {/* شبكة منتجات (8 بطاقات) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-slate-100">
            <div className="aspect-square bg-slate-100 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
              <div className="h-5 bg-slate-200 rounded animate-pulse w-20 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </main>

    {/* فوتر */}
    <footer className="border-t border-slate-200 bg-slate-50 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </footer>
  </div>
);

export default StoreSkeleton;
