import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type ToastKind = 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export function toast(message: string, kind: ToastKind = 'success') {
  window.dispatchEvent(new CustomEvent('idmt-toast', { detail: { message, kind } }));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let seq = 0;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      const id = ++seq;
      setItems((prev) => [...prev, { id, ...detail }]);
      window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 3600);
    };
    window.addEventListener('idmt-toast', handler);
    return () => window.removeEventListener('idmt-toast', handler);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[320px] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-[#dde5f0] bg-white p-3.5 shadow-[0_16px_40px_rgba(10,20,36,.14)]"
        >
          {item.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#0f7a55]" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#c33241]" />
          )}
          <p className="flex-1 text-[12.5px] leading-relaxed text-[#0a1424]">{item.message}</p>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
            className="text-[#6b7a90] hover:text-[#0a1424]"
            aria-label="关闭提示"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
