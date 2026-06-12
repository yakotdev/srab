import React from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, UserCheck, ShieldAlert } from '../../components/ui/Icons';

/** 403 – تصميم مستوحى من tempcode */
export const Error403: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
      <div className="relative w-32 h-32 mb-10">
        <div className="absolute inset-0 bg-blue-600/10 rounded-full animate-ping [animation-duration:3s]" />
        <div className="relative w-full h-full bg-[#0f172a] rounded-full shadow-2xl flex items-center justify-center border-4 border-white">
          <LockKeyhole className="w-12 h-12 text-white" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Security Protocol 403</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[#0f172a]">منطقة مقيدة</h1>
        <p className="text-gray-500 text-lg leading-relaxed max-w-sm mx-auto">
          عذراً، حسابك الحالي لا يمتلك الصلاحيات الكافية لدخول هذا القسم. يرجى مراجعة مدير النظام.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-3 px-6 py-4 bg-[#0f172a] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-black/10"
        >
          <UserCheck className="w-5 h-5" />
          <span>الرئيسية</span>
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all"
        >
          <span>تراجع</span>
        </button>
      </div>
      </div>
    </div>
  );
};

export default Error403;
