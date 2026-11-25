import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  IssueRecord,
  ReturnSummary,
  calculateLocalFinePreview,
  formatDisplayDate,
  formatRupees,
} from '../types';
import { EndResultCard } from './EndResultCard';
import { StatusBadge } from './StatusBadge';

interface ReturnBookViewProps {
  activeRecords: IssueRecord[];
  today: string;
  preselectedRecord: IssueRecord | null;
  onClearPreselect: () => void;
  onReturned: (record: IssueRecord, message: string) => void;
  onError: (message: string) => void;
}

export function ReturnBookView({
  activeRecords,
  today,
  preselectedRecord,
  onClearPreselect,
  onReturned,
  onError,
}: ReturnBookViewProps) {
  const [studentId, setStudentId] = useState('');
  const [bookNumber, setBookNumber] = useState('');
  const [retrievedRecord, setRetrievedRecord] = useState<IssueRecord | null>(null);
  const [finalDateInput, setFinalDateInput] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    summary: ReturnSummary;
    record: IssueRecord;
  } | null>(null);

  // Standalone Final Date vs Actual Return Date checker
  const [calcFinalDate, setCalcFinalDate] = useState('');
  const [calcReturnDate, setCalcReturnDate] = useState('');

  useEffect(() => {
    if (preselectedRecord) {
      setStudentId(preselectedRecord.studentId);
      setBookNumber(preselectedRecord.bookNumber);
      setRetrievedRecord(preselectedRecord);
      setFinalDateInput(preselectedRecord.dueDate);
      setReturnDate('');
      setCompletedSummary(null);
      onClearPreselect();
    }
  }, [preselectedRecord, onClearPreselect]);

  const handleLookup = async (sid = studentId, bnum = bookNumber) => {
    const cleanSid = sid.trim().toUpperCase();
    const cleanBnum = bnum.trim().toUpperCase();
    if (!cleanSid || !cleanBnum) {
      onError('Enter both Student ID and Book Number to retrieve the issued book details.');
      return;
    }

    setLookingUp(true);
    setCompletedSummary(null);
    try {
      const res = await fetch(
        `/api/issue/lookup?studentId=${encodeURIComponent(cleanSid)}&bookNumber=${encodeURIComponent(cleanBnum)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setRetrievedRecord(null);
        setFinalDateInput('');
        onError(json.error || 'Issued record not found.');
        return;
      }
      setRetrievedRecord(json.record);
      setFinalDateInput(json.record.dueDate);
    } catch {
      onError('Failed to connect to the local library server.');
    } finally {
      setLookingUp(false);
    }
  };

  // Auto-match from activeRecords as user enters Student ID and Book Number
  useEffect(() => {
    const cleanSid = studentId.trim().toUpperCase();
    const cleanBnum = bookNumber.trim().toUpperCase();
    if (cleanSid && cleanBnum) {
      const localMatch = activeRecords.find(
        (r) =>
          r.studentId.toUpperCase() === cleanSid &&
          r.bookNumber.toUpperCase() === cleanBnum
      );
      if (localMatch && localMatch.issueId !== retrievedRecord?.issueId) {
        setRetrievedRecord(localMatch);
        setFinalDateInput(localMatch.dueDate);
      }
    }
  }, [studentId, bookNumber, activeRecords, retrievedRecord?.issueId]);

  const selectActiveRecord = (rec: IssueRecord) => {
    setStudentId(rec.studentId);
    setBookNumber(rec.bookNumber);
    setRetrievedRecord(rec);
    setFinalDateInput(rec.dueDate);
    setCompletedSummary(null);
  };

  const effectiveDueDate = finalDateInput || retrievedRecord?.dueDate || '';

  // Compare user-entered Actual Return Date against Final Date
  const hasBothDates = Boolean(effectiveDueDate && returnDate);
  const liveFinePreview = hasBothDates
    ? calculateLocalFinePreview(effectiveDueDate, returnDate)
    : { lateDays: 0, fineAmount: 0 };

  const invalidFinalBeforeIssue =
    retrievedRecord && effectiveDueDate ? effectiveDueDate < retrievedRecord.issueDate : false;

  const invalidReturnBeforeIssue =
    retrievedRecord && returnDate ? returnDate < retrievedRecord.issueDate : false;

  const standaloneReady = Boolean(calcFinalDate && calcReturnDate);
  const standalonePreview = standaloneReady
    ? calculateLocalFinePreview(calcFinalDate, calcReturnDate)
    : { lateDays: 0, fineAmount: 0 };

  const handleConfirmReturn = async (e: FormEvent) => {
    e.preventDefault();
    if (!retrievedRecord) {
      onError('Please retrieve an active issued record first.');
      return;
    }
    if (!effectiveDueDate) {
      onError('Please enter or retrieve the Final Date (Due Date).');
      return;
    }
    if (!returnDate) {
      onError('Please enter the Actual Return Date.');
      return;
    }
    if (effectiveDueDate < retrievedRecord.issueDate) {
      onError(
        `Final Date (${formatDisplayDate(effectiveDueDate)}) cannot be earlier than Starting Date (${formatDisplayDate(
          retrievedRecord.issueDate
        )}).`
      );
      return;
    }
    if (returnDate < retrievedRecord.issueDate) {
      onError(
        `Actual Return Date (${formatDisplayDate(returnDate)}) cannot be earlier than Starting Date (${formatDisplayDate(
          retrievedRecord.issueDate
        )}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: retrievedRecord.studentId,
          bookNumber: retrievedRecord.bookNumber,
          dueDate: effectiveDueDate,
          returnDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to return book.');
        return;
      }
      setCompletedSummary({ summary: json.summary, record: json.record });
      setRetrievedRecord(null);
      setStudentId('');
      setBookNumber('');
      setFinalDateInput('');
      setReturnDate('');
      onReturned(json.record, json.message);
    } catch {
      onError('Network error while returning the book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
      {/* Return Form & Fine Breakdown */}
      <div className="xl:col-span-7 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Return a Book &amp; Calculate Fine
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Retrieve the issued book to get its Final Date, enter the <span className="font-semibold text-slate-800">Actual Return Date</span> from the user, and calculate fine as <span className="font-semibold text-slate-800">(Actual Return Date − Final Date) × ₹50</span>.
            </p>
          </div>

          <form onSubmit={handleConfirmReturn} className="mt-5 space-y-5">
            {/* Step 1: Lookup fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-end">
              <div className="sm:col-span-5">
                <label htmlFor="ret-student-id" className="block text-sm font-medium text-slate-700">
                  Student ID <span className="text-red-600">*</span>
                </label>
                <input
                  id="ret-student-id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g., CS2024001"
                  required
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="ret-book-number" className="block text-sm font-medium text-slate-700">
                  Book Number <span className="text-red-600">*</span>
                </label>
                <input
                  id="ret-book-number"
                  type="text"
                  value={bookNumber}
                  onChange={(e) => setBookNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., BK-101"
                  required
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={() => handleLookup()}
                  disabled={lookingUp}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 smooth-transition"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {lookingUp ? 'Finding...' : 'Retrieve'}
                </button>
              </div>
            </div>

            {/* Step 2: Retrieved details */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">
                Retrieved Book &amp; Student Details
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Student Name</label>
                  <input
                    type="text"
                    readOnly
                    value={retrievedRecord ? retrievedRecord.studentName : ''}
                    placeholder="Auto-retrieved"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Book Name</label>
                  <input
                    type="text"
                    readOnly
                    value={retrievedRecord ? retrievedRecord.bookName : ''}
                    placeholder="Auto-retrieved"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Starting Date</label>
                  <input
                    type="text"
                    readOnly
                    value={retrievedRecord ? formatDisplayDate(retrievedRecord.issueDate) : ''}
                    placeholder="DD-MM-YYYY"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono-tabular text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Final Date (Due Date) & Actual Return Date inputs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
              <div>
                <label htmlFor="ret-final-date" className="block text-sm font-medium text-slate-700">
                  Final Date (Due Date) <span className="text-red-600">*</span>
                </label>
                <input
                  id="ret-final-date"
                  type="date"
                  value={finalDateInput}
                  min={retrievedRecord?.issueDate}
                  onChange={(e) => setFinalDateInput(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Auto-retrieved from issue record (editable if needed).
                </p>
                {invalidFinalBeforeIssue && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    Final Date cannot be earlier than Starting Date.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="ret-actual-date" className="block text-sm font-medium text-slate-700">
                    Return Date (Actual Return Date) <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setReturnDate(today)}
                    className="text-xs font-medium text-[#1D4ED8] hover:underline"
                  >
                    Use Today ({formatDisplayDate(today)})
                  </button>
                </div>
                <input
                  id="ret-actual-date"
                  type="date"
                  value={returnDate}
                  min={retrievedRecord?.issueDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Enter the date the student actually returns the book.
                </p>
                {invalidReturnBeforeIssue && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    Actual Return Date cannot be earlier than Starting Date.
                  </p>
                )}
              </div>
            </div>

            {/* Live Comparison Box */}
            {hasBothDates && !invalidReturnBeforeIssue && !invalidFinalBeforeIssue ? (
              <div
                className={`rounded-lg border p-4 ${
                  liveFinePreview.lateDays > 0
                    ? 'border-red-200 bg-red-50 text-red-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {liveFinePreview.lateDays > 0
                        ? `Actual Return Date is ${liveFinePreview.lateDays} day(s) more than Final Date`
                        : 'Actual Return Date is on or before Final Date (No Fine)'}
                    </p>
                    <p className="mt-0.5 font-mono-tabular text-xs opacity-90">
                      Final Date: {formatDisplayDate(effectiveDueDate)} · Actual Return Date:{' '}
                      {formatDisplayDate(returnDate)} · Rate: ₹50/day
                    </p>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <p className="text-xs">
                      {liveFinePreview.lateDays} day(s) × ₹50
                    </p>
                    <p className="text-xl font-bold">
                      Fine: {formatRupees(liveFinePreview.fineAmount)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                Enter <strong className="text-slate-800">Actual Return Date</strong> above to see how many days it exceeds the <strong className="text-slate-800">Final Date</strong> and calculate the fine.
              </div>
            )}

            <div className="flex justify-end border-t border-slate-200 pt-5">
              <button
                type="submit"
                disabled={
                  submitting ||
                  !retrievedRecord ||
                  !returnDate ||
                  !effectiveDueDate ||
                  invalidReturnBeforeIssue ||
                  invalidFinalBeforeIssue
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] smooth-transition disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {submitting ? 'Processing Return...' : 'Complete Book Return'}
              </button>
            </div>
          </form>
        </div>

        {/* END RESULT Card */}
        {completedSummary && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 shadow-xs ${
                completedSummary.summary.totalFineAmount > 0
                  ? 'border-red-300 bg-red-50 text-red-900'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {completedSummary.summary.totalFineAmount > 0 ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-bold">
                    {completedSummary.summary.totalFineAmount > 0
                      ? `Late Return Fine Applied: ${formatRupees(completedSummary.summary.totalFineAmount)} (${completedSummary.summary.lateDays} extra day(s) × ₹50)`
                      : 'Book Returned On Time — Fine: ₹0'}
                  </p>
                  <p className="mt-0.5 text-xs opacity-90">
                    Book copy restored to inventory and transaction saved to SQLite.
                  </p>
                </div>
              </div>
            </div>
            <EndResultCard record={completedSummary.record} />
          </div>
        )}

        {/* Standalone Fine Rate Checker */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Calculator className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900">
              Quick Fine Calculator (Enter Final Date &amp; Actual Return Date)
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
            <div>
              <label htmlFor="calc-final" className="block text-xs font-medium text-slate-600">
                Final Date (Due Date)
              </label>
              <input
                id="calc-final"
                type="date"
                value={calcFinalDate}
                onChange={(e) => setCalcFinalDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="calc-return" className="block text-xs font-medium text-slate-600">
                Actual Return Date
              </label>
              <input
                id="calc-return"
                type="date"
                value={calcReturnDate}
                onChange={(e) => setCalcReturnDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2">
              {standaloneReady ? (
                <>
                  <p className="text-xs text-slate-500">
                    Extra Days: <span className="font-mono-tabular font-semibold text-slate-900">{standalonePreview.lateDays}</span> × ₹50
                  </p>
                  <p
                    className={`font-mono-tabular text-base font-bold ${
                      standalonePreview.fineAmount > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    Fine: {formatRupees(standalonePreview.fineAmount)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 py-1">Enter both dates to calculate</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Issued Books Quick Pick */}
      <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Currently Issued Books ({activeRecords.length})
          </h3>
          <p className="text-xs text-slate-500">
            Select an active checkout to load it into the return form
          </p>
        </div>
        <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-200">
          {activeRecords.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No books are currently checked out.
            </div>
          ) : (
            activeRecords.map((rec) => (
              <button
                key={rec.issueId}
                type="button"
                onClick={() => selectActiveRecord(rec)}
                className="flex w-full items-start justify-between gap-3 px-5 py-3.5 text-left hover:bg-blue-50/60 smooth-transition"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {rec.bookName}
                  </p>
                  <p className="text-xs text-slate-600">
                    {rec.studentName} ·{' '}
                    <span className="font-mono-tabular">{rec.studentId}</span> ·{' '}
                    <span className="font-mono-tabular">{rec.bookNumber}</span>
                  </p>
                  <p className="font-mono-tabular text-xs text-slate-500">
                    Final Date: {formatDisplayDate(rec.dueDate)}
                    {rec.lateDays > 0 && (
                      <span className="ml-2 font-semibold text-red-700">
                        ({rec.lateDays}d past due as of today)
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={rec.status} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
