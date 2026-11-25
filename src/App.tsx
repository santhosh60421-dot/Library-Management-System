import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpenCheck, CheckCircle2, X } from 'lucide-react';
import { IssueBookView } from './components/IssueBookView';
import { IssueRecord, formatDisplayDate } from './types';

interface ToastNotification {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export default function App() {
  const [records, setRecords] = useState<IssueRecord[]>([]);
  const [today, setToday] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ id: Date.now(), type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast((prev) => (prev?.id === toast.id ? null : prev));
    }, 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/records');
      if (!res.ok) {
        throw new Error('Failed to load saved records from SQLite backend.');
      }
      const json = await res.json();
      if (json?.today) {
        setToday(json.today);
      }
      setRecords(json.records ?? []);
    } catch (err) {
      showToast('error', (err as Error).message || 'Unable to reach library server.');
    }
  }, [showToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#0B1F3A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-white">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-white truncate">
                LIBRARY MANAGEMENT SYSTEM
              </h1>
              <p className="text-xs text-slate-300 truncate">
                Issue a Book · {formatDisplayDate(today)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-xs ${
                toast.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded p-1 opacity-70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <IssueBookView
            records={records}
            today={today}
            onSuccess={async (message) => {
              showToast('success', message);
              await fetchRecords();
            }}
            onError={(msg) => showToast('error', msg)}
          />
        </div>
      </main>
    </div>
  );
}
