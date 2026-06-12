import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Search } from '../../components/ui/Icons';

export const Error404: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full flex flex-col items-center text-center">
      <div className="relative w-full max-w-sm aspect-square mb-12 flex items-center justify-center">
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-2 opacity-[0.03]">
          {[...Array(36)].map((_, i) => (
            <div key={i} className="border border-[#0f172a] rounded-sm" />
          ))}
        </div>
        <div className="relative scale-150">
          <div className="text-[10rem] font-black text-[#0f172a] opacity-[0.04] leading-none select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
              <Search className="w-12 h-12 text-[#0f172a]" />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-6 max-w-lg">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 text-gray-400 rounded-full text-xs font-bold border border-gray-100 uppercase tracking-widest">
          Page Not Found
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[#0f172a] leading-tight">
          عذراً، هذه الصفحة غير موجودة
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          يبدو أن الرابط غير صحيح أو أن الصفحة تم نقلها. يمكنك العودة أو الذهاب للرئيسية.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-md">
        <Link to="/" className="flex-1 px-8 py-4 bg-[#0f172a] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all">
          <Home className="w-5 h-5" />
          <span>الرئيسية</span>
        </Link>
        <button type="button" onClick={() => window.history.back()} className="flex-1 px-8 py-4 bg-white text-[#0f172a] border border-gray-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all">
          <span>رجوع</span>
          <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>
      </div>
      </div>
    </div>
  );
};

export default Error404;
