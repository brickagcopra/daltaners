import * as React from 'react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

const toastColors: Record<ToastType, string> = {
  success: 'border-green-500 bg-green-50 text-green-900',
  error: 'border-red-500 bg-red-50 text-red-900',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-900',
  info: 'border-blue-500 bg-blue-50 text-blue-900',
};

let listeners: Array<(toasts: ToastMessage[]) => void> = [];
let toasts: ToastMessage[] = [];

function addToast(type: ToastType, title: string, description?: string) {
  const id = Math.random().toString(36).slice(2);
  const newToast: ToastMessage = { id, type, title, description };
  toasts = [...toasts, newToast];
  listeners.forEach((l) => l(toasts));

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(toasts));
  }, 5000);
}

export const toast = {
  success: (title: string, description?: string) => addToast('success', title, description),
  error: (title: string, description?: string) => addToast('error', title, description),
  warning: (title: string, description?: string) => addToast('warning', title, description),
  info: (title: string, description?: string) => addToast('info', title, description),
};

export function Toaster() {
  const [current, setCurrent] = React.useState<ToastMessage[]>([]);

  React.useEffect(() => {
    listeners.push(setCurrent);
    return () => {
      listeners = listeners.filter((l) => l !== setCurrent);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {current.map((t) => (
        <div
          key={t.id}
          className={cn(
            'rounded-lg border-l-4 p-4 shadow-lg min-w-[300px] max-w-[420px] animate-in slide-in-from-right',
            toastColors[t.type],
          )}
        >
          <p className="font-medium text-sm">{t.title}</p>
          {t.description && <p className="text-sm mt-1 opacity-80">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
