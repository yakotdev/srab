import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';

interface LoginModalProps {
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
    const { login, t, theme } = useStore();
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); // Just for UI, we don't validate in this demo

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(email && name) {
            login(name, email);
            addToast(`Welcome back, ${name}!`, 'success');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-8 animate-slide-up">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">{t('login')}</h2>
                    <p className="text-slate-500 text-sm">Access your order history and details.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{t('full_name')}</label>
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{t('email')}</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{t('password')}</label>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 mt-4"
                        style={{ backgroundColor: theme.primaryColor }}
                    >
                        {t('login')}
                    </button>
                </form>
                
                <button onClick={onClose} className="w-full mt-4 text-sm text-slate-400 font-bold hover:text-slate-600">
                    {t('cancel')}
                </button>
            </div>
        </div>
    );
};

export default LoginModal;
