import {
  AlertTriangle,
  ArrowRight,
  BookCheck,
  BookOpen,
  Clock,
  Eye,
  IndianRupee,
  Users,
} from 'lucide-react';
import {
  DashboardData,
  IssueRecord,
  NavTab,
  formatDisplayDate,
  formatRupees,
} from '../types';
import { StatusBadge } from './StatusBadge';

interface DashboardViewProps {
  data: DashboardData | null;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
  onQuickReturn: (record: IssueRecord) => void;
  onViewResult: (record: IssueRecord) => void;
}

export function DashboardView({
  data,
  loading,
  onNavigate,
  onQuickReturn,
  onViewResult,
}: DashboardViewProps) {
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, overdueRecords, recentRecords } = data;

  const cards = [
    {
      title: 'Total Books',
      value: summary.totalBooks.toLocaleString('en-IN'),
      subtitle: `${summary.totalTitles} distinct titles · ${summary.availableBooks} available`,
      icon: BookOpen,
      iconBg: 'bg-blue-50 text-[#1D4ED8] border-blue-100',
      onClick: () => onNavigate('books'),
    },
    {
      title: 'Total Students',
      value: summary.totalStudents.toLocaleString('en-IN'),
      subtitle: 'Registered library members',
      icon: Users,
      iconBg: 'bg-slate-100 text-[#0B1F3A] border-slate-200',
      onClick: () => onNavigate('students'),
    },
    {
      title: 'Currently Issued Books',
      value: summary.currentlyIssuedBooks.toLocaleString('en-IN'),
      subtitle: 'Active student checkouts',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
      onClick: () => onNavigate('records'),
    },
    {
      title: 'Returned Books',
      value: summary.returnedBooks.toLocaleString('en-IN'),
      subtitle: 'Completed circulations',
      icon: BookCheck,
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      onClick: () => onNavigate('records'),
    },
    {
      title: 'Overdue Books',
      value: summary.overdueBooks.toLocaleString('en-IN'),
      subtitle: `Pending fine est.: ${formatRupees(summary.pendingFineEstimate)}`,
      icon: AlertTriangle,
      iconBg: 'bg-red-50 text-red-700 border-red-200',
      onClick: () => onNavigate('return'),
    },
    {
      title: 'Total Fine Collected',
      value: formatRupees(summary.totalFineCollected),
      subtitle: `Calculated at ₹${data.finePerDay} / late day`,
      icon: IndianRupee,
      iconBg: 'bg-blue-50 text-[#0B1F3A] border-blue-200',
      onClick: () => onNavigate('records'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 6 Summary Cards */}
      <section aria-label="Library Summary Metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xs hover:border-blue-300 hover:shadow-md smooth-transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{card.title}</p>
                    <p className="mt-2 font-mono-tabular text-3xl font-bold tracking-tight text-slate-900">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${card.iconBg}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{card.subtitle}</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#1D4ED8] smooth-transition"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Overdue Books Alert Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Overdue Books &amp; Pending Fine Estimates
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Automatically flagged against today&apos;s date ({formatDisplayDate(data.today)}) at ₹50 per extra day
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('return')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 smooth-transition whitespace-nowrap shrink-0"
          >
            Open Return Desk
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {overdueRecords.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No overdue books right now. All active checkouts are within their due dates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Issue ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Book</th>
                  <th className="px-4 py-3">Final Date</th>
                  <th className="px-4 py-3 text-right">Overdue Days</th>
                  <th className="px-4 py-3 text-right">Pending Fine</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {overdueRecords.map((rec) => (
                  <tr key={rec.issueId} className="hover:bg-red-50/40 smooth-transition">
                    <td className="px-6 py-3.5 font-mono-tabular text-xs font-semibold text-slate-900">
                      {rec.issueId}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900">{rec.studentName}</div>
                      <div className="font-mono-tabular text-xs text-slate-500">{rec.studentId}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 max-w-xs truncate">
                        {rec.bookName}
                      </div>
                      <div className="font-mono-tabular text-xs text-slate-500">{rec.bookNumber}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(rec.dueDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular font-semibold text-red-700">
                      {rec.lateDays} day(s)
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular font-bold text-red-700">
                      {formatRupees(rec.fineAmount)}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onQuickReturn(rec)}
                        className="rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8] smooth-transition"
                      >
                        Process Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Transactions */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recent Circulation Activity
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Latest book issues and returns stored in the local SQLite database
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('records')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 smooth-transition whitespace-nowrap shrink-0"
          >
            View All Records
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {recentRecords.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No library transactions recorded yet. Issue your first book to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Issue ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Book</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Fine</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">End Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentRecords.map((rec) => (
                  <tr key={rec.issueId} className="hover:bg-slate-50/80 smooth-transition">
                    <td className="px-6 py-3 font-mono-tabular text-xs font-semibold text-slate-900">
                      {rec.issueId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{rec.studentName}</div>
                      <div className="font-mono-tabular text-xs text-slate-500">{rec.studentId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 max-w-xs truncate">
                        {rec.bookName}
                      </div>
                      <div className="font-mono-tabular text-xs text-slate-500">{rec.bookNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(rec.issueDate)}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(rec.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular font-semibold text-slate-900">
                      {formatRupees(rec.fineAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onViewResult(rec)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 smooth-transition"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        End Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
