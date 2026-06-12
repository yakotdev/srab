import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { usePreserveSearch } from '../../lib/usePreserveSearch';
import { ShoppingBag } from '../../components/ui/Icons';

const Profile: React.FC = () => {
  const { currentUser, orders, t, formatPrice, logout, theme } = useStore();
  const navigate = useNavigate();
  const to = usePreserveSearch();

  if (!currentUser) {
      navigate(to('/'));
      return null;
  }

  const userOrders = orders.filter(o => o.email === currentUser.email);

  return (
    <div className="max-w-6xl mx-auto px-6 py-20 animate-fade-in min-h-[60vh]">
        <div className="flex flex-col md:flex-row gap-12">
            {/* Sidebar */}
            <div className="w-full md:w-1/4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-3xl mx-auto mb-4">
                        {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="font-bold text-xl text-slate-900">{currentUser.name}</h2>
                    <p className="text-slate-500 text-sm mb-6">{currentUser.email}</p>
                    
                    <button 
                        onClick={() => { logout(); navigate(to('/')); }}
                        className="w-full py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition"
                    >
                        {t('logout')}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <h1 className="text-3xl font-black text-slate-900 mb-8">{t('order_history')}</h1>
                
                {userOrders.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-12 text-center">
                        <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium mb-4">{t('no_orders')}</p>
                        <button 
                            onClick={() => navigate(to('/shop'))}
                            className="text-indigo-600 font-bold hover:underline"
                        >
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {userOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('order_id')}</p>
                                        <p className="font-bold text-slate-900">#{order.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('date')}</p>
                                        <p className="text-sm font-bold text-slate-700">{order.date}</p>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3 mb-6">
                                        {order.lineItems?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-400 font-bold text-sm">{item.quantity}x</span>
                                                    <span className="text-slate-800 font-medium">{item.name}</span>
                                                </div>
                                                <span className="text-slate-900 font-bold">{formatPrice(item.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold 
                                            ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {t(`status_${order.status.toLowerCase()}`) || order.status}
                                        </span>
                                        <span className="text-xl font-bold" style={{color: theme.primaryColor}}>{formatPrice(order.total)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Profile;
