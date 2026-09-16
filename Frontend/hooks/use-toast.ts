import { useSyncExternalStore } from 'react';
import type { ToastVariant } from '@/shared/ui/toast';

type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastInput = Omit<ToastItem, 'id'>;

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ToastItem[] {
  return toasts;
}

function dismiss(id: string): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

function toast(input: ToastInput): void {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, ...input }];
  emit();
  window.setTimeout(() => dismiss(id), 5000);
}

export function useToast(): { toasts: ToastItem[]; toast: typeof toast; dismiss: typeof dismiss } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { toasts: snapshot, toast, dismiss };
}
