import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Sparkles } from '../ui/Icons';
import { chatWithStore } from '../../services/geminiService';

const ChatAssistant: React.FC = () => {
  const { products, language, t, theme } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
      { role: 'model', text: language === 'ar' ? 'مرحباً! أنا مساعدك الذكي. هل تبحث عن شيء محدد؟' : 'Hi! I am your AI assistant. Looking for something specific?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!input.trim()) return;

      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setLoading(true);

      const response = await chatWithStore(userMsg, products, language);
      
      setMessages(prev => [...prev, { role: 'model', text: response }]);
      setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {isOpen && (
            <div className="pointer-events-auto bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl border border-slate-200 mb-4 flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold">{t('ai_generator')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-white"
                        aria-label={language === 'ar' ? 'إغلاق' : 'Close chat'}
                    >
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                             <div className="bg-white border border-slate-200 p-3 rounded-xl rounded-bl-none shadow-sm flex gap-1">
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                             </div>
                        </div>
                    )}
                    <div ref={bottomRef}></div>
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type a message...'}
                            className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !input.trim()}
                            className="bg-indigo-600 text-white p-2 rounded-lg font-bold disabled:opacity-50"
                            style={{ backgroundColor: theme.primaryColor }}
                            aria-label={language === 'ar' ? 'إرسال' : 'Send message'}
                        >
                            <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* Toggle Button */}
        {/* <button 
            onClick={() => setIsOpen(!isOpen)}
            className="pointer-events-auto w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition hover:scale-110 active:scale-95"
            style={{ backgroundColor: theme.primaryColor }}
        >
            {isOpen ? (
                <span className="text-2xl font-bold">✕</span>
            ) : (
                <Sparkles className="w-7 h-7" />
            )}
        </button> */}
    </div>
  );
};

export default ChatAssistant;