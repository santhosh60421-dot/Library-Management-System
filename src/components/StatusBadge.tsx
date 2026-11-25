import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'RETURNED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Returned
      </span>
    );
  }

  if (status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Overdue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 whitespace-nowrap">
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Issued
    </span>
  );
}
