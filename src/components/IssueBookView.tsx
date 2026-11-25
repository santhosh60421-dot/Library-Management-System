import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookPlus,
  CalendarCheck,
  Search,
  Trash2,
} from 'lucide-react';
import {
  IssueRecord,
  calculateLocalFinePreview,
  formatDisplayDate,
  formatRupees,
} from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { EndResultCard } from './EndResultCard';
import { StatusBadge } from './StatusBadge';

interface IssueBookViewProps {
  records: IssueRecord[];
  today: string;
  onSuccess: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}

function addDaysIso(baseIso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseIso);
  if (!match) return baseIso;
  const ms =
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) +
    days * 86_400_000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function IssueBookView({
  records,
  today,
  onSuccess,
  onError,
}: IssueBookViewProps) {
  // New issue form state
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [bookNumber, setBookNumber] = useState('');
  const [bookName, setBookName] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(() => addDaysIso(today, 14));
  const [returnDate, setReturnDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Selected saved student state (for entering/updating Return Date & calculating fine)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedDueDate, setSelectedDueDate] = useState('');
  const [selectedReturnDate, setSelectedReturnDate] = useState('');
  const [savingReturn, setSavingReturn] = useState(false);

  // End result display & saved list filtering/deleting
  const [endResultRecord, setEndResultRecord] = useState<IssueRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    if (today && !issueDate) {
      setIssueDate(today);
      setDueDate(addDaysIso(today, 14));
    }
  }, [today, issueDate]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.issueId === selectedIssueId) ?? null,
    [records, selectedIssueId]
  );

  // If selected record was deleted externally, clear selection
  useEffect(() => {
    if (selectedIssueId && !selectedRecord) {
      setSelectedIssueId(null);
      setSelectedDueDate('');
      setSelectedReturnDate('');
    }
  }, [selectedIssueId, selectedRecord]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.studentId.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.bookNumber.toLowerCase().includes(q) ||
        r.bookName.toLowerCase().includes(q) ||
        r.issueId.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const invalidNewReturnBeforeIssue = Boolean(
    returnDate && issueDate && returnDate < issueDate
  );
  const newFinePreview =
    returnDate && dueDate && !invalidNewReturnBeforeIssue
      ? calculateLocalFinePreview(dueDate, returnDate)
      : null;

  const invalidSelectedReturnBeforeIssue = Boolean(
    selectedRecord &&
      selectedReturnDate &&
      selectedReturnDate < selectedRecord.issueDate
  );
  const invalidSelectedDueBeforeIssue = Boolean(
    selectedRecord &&
      selectedDueDate &&
      selectedDueDate < selectedRecord.issueDate
  );
  const selectedFinePreview =
    selectedRecord &&
    selectedReturnDate &&
    selectedDueDate &&
    !invalidSelectedReturnBeforeIssue &&
    !invalidSelectedDueBeforeIssue
      ? calculateLocalFinePreview(selectedDueDate, selectedReturnDate)
      : null;

  const handleSelectSavedRecord = (rec: IssueRecord) => {
    setSelectedIssueId(rec.issueId);
    setSelectedDueDate(rec.dueDate);
    setSelectedReturnDate(rec.returnDate ?? '');
    setEndResultRecord(rec);
  };

  const handleResetToNewIssue = () => {
    setSelectedIssueId(null);
    setSelectedDueDate('');
    setSelectedReturnDate('');
  };

  const handleIssueSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !studentName.trim() ||
      !studentId.trim() ||
      !bookName.trim() ||
      !bookNumber.trim() ||
      !issueDate ||
      !dueDate
    ) {
      onError('Please complete all required fields before submitting.');
      return;
    }
    if (dueDate < issueDate) {
      onError(
        'Final Date (Due Date) cannot be earlier than Starting Date (Issue Date).'
      );
      return;
    }
    if (returnDate && returnDate < issueDate) {
      onError(
        'Return Date cannot be earlier than Starting Date (Issue Date).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentId: studentId.trim().toUpperCase(),
          bookName: bookName.trim(),
          bookNumber: bookNumber.trim().toUpperCase(),
          issueDate,
          dueDate,
          returnDate: returnDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to save book issue.');
        return;
      }

      setEndResultRecord(json.record);
      await onSuccess(json.message);
      setStudentId('');
      setStudentName('');
      setBookNumber('');
      setBookName('');
      setReturnDate('');
    } catch {
      onError('Network error while connecting to the local library server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReturnDate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!selectedDueDate || !selectedReturnDate) {
      onError('Please enter both Final Date and Return Date.');
      return;
    }
    if (selectedDueDate < selectedRecord.issueDate) {
      onError('Final Date cannot be earlier than Starting Date.');
      return;
    }
    if (selectedReturnDate < selectedRecord.issueDate) {
      onError('Return Date cannot be earlier than Starting Date.');
      return;
    }

    setSavingReturn(true);
    try {
      const res = await fetch(
        `/api/records/${encodeURIComponent(selectedRecord.issueId)}/return`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dueDate: selectedDueDate,
            returnDate: selectedReturnDate,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to save return date.');
        return;
      }

      setEndResultRecord(json.record);
      await onSuccess(json.message);
    } catch {
      onError('Network error while saving return date.');
    } finally {
      setSavingReturn(false);
    }
  };

  const handleDeleteRecord = async (rec: IssueRecord) => {
    setDeletingId(rec.issueId);
    try {
      const res = await fetch(
        `/api/records/${encodeURIComponent(rec.issueId)}`,
        {
          method: 'DELETE',
        }
      );
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to delete saved record.');
        return;
      }
      if (selectedIssueId === rec.issueId) {
        handleResetToNewIssue();
      }
      if (endResultRecord?.issueId === rec.issueId) {
        setEndResultRecord(null);
      }
      await onSuccess(json.message);
    } catch {
      onError('Network error while deleting saved record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const res = await fetch('/api/records', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to clear saved records.');
        return;
      }
      handleResetToNewIssue();
      setEndResultRecord(null);
      setConfirmClearAll(false);
      await onSuccess(json.message);
    } catch {
      onError('Network error while clearing saved records.');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
      {/* Left Column: Issue a Book OR Enter Return Date for Clicked Saved Student */}
      <div className="xl:col-span-6 space-y-6">
        {selectedRecord ? (
          <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Enter Return Date &amp; Calculate Fine
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Saved Issue ID:{' '}
                  <span className="font-mono-tabular font-semibold text-slate-800">
                    {selectedRecord.issueId}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetToNewIssue}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 smooth-transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Issue Another Book
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Student Name</p>
                <p className="font-semibold text-slate-900">
                  {selectedRecord.studentName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Student ID</p>
                <p className="font-mono-tabular font-semibold text-slate-900">
                  {selectedRecord.studentId}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Book Name</p>
                <p className="font-semibold text-slate-900">
                  {selectedRecord.bookName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Book Number</p>
                <p className="font-mono-tabular font-semibold text-slate-900">
                  {selectedRecord.bookNumber}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Starting Date (Issue Date)</p>
                <p className="font-mono-tabular font-medium text-slate-900">
                  {formatDisplayDate(selectedRecord.issueDate)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveReturnDate} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="saved-due-date"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Final Date (Due Date) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="saved-due-date"
                    type="date"
                    value={selectedDueDate}
                    min={selectedRecord.issueDate}
                    onChange={(e) => setSelectedDueDate(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {invalidSelectedDueBeforeIssue && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      Final Date cannot be earlier than Starting Date.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="saved-return-date"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Return Date <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedReturnDate(today)}
                      className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                    >
                      Use Today
                    </button>
                  </div>
                  <input
                    id="saved-return-date"
                    type="date"
                    value={selectedReturnDate}
                    min={selectedRecord.issueDate}
                    onChange={(e) => setSelectedReturnDate(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {invalidSelectedReturnBeforeIssue && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      Return Date cannot be earlier than Starting Date.
                    </p>
                  )}
                </div>
              </div>

              {selectedFinePreview && (
                <div
                  className={`rounded-lg border p-3.5 ${
                    selectedFinePreview.lateDays > 0
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedFinePreview.lateDays > 0
                          ? `Return Date is ${selectedFinePreview.lateDays} day(s) more than Final Date`
                          : 'Returned on or before Final Date (No Fine)'}
                      </p>
                      <p className="font-mono-tabular text-xs opacity-90">
                        Final Date: {formatDisplayDate(selectedDueDate)} → Return Date:{' '}
                        {formatDisplayDate(selectedReturnDate)}
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <p className="text-xs">
                        {selectedFinePreview.lateDays} extra day(s) × ₹50
                      </p>
                      <p className="text-lg font-bold">
                        Total Fine To Be Paid:{' '}
                        {formatRupees(selectedFinePreview.fineAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="submit"
                  disabled={
                    savingReturn ||
                    !selectedReturnDate ||
                    invalidSelectedReturnBeforeIssue ||
                    invalidSelectedDueBeforeIssue
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 smooth-transition disabled:opacity-60"
                >
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  {savingReturn
                    ? 'Saving...'
                    : 'SAVE RETURN DATE & CALCULATE FINE'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Issue a Book
              </h2>
            </div>

            <form onSubmit={handleIssueSubmit} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="issue-student-id"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Student ID <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="issue-student-id"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    placeholder="e.g., CS2024001"
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="issue-student-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Student Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="issue-student-name"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g., Aarav Sharma"
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="issue-book-number"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Book Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="issue-book-number"
                    type="text"
                    value={bookNumber}
                    onChange={(e) => setBookNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., BK-101"
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="issue-book-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Book Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="issue-book-name"
                    type="text"
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    placeholder="e.g., Clean Code"
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="issue-start-date"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Starting Date (Issue Date){' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="issue-start-date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="issue-due-date"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Final Date (Due Date) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="issue-due-date"
                    type="date"
                    value={dueDate}
                    min={issueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="issue-return-date"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Return Date (Optional)
                    </label>
                    {returnDate && (
                      <button
                        type="button"
                        onClick={() => setReturnDate('')}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        Clear Return Date
                      </button>
                    )}
                  </div>
                  <input
                    id="issue-return-date"
                    type="date"
                    value={returnDate}
                    min={issueDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Leave empty while issuing. Later, click the saved student to enter Return Date when they return the book.
                  </p>
                  {invalidNewReturnBeforeIssue && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      Return Date cannot be earlier than Starting Date.
                    </p>
                  )}
                </div>
              </div>

              {newFinePreview && (
                <div
                  className={`rounded-lg border p-3.5 ${
                    newFinePreview.lateDays > 0
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {newFinePreview.lateDays > 0
                          ? `Return Date is ${newFinePreview.lateDays} day(s) more than Final Date`
                          : 'Return Date is on or before Final Date (No Fine)'}
                      </p>
                      <p className="font-mono-tabular text-xs opacity-90">
                        Final Date: {formatDisplayDate(dueDate)} → Return Date:{' '}
                        {formatDisplayDate(returnDate)}
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <p className="text-xs">
                        {newFinePreview.lateDays} extra day(s) × ₹50
                      </p>
                      <p className="text-lg font-bold">
                        Total Fine To Be Paid:{' '}
                        {formatRupees(newFinePreview.fineAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
                <p className="text-xs text-slate-500">
                  Overdue returns incur a fine of{' '}
                  <span className="font-semibold text-slate-800">
                    ₹50 per extra day
                  </span>
                  .
                </p>
                <button
                  type="submit"
                  disabled={submitting || invalidNewReturnBeforeIssue}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 smooth-transition disabled:opacity-60"
                >
                  <BookPlus className="h-4 w-4" aria-hidden="true" />
                  {submitting
                    ? 'Saving...'
                    : returnDate
                    ? 'SAVE RETURN & FINE'
                    : 'ISSUE BOOK'}
                </button>
              </div>
            </form>
          </div>
        )}

        {endResultRecord && <EndResultCard record={endResultRecord} />}
      </div>

      {/* Right Column: Saved Students (Click to enter Return Date, Delete if more are saved) */}
      <div className="xl:col-span-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Saved Students &amp; Issued Books ({records.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Click any saved student to enter Return Date &amp; calculate fine, or delete entries.
                </p>
              </div>
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 smooth-transition"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear All
                </button>
              )}
            </div>

            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved students by ID, name, or book..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-200">
            {filteredRecords.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {records.length === 0
                    ? 'No saved student entries yet.'
                    : 'No saved students match your search.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {records.length === 0
                    ? 'Fill out the Issue a Book form on the left to save a student record.'
                    : 'Try a different Student ID, Name, or Book Number.'}
                </p>
              </div>
            ) : (
              filteredRecords.map((rec) => {
                const isSelected = selectedIssueId === rec.issueId;
                return (
                  <div
                    key={rec.issueId}
                    onClick={() => handleSelectSavedRecord(rec)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectSavedRecord(rec);
                      }
                    }}
                    className={`flex items-start justify-between gap-3 px-5 py-4 text-left cursor-pointer smooth-transition ${
                      isSelected
                        ? 'bg-blue-50/80 ring-2 ring-inset ring-[#1D4ED8]/40'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {rec.studentName}
                        </span>
                        <span className="font-mono-tabular text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {rec.studentId}
                        </span>
                        <StatusBadge status={rec.status} />
                      </div>

                      <p className="text-xs text-slate-700">
                        <span className="font-medium">{rec.bookName}</span>{' '}
                        <span className="font-mono-tabular text-slate-500">
                          ({rec.bookNumber})
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-tabular text-xs text-slate-500">
                        <span>Start: {formatDisplayDate(rec.issueDate)}</span>
                        <span>Final: {formatDisplayDate(rec.dueDate)}</span>
                        <span>
                          Return:{' '}
                          <strong
                            className={
                              rec.returnDate
                                ? 'text-slate-900'
                                : 'text-amber-700 font-medium'
                            }
                          >
                            {rec.returnDate
                              ? formatDisplayDate(rec.returnDate)
                              : 'Not Returned Yet'}
                          </strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                        <span
                          className={`font-mono-tabular font-semibold ${
                            rec.fineAmount > 0
                              ? 'text-red-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          Fine: {formatRupees(rec.fineAmount)}
                        </span>
                        <span className="text-xs font-medium text-[#1D4ED8]">
                          {rec.returnDate
                            ? 'Click to view / edit return date'
                            : 'Click to enter return date'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecord(rec);
                      }}
                      disabled={deletingId === rec.issueId}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:border-red-200 hover:bg-red-50 smooth-transition disabled:opacity-50"
                      aria-label={`Delete saved record for ${rec.studentName}`}
                      title="Delete saved student record"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClearAll}
        title="Clear All Saved Students"
        message={`Are you sure you want to delete all ${records.length} saved student record(s)? This cannot be undone.`}
        confirmLabel="Clear All"
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearAll(false)}
        loading={clearingAll}
      />
    </div>
  );
}
