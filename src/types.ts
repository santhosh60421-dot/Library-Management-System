export type NavTab =
  | 'dashboard'
  | 'issue'
  | 'return'
  | 'records'
  | 'books'
  | 'students';

export interface BookItem {
  id: number;
  bookNumber: string;
  bookName: string;
  author: string;
  totalQuantity: number;
  availableQuantity: number;
  issuedQuantity: number;
  createdAt: string;
}

export interface IssueRecord {
  id: number;
  issueId: string;
  studentId: string;
  studentName: string;
  bookNumber: string;
  bookName: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  lateDays: number;
  fineAmount: number;
  collectedFine: number;
  isOverdue: boolean;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE';
  rawStatus: 'ISSUED' | 'RETURNED';
  createdAt: string;
}

export interface StudentItem {
  id: number;
  studentId: string;
  studentName: string;
  department: string;
  email: string;
  createdAt: string;
  activeIssuedCount: number;
  totalBorrowedCount: number;
  pendingFines: number;
  paidFines: number;
  history: IssueRecord[];
}

export interface DashboardSummary {
  totalBooks: number;
  totalTitles: number;
  availableBooks: number;
  totalStudents: number;
  currentlyIssuedBooks: number;
  returnedBooks: number;
  overdueBooks: number;
  totalFineCollected: number;
  pendingFineEstimate: number;
}

export interface DashboardData {
  today: string;
  finePerDay: number;
  summary: DashboardSummary;
  overdueRecords: IssueRecord[];
  recentRecords: IssueRecord[];
}

export interface ReturnSummary {
  issueId: string;
  studentName: string;
  studentId: string;
  bookName: string;
  bookNumber: string;
  issueDate: string;
  dueDate: string;
  returnDate: string;
  lateDays: number;
  finePerDay: number;
  totalFineAmount: number;
}

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function calculateLocalFinePreview(dueDate: string, returnDate: string): {
  lateDays: number;
  fineAmount: number;
} {
  if (!dueDate || !returnDate) return { lateDays: 0, fineAmount: 0 };
  const d1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  const d2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(returnDate);
  if (!d1 || !d2) return { lateDays: 0, fineAmount: 0 };
  const dueMs = Date.UTC(Number(d1[1]), Number(d1[2]) - 1, Number(d1[3]));
  const retMs = Date.UTC(Number(d2[1]), Number(d2[2]) - 1, Number(d2[3]));
  const diff = Math.round((retMs - dueMs) / 86_400_000);
  const lateDays = Math.max(0, diff);
  return { lateDays, fineAmount: lateDays * 50 };
}
