import React from 'react';
import { RefreshCw, Code2, AlertTriangle } from '../../components/ui/Icons';

export const Error500: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full flex flex-col items-center">
      <div className="relative mb-12">
        <div className="absolute -inset-4 bg-red-500/5 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-28 h-28 bg-white rounded-[2.5rem] shadow-2xl border border-red-50 flex items-center justify-center rotate-6">
          <Code2 className="w-11 h-11 text-red-500" />
          <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-black text-[#0f172a]">خلل في المحرك</h1>
        <p className="text-gray-500 text-lg leading-relaxed max-w-md mx-auto">
          حدث خطأ غير متوقع. فريقنا التقني تلقى تنبيهاً. جرّب إعادة التحميل.
        </p>
      </div>
      <div className="mt-10 w-full bg-gray-50/50 border border-gray-100 rounded-3xl p-6 text-right">
        <code className="text-xs text-gray-400 font-mono block">
          [Status]: HTTP 500 Internal Server Error
        </code>
      </div>
      <div className="mt-10">
        <button type="button" onClick={() => window.location.reload()} className="px-10 py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-red-600 transition-all mx-auto">
          <RefreshCw className="w-5 h-5" />
          <span>إعادة التحميل</span>
        </button>
      </div>
      </div>
    </div>
  );
};

export default Error500;
