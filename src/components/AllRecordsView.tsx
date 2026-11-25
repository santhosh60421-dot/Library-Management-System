import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Download,
  Eye,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { IssueRecord, formatDisplayDate, formatRupees } from '../types';
import { StatusBadge } from './StatusBadge';

interface AllRecordsViewProps {
  records: IssueRecord[];
  onQuickReturn: (record: IssueRecord) => void;
  onViewResult: (record: IssueRecord) => void;
  onExportCsv: () => void;
}

type StatusFilter = 'ALL' | 'ISSUED' | 'RETURNED' | 'OVERDUE';
type SortMode = 'newest' | 'oldest' | 'due_asc' | 'due_desc';

export function AllRecordsView({
  records,
  onQuickReturn,
  onViewResult,
  onExportCsv,
}: AllRecordsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .filter((r) => {
        if (statusFilter === 'ISSUED' && r.rawStatus !== 'ISSUED') return false;
        if (statusFilter === 'RETURNED' && r.rawStatus !== 'RETURNED') return false;
        if (statusFilter === 'OVERDUE' && r.status !== 'OVERDUE') return false;

        if (!q) return true;
        return (
          r.studentId.toLowerCase().includes(q) ||
          r.studentName.toLowerCase().includes(q) ||
          r.bookNumber.toLowerCase().includes(q) ||
          r.bookName.toLowerCase().includes(q) ||
          r.issueId.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'oldest') {
          return a.issueDate.localeCompare(b.issueDate) || a.id - b.id;
        }
        if (sortMode === 'due_asc') {
          return a.dueDate.localeCompare(b.dueDate) || a.id - b.id;
        }
        if (sortMode === 'due_desc') {
          return b.dueDate.localeCompare(a.dueDate) || b.id - a.id;
        }
        return b.issueDate.localeCompare(a.issueDate) || b.id - a.id;
      });
  }, [records, search, statusFilter, sortMode]);

  const counts = useMemo(
    () => ({
      ALL: records.length,
      ISSUED: records.filter((r) => r.rawStatus === 'ISSUED').length,
      RETURNED: records.filter((r) => r.rawStatus === 'RETURNED').length,
      OVERDUE: records.filter((r) => r.status === 'OVERDUE').length,
    }),
    [records]
  );

  return (
    <div className="space-y-5">
      {/* Search, Filter & Sort Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Student ID, Student Name, or Book Number..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-9 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Segmented Filter */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'ALL', label: `All (${counts.ALL})` },
                  { id: 'ISSUED', label: `Issued (${counts.ISSUED})` },
                  { id: 'RETURNED', label: `Returned (${counts.RETURNED})` },
                  { id: 'OVERDUE', label: `Overdue (${counts.OVERDUE})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium smooth-transition whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                aria-label="Sort records by date"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="newest">Issue Date: Newest First</option>
                <option value="oldest">Issue Date: Oldest First</option>
                <option value="due_asc">Due Date: Earliest First</option>
                <option value="due_desc">Due Date: Latest First</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 smooth-transition whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">S.No.</th>
                <th className="px-4 py-3 whitespace-nowrap">Issue ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Student Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Student ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Book Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Book Number</th>
                <th className="px-4 py-3 whitespace-nowrap">Starting Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Final Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Return Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Late Days</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Fine Amount</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-10 text-center text-sm text-slate-500">
                    No circulation records match your current search or filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => (
                  <tr key={rec.issueId} className="hover:bg-slate-50/80 smooth-transition">
                    <td className="px-4 py-3 font-mono-tabular text-xs text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {rec.issueId}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {rec.studentName}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700 whitespace-nowrap">
                      {rec.studentId}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[210px] truncate" title={rec.bookName}>
                      {rec.bookName}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700 whitespace-nowrap">
                      {rec.bookNumber}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(rec.issueDate)}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(rec.dueDate)}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700 whitespace-nowrap">
                      {rec.returnDate ? formatDisplayDate(rec.returnDate) : '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono-tabular text-xs font-semibold whitespace-nowrap ${
                        rec.lateDays > 0 ? 'text-red-700' : 'text-slate-600'
                      }`}
                    >
                      {rec.lateDays}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono-tabular text-xs font-bold whitespace-nowrap ${
                        rec.fineAmount > 0 ? 'text-red-700' : 'text-slate-700'
                      }`}
                    >
                      {formatRupees(rec.fineAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewResult(rec)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 smooth-transition"
                          title="View End Result"
                          aria-label={`View end result for ${rec.issueId}`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          End Result
                        </button>
                        {rec.rawStatus === 'ISSUED' && (
                          <button
                            type="button"
                            onClick={() => onQuickReturn(rec)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#0B1F3A] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#1D4ED8] smooth-transition"
                          >
                            <RotateCcw className="h-3 w-3" aria-hidden="true" />
                            Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
