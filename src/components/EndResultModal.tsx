import { X } from 'lucide-react';
import { IssueRecord } from '../types';
import { EndResultCard } from './EndResultCard';

interface EndResultModalProps {
  record: IssueRecord | null;
  onClose: () => void;
}

export function EndResultModal({ record, onClose }: EndResultModalProps) {
  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-result-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 id="end-result-modal-title" className="text-base font-semibold text-slate-900">
            END RESULT
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 smooth-transition"
            aria-label="Close end result"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <EndResultCard record={record} />
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0B1F3A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] smooth-transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
