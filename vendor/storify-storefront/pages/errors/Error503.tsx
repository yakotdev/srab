import React from 'react';
import { Sparkles, Send, Construction, Bell } from '../../components/ui/Icons';

/** 503 – تصميم مستوحى من tempcode */
export const Error503: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-3xl w-full flex flex-col items-center text-center relative">
      <div className="absolute inset-0 -z-10 opacity-[0.02] flex items-center justify-center pointer-events-none">
        <div className="w-[50rem] h-[50rem] border border-[#0f172a] rounded-full" />
        <div className="absolute w-[40rem] h-[40rem] border border-[#0f172a] rounded-full" />
        <div className="absolute w-[30rem] h-[30rem] border border-[#0f172a] rounded-full" />
      </div>

      <div className="relative mb-12">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl border border-gray-100 flex items-center justify-center animate-bounce [animation-duration:4s]">
          <Construction className="w-10 h-10 text-[#0f172a]" />
        </div>
        <div className="absolute -top-3 -left-3">
          <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-black text-[#0f172a] leading-tight">
          نحن بصدد تحسين <br /> <span className="text-gray-300">محركات الإبداع</span>
        </h1>
        <p className="text-gray-500 text-lg md:text-xl leading-relaxed">
          نعمل حالياً على صيانة دورية لضمان استقرار وسرعة الخدمة. سنعود للعمل بكفاءة أعلى خلال دقائق معدودة.
        </p>
      </div>

      <div className="mt-16 w-full max-w-md bg-white p-2 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] border border-gray-100">
        <div className="flex items-center gap-2 p-3">
          <input
            type="email"
            placeholder="أدخل بريدك الإلكتروني"
            className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-right font-medium text-[#0f172a]"
            readOnly
            aria-label="البريد الإلكتروني للإشعار"
          />
          <button type="button" className="bg-[#0f172a] text-white p-4 rounded-xl hover:bg-black transition-all group" disabled>
            <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400 flex items-center justify-center gap-2">
        <Bell className="w-3 h-3" />
        سنرسل لك تنبيهاً فور عودة الخدمة للعمل
      </p>

      <div className="mt-20 flex gap-12 text-gray-200 items-center">
        <div className="h-px w-24 bg-current" />
        <div className="text-sm font-black text-gray-400 tracking-widest uppercase">Maintenance Mode</div>
        <div className="h-px w-24 bg-current" />
      </div>
      </div>
    </div>
  );
};

export default Error503;
