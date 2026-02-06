// Utility functions

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate unique filename with timestamp and UUID
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const extension = originalFilename.split('.').pop();
  return `${timestamp}-${randomStr}.${extension}`;
}

/**
 * Validate image file type
 */
export function isValidImageType(mimeType: string): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
  ];
  return validTypes.includes(mimeType.toLowerCase());
}

/**
 * Validate video file type
 */
export function isValidVideoType(mimeType: string): boolean {
  const validTypes = ['video/mp4', 'video/quicktime'];
  return validTypes.includes(mimeType.toLowerCase());
}

/**
 * Validate media file type (image or video)
 */
export function isValidMediaType(mimeType: string): boolean {
  return isValidImageType(mimeType) || isValidVideoType(mimeType);
}

/**
 * Validate file size (photos max 25MB, videos max 100MB)
 */
export function isValidFileSize(bytes: number, mimeType?: string): boolean {
  const isVideo = mimeType ? isValidVideoType(mimeType) : false;
  const maxSize = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  return bytes <= maxSize;
}
