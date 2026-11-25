import { FormEvent, useState } from 'react';
import { BookPlus, Pencil, Search, Trash2, X } from 'lucide-react';
import { BookItem } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface BookManagementViewProps {
  books: BookItem[];
  onRefresh: () => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function BookManagementView({
  books,
  onRefresh,
  onSuccess,
  onError,
}: BookManagementViewProps) {
  const [bookName, setBookName] = useState('');
  const [bookNumber, setBookNumber] = useState('');
  const [author, setAuthor] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editQty, setEditQty] = useState('1');

  const [deleteTarget, setDeleteTarget] = useState<BookItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAddBook = async (e: FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(quantity);
    if (!bookName.trim() || !bookNumber.trim() || !author.trim()) {
      onError('Please enter Book Name, Book Number, and Author.');
      return;
    }
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      onError('Quantity must be a positive whole number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookName: bookName.trim(),
          bookNumber: bookNumber.trim().toUpperCase(),
          author: author.trim(),
          quantity: qtyNum,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to add book.');
        return;
      }
      onSuccess(json.message);
      setBookName('');
      setBookNumber('');
      setAuthor('');
      setQuantity('1');
      await onRefresh();
    } catch {
      onError('Network error while saving book.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (book: BookItem) => {
    setEditingBook(book);
    setEditName(book.bookName);
    setEditAuthor(book.author);
    setEditQty(String(book.totalQuantity));
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    const qtyNum = Number(editQty);
    if (!editName.trim() || !editAuthor.trim() || !Number.isInteger(qtyNum) || qtyNum < 1) {
      onError('Please enter valid book details and quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(editingBook.bookNumber)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookName: editName.trim(),
          author: editAuthor.trim(),
          quantity: qtyNum,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to update book.');
        return;
      }
      onSuccess(json.message);
      setEditingBook(null);
      await onRefresh();
    } catch {
      onError('Network error while updating book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(deleteTarget.bookNumber)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Failed to delete book.');
        return;
      }
      onSuccess(json.message);
      setDeleteTarget(null);
      await onRefresh();
    } catch {
      onError('Network error while deleting book.');
    } finally {
      setDeleting(false);
    }
  };

  const totalCopies = books.reduce((sum, b) => sum + b.totalQuantity, 0);
  const availableCopies = books.reduce((sum, b) => sum + b.availableQuantity, 0);
  const issuedCopies = books.reduce((sum, b) => sum + b.issuedQuantity, 0);

  const filteredBooks = books.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.bookNumber.toLowerCase().includes(q) ||
      b.bookName.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Book Copies</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-slate-900">
            {totalCopies}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{books.length} catalog titles</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Available on Shelf</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-emerald-700">
            {availableCopies}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Ready to issue</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Currently Issued</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-amber-700">
            {issuedCopies}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Checked out to students</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* Add New Book Form */}
        <div className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900">Add New Book</h2>
          <p className="mt-1 text-xs text-slate-500">
            Register a new title in the local library catalog. Duplicate book numbers are blocked.
          </p>

          <form onSubmit={handleAddBook} className="mt-4 space-y-4">
            <div>
              <label htmlFor="book-number" className="block text-sm font-medium text-slate-700">
                Book Number <span className="text-red-600">*</span>
              </label>
              <input
                id="book-number"
                type="text"
                value={bookNumber}
                onChange={(e) => setBookNumber(e.target.value.toUpperCase())}
                placeholder="e.g., BK-108"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="book-name" className="block text-sm font-medium text-slate-700">
                Book Name <span className="text-red-600">*</span>
              </label>
              <input
                id="book-name"
                type="text"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="e.g., System Design Interview"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="book-author" className="block text-sm font-medium text-slate-700">
                Author <span className="text-red-600">*</span>
              </label>
              <input
                id="book-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Alex Xu"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="book-qty" className="block text-sm font-medium text-slate-700">
                Quantity <span className="text-red-600">*</span>
              </label>
              <input
                id="book-qty"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 smooth-transition disabled:opacity-60"
            >
              <BookPlus className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Saving...' : 'Add Book to Catalog'}
            </button>
          </form>
        </div>

        {/* Books Table */}
        <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Book Inventory</h2>
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, number, author..."
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Book Number</th>
                  <th className="px-4 py-3">Book Name &amp; Author</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3 text-right">Issued</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                      No books found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => (
                    <tr key={book.bookNumber} className="hover:bg-slate-50/80 smooth-transition">
                      <td className="px-5 py-3.5 font-mono-tabular text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {book.bookNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900">{book.bookName}</div>
                        <div className="text-xs text-slate-500">{book.author}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-tabular text-slate-700">
                        {book.totalQuantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-tabular font-semibold text-emerald-700">
                        {book.availableQuantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-tabular font-semibold text-amber-700">
                        {book.issuedQuantity}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(book)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 smooth-transition"
                            title="Edit book"
                            aria-label={`Edit ${book.bookName}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(book)}
                            disabled={book.issuedQuantity > 0}
                            className="rounded-md border border-slate-200 p-1.5 text-red-600 hover:bg-red-50 smooth-transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              book.issuedQuantity > 0
                                ? 'Cannot delete while copies are issued'
                                : 'Delete book'
                            }
                            aria-label={`Delete ${book.bookName}`}
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
      </div>

      {/* Edit Book Modal */}
      {editingBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-book-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 id="edit-book-title" className="text-base font-semibold text-slate-900">
                Edit Book ({editingBook.bookNumber})
              </h3>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Book Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Author</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Total Quantity (Currently Issued: {editingBook.issuedQuantity})
                </label>
                <input
                  type="number"
                  min={Math.max(1, editingBook.issuedQuantity)}
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono-tabular text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Book from Catalog"
        message={
          deleteTarget
            ? `Are you sure you want to permanently remove "${deleteTarget.bookName}" (${deleteTarget.bookNumber}) from the library catalog?`
            : ''
        }
        confirmLabel="Delete Book"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
