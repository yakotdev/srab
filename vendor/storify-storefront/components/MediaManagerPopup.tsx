/**
 * Media Manager Popup Component
 * Unified entry point for all file/image selection
 * Replaces direct file inputs throughout the application
 * Design matches temp-code/FileSelectorModal
 */

import '@fortawesome/fontawesome-free/css/all.min.css';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFileUpload } from '../lib/useFileUpload';
import { storageApi } from '../lib/api';

export interface MediaItem {
  id: string;
  name: string;
  type: string;
  size?: string;
  url: string;
  uploadedAt?: Date;
}

interface MediaManagerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  accept?: 'image' | 'file' | 'video' | 'all';
  multiple?: boolean;
}

type ActiveTab = 'all' | 'recent';

// Store items outside component to persist across popup opens/closes
let persistentItems: MediaItem[] = [];

const MediaManagerPopup: React.FC<MediaManagerPopupProps> = ({
  isOpen,
  onClose,
  onSelect,
  accept = 'all',
  multiple = false,
}) => {
  const [items, setItems] = useState<MediaItem[]>(persistentItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [filters, setFilters] = useState({
    search: '',
    fileType: 'All',
    sort: 'Newest'
  });
  const { uploadFile, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load files from API when popup opens
  useEffect(() => {
    if (isOpen) {
      loadFilesFromAPI();
    }
  }, [isOpen, accept]);

  const loadFilesFromAPI = async () => {
    setIsLoading(true);
    try {
      // Determine type filter based on accept prop
      const typeFilter = accept === 'all' ? undefined : accept;
      
      const files = await storageApi.list(typeFilter);
      
      // Convert API response to MediaItem format
      const mediaItems: MediaItem[] = files.map((file) => {
        // Determine file type from extension or MIME type
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        let fileType = 'FILE';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
          fileType = 'IMAGE';
        } else if (['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
          fileType = 'VIDEO';
        }

        return {
          id: file.path,
          name: file.name,
          type: fileType,
          size: `${(file.size / 1024).toFixed(0)} KB`,
          url: file.url,
          uploadedAt: new Date(file.uploadedAt),
        };
      });

      // Merge with persistent items (uploaded in current session)
      const allItems = [...mediaItems, ...persistentItems];
      
      // Remove duplicates based on ID
      const uniqueItems = Array.from(
        new Map(allItems.map(item => [item.id, item])).values()
      );

      // Update persistent items and state
      persistentItems = uniqueItems;
      setItems(uniqueItems);
      setSelectedIds(new Set());
      
      console.log('📥 Loaded', files.length, 'files from API');
    } catch (error) {
      console.error('❌ Failed to load files from API:', error);
      // Fallback to persistent items only
      setItems([...persistentItems]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items based on search, accept type, and active tab
  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      if (!item.url) {
        console.warn('⚠️ Item missing URL:', item);
        return false;
      }
      const matchesSearch = item.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'recent' ? (item.uploadedAt && new Date().getTime() - item.uploadedAt.getTime() < 7 * 24 * 60 * 60 * 1000) : true;
      
      const matchesType = 
        accept === 'all' ? true :
        accept === 'image' ? item.type.toLowerCase().includes('image') || item.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) :
        accept === 'video' ? item.type.toLowerCase().includes('video') || item.url.match(/\.(mp4|webm|ogg)/i) :
        true;
      
      return matchesSearch && matchesTab && matchesType;
    });
    console.log('🔍 Filtered items:', filtered.length, 'from', items.length, 'total');
    return filtered;
  }, [items, filters.search, activeTab, accept]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        console.log('❌ Deselected:', id);
      } else {
        if (!multiple) {
          next.clear();
        }
        next.add(id);
        console.log('✅ Selected:', id, 'Total selected:', next.size);
      }
      return next;
    });
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      // Determine file type
      let fileType: 'image' | 'file' | 'video' = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';

      // Check accept filter
      if (accept !== 'all') {
        if (accept === 'image' && fileType !== 'image') return null;
        if (accept === 'video' && fileType !== 'video') return null;
        if (accept === 'file' && (fileType === 'image' || fileType === 'video')) return null;
      }

      const result = await uploadFile(file, fileType);
      if (result && result.url) {
        const newItem: MediaItem = {
          id: result.path || result.url, // Use path or URL as ID
          name: file.name,
          type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
          size: `${(file.size / 1024).toFixed(0)} KB`,
          url: result.url, // Ensure URL is set
          uploadedAt: new Date(),
        };
        console.log('✅ Uploaded item:', newItem); // Debug log
        return newItem;
      }
      console.error('❌ Upload failed for file:', file.name, result);
      return null;
    });

    const uploadedItems = (await Promise.all(uploadPromises))
      .filter((item): item is MediaItem => item !== null);
    
    if (uploadedItems.length > 0) {
      console.log('📦 Adding items to state:', uploadedItems);
      
      // Update persistent storage
      persistentItems = [...uploadedItems, ...persistentItems];
      
      // Update state
      setItems([...persistentItems]);
      
      // Auto-select uploaded items
      setSelectedIds(prev => {
        const next = new Set(prev);
        uploadedItems.forEach(item => {
          next.add(item.id);
        });
        console.log('✅ Selected IDs:', Array.from(next));
        return next;
      });
    } else {
      console.warn('⚠️ No items uploaded');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      if (multiple) {
        selectedItems.forEach(item => onSelect(item.url));
      } else {
        onSelect(selectedItems[0].url);
      }
      onClose();
    }
  };

  const getAcceptString = () => {
    switch (accept) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'file':
        return '';
      default:
        return 'image/*,video/*';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" dir="rtl">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Hidden Input for uploads */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple={multiple}
          accept={getAcceptString()}
          onChange={(e) => handleUpload(e.target.files)}
        />

        {/* Header - Centered Style based on temp-code design */}
        <header className="px-6 pt-8 pb-2 flex flex-col items-center relative">
          <button 
            onClick={onClose} 
            className="absolute left-6 top-8 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>

          <div className="flex flex-col items-center gap-2 mb-6">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <i className="fa-solid fa-vault text-white text-base"></i>
                </div>
                <h1 className="font-bold text-slate-800 text-2xl tracking-tight">خزنة الوسائط</h1>
             </div>
          </div>

          {/* Search Bar - Full width under title */}
          <div className="w-full max-w-xl relative mb-6">
            <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="البحث عن الملفات والمجلدات..."
              className="w-full pr-11 pl-4 py-3.5 bg-slate-100/60 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm outline-none text-right"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          {/* Navigation - Pill styles based on temp-code design */}
          <nav className="flex items-center justify-center gap-4 py-2 w-full border-b border-slate-50">
            <TabItem 
              icon="fa-grip" 
              label="كل المكتبة" 
              active={activeTab === 'all'} 
              onClick={() => setActiveTab('all')} 
            />
            <TabItem 
              icon="fa-clock" 
              label="الأخيرة" 
              active={activeTab === 'recent'} 
              onClick={() => setActiveTab('recent')} 
            />
          </nav>
        </header>

        {/* Content Area */}
        <main className="flex-grow overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-white">
          
          {/* UPLOAD SECTION - Dashed Area */}
          <div className="mb-10 border-2 border-dashed border-slate-200 rounded-[32px] p-10 flex flex-col items-center justify-center bg-slate-50/40 hover:bg-slate-50 transition-all group">
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
              <button 
                onClick={triggerUpload}
                disabled={isUploading}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-slate-200 shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all active:scale-95 mb-4 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <i className="fa-solid fa-cloud-arrow-up text-indigo-500 text-lg"></i>
                {isUploading ? 'جاري الرفع...' : 'إضافة وسائط'}
              </button>
              <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed">
                يمكنك رفع الصور هنا عن طريق السحب والإفلات أو النقر للرفع من جهازك
              </p>
            </div>
          </div>

          {/* Grid Area */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm">جاري تحميل الملفات...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 pb-32">
              {filteredItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => handleToggleSelect(item.id)}
                className={`group relative aspect-square rounded-[24px] sm:rounded-[32px] cursor-pointer overflow-hidden transition-all duration-300 shadow-sm hover:shadow-lg sm:hover:shadow-xl sm:hover:-translate-y-1 ${selectedIds.has(item.id) ? 'ring-4 ring-indigo-500 ring-offset-4' : 'ring-1 ring-slate-100'}`}
              >
                <img 
                  src={item.url} 
                  alt={item.name} 
                  className="w-full h-full object-cover transform sm:group-hover:scale-110 transition-transform duration-700" 
                  loading="lazy"
                  onError={(e) => {
                    // Fallback for non-image files or broken URLs
                    const target = e.target as HTMLImageElement;
                    console.error('❌ Image failed to load:', item.url, item);
                    if (!target.src.includes('data:image/svg')) {
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="12"%3EFile%3C/text%3E%3C/svg%3E';
                    }
                  }}
                  onLoad={() => {
                    // Image loaded successfully
                    console.log('✅ Image loaded successfully:', item.url);
                  }}
                />
                
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 ${selectedIds.has(item.id) ? 'opacity-100' : ''}`}>
                  <p className="text-white text-xs font-bold truncate text-right">{item.name}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-widest text-right mt-0.5">{item.type} • {item.size || 'N/A'}</p>
                </div>

                {selectedIds.has(item.id) ? (
                  <div className="absolute top-4 right-4 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-200">
                    <i className="fa-solid fa-check text-xs"></i>
                  </div>
                ) : (
                  <div className="absolute top-4 right-4 w-7 h-7 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <i className="fa-solid fa-plus text-xs"></i>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}

          {!isLoading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <i className="fa-solid fa-folder-open text-3xl"></i>
              </div>
              <p className="text-sm font-semibold px-4 text-center">لم يتم العثور على أي وسائط تطابق معايير البحث</p>
              <button 
                onClick={() => {setFilters({ ...filters, search: '' }); setActiveTab('all');}}
                className="mt-4 text-xs font-bold text-indigo-500 hover:underline"
              >
                مسح الفلتر والعودة
              </button>
            </div>
          )}
        </main>

        {/* Floating Action Bar - Pill style with correct spacing based on temp-code design */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-8 left-8 right-8 flex justify-center z-10 animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900/95 backdrop-blur-lg text-white px-2 py-2 rounded-full shadow-2xl flex items-center gap-4 sm:gap-6 border border-white/10" dir="rtl">
              {/* Left Side: Count */}
              <div className="flex items-center gap-3 pr-4">
                <div className="bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                  {selectedIds.size}
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap">عنصر محدد</span>
              </div>
              
              {/* Separator */}
              <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 pl-2">
                <button 
                  onClick={() => setSelectedIds(new Set())} 
                  className="px-4 py-2 text-[11px] font-bold text-slate-300 hover:text-white transition-colors whitespace-nowrap uppercase tracking-wider"
                >
                  مسح الكل
                </button>
                <button 
                  onClick={handleConfirm}
                  className="bg-indigo-600 hover:bg-indigo-500 px-6 sm:px-8 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap"
                >
                  تأكيد الإدراج
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

const TabItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-300 whitespace-nowrap shrink-0 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
  >
    <i className={`fa-solid ${icon} text-[11px]`}></i>
    <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
  </button>
);

export default MediaManagerPopup;
