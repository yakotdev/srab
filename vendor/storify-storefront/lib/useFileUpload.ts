/**
 * Shared file upload hook
 * Single source of truth for file uploads across the application
 */

import { useState } from 'react';
import { storageApi, UploadResponse } from './api';

export interface UseFileUploadReturn {
  uploadFile: (file: File, type?: 'image' | 'file' | 'video') => Promise<UploadResponse | null>;
  isUploading: boolean;
  error: string | null;
  resetError: () => void;
}

/**
 * Hook for handling file uploads
 * Provides upload function, loading state, and error handling
 */
export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (
    file: File,
    type?: 'image' | 'file' | 'video'
  ): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const result = await storageApi.upload(file, type);
      setIsUploading(false);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      setIsUploading(false);
      console.error('File upload error:', err);
      return null;
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    uploadFile,
    isUploading,
    error,
    resetError,
  };
}

/**
 * Helper function to check if a URL is a base64 data URL
 * Used for backward compatibility with existing base64 images
 */
export function isBase64Url(url: string): boolean {
  return url.startsWith('data:');
}
