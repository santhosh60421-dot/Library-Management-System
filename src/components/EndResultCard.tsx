import { BookOpen } from 'lucide-react';
import { IssueRecord, formatDisplayDate, formatRupees } from '../types';
import { StatusBadge } from './StatusBadge';

interface EndResultCardProps {
  record: IssueRecord;
}

export function EndResultCard({ record }: EndResultCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B1F3A] text-white">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-[#0B1F3A]">
              END RESULT
            </p>
            <p className="text-xs text-slate-500">
              LIBRARY MANAGEMENT SYSTEM · Circulation &amp; Fine Outcome
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">Issue ID</p>
          <p className="font-mono-tabular text-sm font-semibold text-slate-900">
            {record.issueId}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-500">Student Name</p>
          <p className="mt-0.5 font-semibold text-slate-900">{record.studentName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Student ID</p>
          <p className="mt-0.5 font-mono-tabular font-semibold text-slate-900">
            {record.studentId}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Book Name</p>
          <p className="mt-0.5 font-semibold text-slate-900">{record.bookName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Book Number</p>
          <p className="mt-0.5 font-mono-tabular font-semibold text-slate-900">
            {record.bookNumber}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Starting Date</p>
            <p className="mt-1 font-mono-tabular font-medium text-slate-900">
              {formatDisplayDate(record.issueDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Final Due Date</p>
            <p className="mt-1 font-mono-tabular font-medium text-slate-900">
              {formatDisplayDate(record.dueDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Return Date</p>
            <p className="mt-1 font-mono-tabular font-medium text-slate-900">
              {record.returnDate ? formatDisplayDate(record.returnDate) : 'Pending'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <div>
            <p className="text-xs text-slate-500">Late Days (₹50 / extra day)</p>
            <p className="mt-0.5 font-mono-tabular text-sm font-semibold text-slate-900">
              {record.lateDays} day(s) × ₹50
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Fine To Be Paid</p>
            <p
              className={`mt-0.5 font-mono-tabular text-lg font-bold ${
                record.fineAmount > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {formatRupees(record.fineAmount)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <StatusBadge status={record.status} />
        </div>
        <span>Fine Rate: ₹50 per extra day after Final Date</span>
      </div>
    </div>
  );
}
