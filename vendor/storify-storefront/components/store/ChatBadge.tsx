import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '../../lib/api';

export function ChatBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && conversation) {
      loadMessages();
      markAsRead();
    }
  }, [isOpen, conversation]);

  useEffect(() => {
    if (isOpen) {
      // Refresh messages every 3 seconds
      const interval = setInterval(() => {
        if (conversation) {
          loadMessages();
          loadUnreadCount();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await chatApi.getUnreadCount();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadOrCreateConversation = async () => {
    if (!customerName.trim()) {
      alert('الرجاء إدخال اسمك');
      return;
    }

    try {
      // Try to find existing conversation
      try {
        const conversations = await chatApi.getConversations();
        const existing = conversations.find(
          (c: any) => c.customerName === customerName && c.customerEmail === customerEmail
        );

        if (existing) {
          setConversation(existing);
          return;
        }
      } catch (error) {
        // If no conversations found, create new one
      }

      // Create new conversation
      const data = await chatApi.createConversation({
        storeId: 'default', // You may need to get this from context
        customerName,
        customerEmail: customerEmail || undefined,
        initialMessage: 'مرحباً، أريد الاستفسار عن منتج',
      });
      
      setConversation(data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load/create conversation:', error);
    }
  };

  const loadMessages = async () => {
    if (!conversation) return;

    try {
      const data = await chatApi.getMessages(conversation.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markAsRead = async () => {
    if (!conversation) return;

    try {
      await chatApi.markAsRead(conversation.id);
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    setLoading(true);
    try {
      const message = await chatApi.sendMessage(conversation.id, {
        sender: 'customer',
        content: newMessage,
      });
      
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!conversation) {
      // Show form to enter name/email
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" dir="rtl">
      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl border border-gray-200 mb-4 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 className="font-bold">المحادثات</h3>
              <p className="text-xs text-gray-300">تواصل معنا</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          {!conversation ? (
            <div className="flex-1 p-4 flex flex-col justify-center">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الاسم</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="أدخل اسمك"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">البريد الإلكتروني (اختياري)</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={loadOrCreateConversation}
                  className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  بدء المحادثة
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-xl text-sm ${
                        msg.sender === 'customer'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50 hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Badge Button */}
      <button
        onClick={handleOpen}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition hover:scale-110 active:scale-95 relative"
        style={{ backgroundColor: '#3b82f6' }}
      >
        {isOpen ? (
          <span className="text-2xl font-bold">✕</span>
        ) : (
          <>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs flex items-center justify-center rounded-full font-bold border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
