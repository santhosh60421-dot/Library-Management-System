import { FormEvent, useState } from 'react';
import { History, Pencil, Search, Trash2, UserPlus, X } from 'lucide-react';
import { StudentItem, formatDisplayDate, formatRupees } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { StatusBadge } from './StatusBadge';

interface StudentManagementViewProps {
  students: StudentItem[];
  onRefresh: () => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function StudentManagementView({
  students,
  onRefresh,
  onSuccess,
  onError,
}: StudentManagementViewProps) {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [historyStudent, setHistoryStudent] = useState<StudentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !studentName.trim()) {
      onError('Student ID and Student Name are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          studentName: studentName.trim(),
          department: department.trim() || 'General',
          email: email.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to register student.');
        return;
      }
      onSuccess(json.message);
      setStudentId('');
      setStudentName('');
      setEmail('');
      await onRefresh();
    } catch {
      onError('Network error while registering student.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (student: StudentItem) => {
    setEditingStudent(student);
    setEditName(student.studentName);
    setEditDept(student.department);
    setEditEmail(student.email);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName.trim()) {
      onError('Student Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(editingStudent.studentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: editName.trim(),
          department: editDept.trim() || 'General',
          email: editEmail.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to update student.');
        return;
      }
      onSuccess(json.message);
      setEditingStudent(null);
      await onRefresh();
    } catch {
      onError('Network error while updating student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(deleteTarget.studentId)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to delete student.');
        return;
      }
      onSuccess(json.message);
      setDeleteTarget(null);
      await onRefresh();
    } catch {
      onError('Network error while deleting student.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.studentId.toLowerCase().includes(q) ||
      s.studentName.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
      {/* Add Student Form */}
      <div className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900">Register Student</h2>
        <p className="mt-1 text-xs text-slate-500">
          Add a student to the local library directory. Duplicate Student IDs are automatically prevented.
        </p>

        <form onSubmit={handleAddStudent} className="mt-4 space-y-4">
          <div>
            <label htmlFor="stu-id" className="block text-sm font-medium text-slate-700">
              Student ID <span className="text-red-600">*</span>
            </label>
            <input
              id="stu-id"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              placeholder="e.g., CS2024042"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="stu-name" className="block text-sm font-medium text-slate-700">
              Student Name <span className="text-red-600">*</span>
            </label>
            <input
              id="stu-name"
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g., Ananya Verma"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="stu-dept" className="block text-sm font-medium text-slate-700">
              Department
            </label>
            <input
              id="stu-dept"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Computer Science"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="stu-email" className="block text-sm font-medium text-slate-700">
              College Email (Optional)
            </label>
            <input
              id="stu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 smooth-transition disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {submitting ? 'Registering...' : 'Add Student'}
          </button>
        </form>
      </div>

      {/* Students Table */}
      <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Registered Students ({students.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Student ID or Name..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">Student ID</th>
                <th className="px-4 py-3">Name &amp; Department</th>
                <th className="px-4 py-3 text-right">Active Books</th>
                <th className="px-4 py-3 text-right">Total Borrowed</th>
                <th className="px-4 py-3 text-right">Pending Fines</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                    No students match your search query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-slate-50/80 smooth-transition">
                    <td className="px-5 py-3.5 font-mono-tabular text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {stu.studentId}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900">{stu.studentName}</div>
                      <div className="text-xs text-slate-500">
                        {stu.department}
                        {stu.email ? ` · ${stu.email}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular font-semibold text-slate-900">
                      {stu.activeIssuedCount}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular text-slate-700">
                      {stu.totalBorrowedCount}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono-tabular font-bold ${
                        stu.pendingFines > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatRupees(stu.pendingFines)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setHistoryStudent(stu)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 smooth-transition"
                          title="View borrowing history"
                        >
                          <History className="h-3.5 w-3.5" aria-hidden="true" />
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(stu)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 smooth-transition"
                          title="Edit student"
                          aria-label={`Edit ${stu.studentName}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(stu)}
                          disabled={stu.activeIssuedCount > 0}
                          className="rounded-md border border-slate-200 p-1.5 text-red-600 hover:bg-red-50 smooth-transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            stu.activeIssuedCount > 0
                              ? 'Cannot delete student with unreturned books'
                              : 'Delete student'
                          }
                          aria-label={`Delete ${stu.studentName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-student-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 id="edit-student-title" className="text-base font-semibold text-slate-900">
                Edit Student ({editingStudent.studentId})
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Student Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Department</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrowing History & Fines Modal */}
      {historyStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-history-title"
        >
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 id="student-history-title" className="text-base font-semibold text-slate-900">
                  Borrowing History — {historyStudent.studentName} ({historyStudent.studentId})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Pending Fines: <span className="font-mono-tabular font-semibold text-red-700">{formatRupees(historyStudent.pendingFines)}</span> · Total Paid Fines:{' '}
                  <span className="font-mono-tabular font-semibold text-slate-800">{formatRupees(historyStudent.paidFines)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {historyStudent.history.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">
                  This student has not borrowed any books yet.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Issue ID</th>
                      <th className="px-4 py-3">Book</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Return Date</th>
                      <th className="px-4 py-3 text-right">Fine</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {historyStudent.history.map((item) => (
                      <tr key={item.issueId}>
                        <td className="px-5 py-3 font-mono-tabular text-xs font-semibold text-slate-900">
                          {item.issueId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{item.bookName}</div>
                          <div className="font-mono-tabular text-xs text-slate-500">
                            {item.bookNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700">
                          {formatDisplayDate(item.issueDate)}
                        </td>
                        <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700">
                          {formatDisplayDate(item.dueDate)}
                        </td>
                        <td className="px-4 py-3 font-mono-tabular text-xs text-slate-700">
                          {item.returnDate ? formatDisplayDate(item.returnDate) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-tabular text-xs font-bold text-slate-900">
                          {formatRupees(item.fineAmount)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Student Record"
        message={
          deleteTarget
            ? `Are you sure you want to remove student "${deleteTarget.studentName}" (${deleteTarget.studentId}) from the library directory?`
            : ''
        }
        confirmLabel="Delete Student"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
