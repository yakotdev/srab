/**
 * Media Picker Hook
 * Unified interface for opening media manager popup
 * Replaces direct file input triggers throughout the application
 */

import { useState, useCallback } from 'react';
import MediaManagerPopup from '../components/MediaManagerPopup';

export interface MediaPickerOptions {
  accept?: 'image' | 'file' | 'video' | 'all';
  multiple?: boolean;
}

export interface MediaPickerResult {
  url: string;
  path?: string;
  name?: string;
  type?: string;
}

export interface UseMediaPickerReturn {
  openMediaPicker: (options?: MediaPickerOptions) => Promise<MediaPickerResult | null>;
  isOpen: boolean;
  closeMediaPicker: () => void;
  pickerOptions: MediaPickerOptions;
  handleSelect: (url: string) => void;
}

/**
 * Hook for opening media manager popup
 * Returns a promise that resolves with the selected file URL
 */
export function useMediaPicker(): UseMediaPickerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((value: MediaPickerResult | null) => void) | null>(null);
  const [options, setOptions] = useState<MediaPickerOptions>({});

  const openMediaPicker = useCallback((pickerOptions: MediaPickerOptions = {}): Promise<MediaPickerResult | null> => {
    return new Promise((resolve) => {
      setOptions(pickerOptions);
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const closeMediaPicker = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(null);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const handleSelect = useCallback((url: string) => {
    setIsOpen(false);
    if (resolvePromise) {
      // Extract metadata from URL if possible
      const result: MediaPickerResult = {
        url,
        path: url.split('/').pop() || undefined,
      };
      resolvePromise(result);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  return {
    openMediaPicker,
    isOpen,
    closeMediaPicker,
    pickerOptions: options,
    handleSelect,
  };
}
