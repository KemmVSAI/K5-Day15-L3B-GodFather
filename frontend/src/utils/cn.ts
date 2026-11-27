import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripDosageTokens(text: string): string {
  return text
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu|vien)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDateTimeVi(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return iso;
  }
}
