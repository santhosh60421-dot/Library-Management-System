import express from 'express';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const FINE_PER_DAY = 50; // ₹50 per extra day

const DB_PATH = path.resolve(process.cwd(), 'library.db');
const EXPORT_DIR = path.resolve(process.cwd(), 'exports');

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize SQLite schema
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_number TEXT NOT NULL UNIQUE,
    book_name TEXT NOT NULL,
    author TEXT NOT NULL,
    total_quantity INTEGER NOT NULL CHECK (total_quantity >= 1),
    available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Computer Science',
    email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS issue_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id TEXT NOT NULL UNIQUE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    book_number TEXT NOT NULL,
    book_name TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT,
    late_days INTEGER NOT NULL DEFAULT 0,
    fine_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('ISSUED', 'RETURNED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function parseIsoDateUtc(dateStr: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMs = Date.UTC(year, month - 1, day);
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${dateStr}".`);
  }
  return utcMs;
}

function daysBetween(startDate: string, endDate: string): number {
  const startMs = parseIsoDateUtc(startDate);
  const endMs = parseIsoDateUtc(endDate);
  return Math.round((endMs - startMs) / 86_400_000);
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDateIso(baseIso: string, deltaDays: number): string {
  const ms = parseIsoDateUtc(baseIso) + deltaDays * 86_400_000;
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calculateFine(dueDate: string, returnDate: string): { lateDays: number; fineAmount: number } {
  const diff = daysBetween(dueDate, returnDate);
  const lateDays = Math.max(0, diff);
  return {
    lateDays,
    fineAmount: lateDays * FINE_PER_DAY,
  };
}

function seedInitialDataIfEmpty(): void {
  const bookCount = (db.prepare('SELECT COUNT(*) AS cnt FROM books').get() as { cnt: number }).cnt;
  const studentCount = (db.prepare('SELECT COUNT(*) AS cnt FROM students').get() as { cnt: number }).cnt;
  const issueCount = (db.prepare('SELECT COUNT(*) AS cnt FROM issue_records').get() as { cnt: number }).cnt;

  if (bookCount > 0 || studentCount > 0 || issueCount > 0) {
    return;
  }

  const today = getTodayIso();

  const insertBook = db.prepare(`
    INSERT INTO books (book_number, book_name, author, total_quantity, available_quantity)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedBooks: Array<[string, string, string, number, number]> = [
    ['BK-101', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 4, 3],
    ['BK-102', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen', 3, 2],
    ['BK-103', 'Operating System Concepts', 'Abraham Silberschatz', 5, 4],
    ['BK-104', 'Database System Concepts', 'Henry F. Korth', 3, 2],
    ['BK-105', 'Effective Java (3rd Edition)', 'Joshua Bloch', 2, 1],
    ['BK-106', 'Computer Networking: A Top-Down Approach', 'James F. Kurose', 4, 4],
    ['BK-107', 'Design Patterns: Elements of Reusable OO Software', 'Erich Gamma', 2, 2],
  ];
  for (const b of seedBooks) {
    insertBook.run(...b);
  }

  const insertStudent = db.prepare(`
    INSERT INTO students (student_id, student_name, department, email)
    VALUES (?, ?, ?, ?)
  `);

  const seedStudents: Array<[string, string, string, string]> = [
    ['CS2024001', 'Aarav Sharma', 'Computer Science', 'aarav.sharma@college.edu'],
    ['CS2024002', 'Priya Nair', 'Computer Science', 'priya.nair@college.edu'],
    ['EC2024014', 'Rohan Kulkarni', 'Electronics', 'rohan.k@college.edu'],
    ['IT2024008', 'Meera Krishnan', 'Information Tech', 'meera.k@college.edu'],
    ['ME2024021', 'Vikram Patel', 'Mechanical Engg', 'vikram.p@college.edu'],
  ];
  for (const s of seedStudents) {
    insertStudent.run(...s);
  }

  const insertIssue = db.prepare(`
    INSERT INTO issue_records (
      issue_id, student_id, student_name, book_number, book_name,
      issue_date, due_date, return_date, late_days, fine_amount, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 2 overdue, 3 active issued (not overdue), 2 returned (1 on time, 1 late with ₹250 fine)
  insertIssue.run(
    'ISS-2026-1001',
    'CS2024001',
    'Aarav Sharma',
    'BK-101',
    'Clean Code: A Handbook of Agile Software Craftsmanship',
    shiftDateIso(today, -19),
    shiftDateIso(today, -5),
    null,
    0,
    0,
    'ISSUED'
  );

  insertIssue.run(
    'ISS-2026-1002',
    'EC2024014',
    'Rohan Kulkarni',
    'BK-102',
    'Introduction to Algorithms (CLRS)',
    shiftDateIso(today, -16),
    shiftDateIso(today, -2),
    null,
    0,
    0,
    'ISSUED'
  );

  insertIssue.run(
    'ISS-2026-1003',
    'CS2024002',
    'Priya Nair',
    'BK-103',
    'Operating System Concepts',
    shiftDateIso(today, -4),
    shiftDateIso(today, 10),
    null,
    0,
    0,
    'ISSUED'
  );

  insertIssue.run(
    'ISS-2026-1004',
    'IT2024008',
    'Meera Krishnan',
    'BK-104',
    'Database System Concepts',
    shiftDateIso(today, -2),
    shiftDateIso(today, 12),
    null,
    0,
    0,
    'ISSUED'
  );

  insertIssue.run(
    'ISS-2026-1005',
    'ME2024021',
    'Vikram Patel',
    'BK-105',
    'Effective Java (3rd Edition)',
    shiftDateIso(today, -1),
    shiftDateIso(today, 13),
    null,
    0,
    0,
    'ISSUED'
  );

  // Returned records
  insertIssue.run(
    'ISS-2026-0998',
    'CS2024002',
    'Priya Nair',
    'BK-106',
    'Computer Networking: A Top-Down Approach',
    shiftDateIso(today, -25),
    shiftDateIso(today, -11),
    shiftDateIso(today, -12),
    0,
    0,
    'RETURNED'
  );

  insertIssue.run(
    'ISS-2026-0999',
    'IT2024008',
    'Meera Krishnan',
    'BK-107',
    'Design Patterns: Elements of Reusable OO Software',
    shiftDateIso(today, -25),
    shiftDateIso(today, -15),
    shiftDateIso(today, -10),
    5,
    250,
    'RETURNED'
  );
}

seedInitialDataIfEmpty();

interface RawIssueRow {
  id: number;
  issue_id: string;
  student_id: string;
  student_name: string;
  book_number: string;
  book_name: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  late_days: number;
  fine_amount: number;
  status: 'ISSUED' | 'RETURNED';
  created_at: string;
}

function enrichRecord(row: RawIssueRow, today: string) {
  let effectiveStatus: 'ISSUED' | 'RETURNED' | 'OVERDUE' = row.status;
  let pendingLateDays = 0;
  let pendingFineEstimate = 0;

  if (row.status === 'ISSUED') {
    const overdueDays = Math.max(0, daysBetween(row.due_date, today));
    if (overdueDays > 0) {
      effectiveStatus = 'OVERDUE';
      pendingLateDays = overdueDays;
      pendingFineEstimate = overdueDays * FINE_PER_DAY;
    }
  }

  return {
    id: row.id,
    issueId: row.issue_id,
    studentId: row.student_id,
    studentName: row.student_name,
    bookNumber: row.book_number,
    bookName: row.book_name,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    returnDate: row.return_date,
    lateDays: row.status === 'RETURNED' ? row.late_days : pendingLateDays,
    fineAmount: row.status === 'RETURNED' ? row.fine_amount : pendingFineEstimate,
    collectedFine: row.status === 'RETURNED' ? row.fine_amount : 0,
    isOverdue: effectiveStatus === 'OVERDUE',
    status: effectiveStatus,
    rawStatus: row.status,
    createdAt: row.created_at,
  };
}

function generateNextIssueId(): string {
  const year = new Date().getFullYear();
  const row = db.prepare('SELECT MAX(id) AS maxId FROM issue_records').get() as { maxId: number | null };
  const nextSeq = (row.maxId ?? 0) + 1001;
  return `ISS-${year}-${nextSeq}`;
}

function escapeCsvCell(value: string | number | null): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildRecordsCsv(today: string): string {
  const rows = db.prepare('SELECT * FROM issue_records ORDER BY id DESC').all() as unknown as RawIssueRow[];
  const enriched = rows.map((r) => enrichRecord(r, today));
  const headers = [
    'S.No.',
    'Issue ID',
    'Student Name',
    'Student ID',
    'Book Name',
    'Book Number',
    'Starting Date',
    'Final Date',
    'Return Date',
    'Late Days',
    'Fine Amount (INR)',
    'Status',
  ];
  const lines = [headers.join(',')];
  enriched.forEach((r, idx) => {
    lines.push(
      [
        idx + 1,
        escapeCsvCell(r.issueId),
        escapeCsvCell(r.studentName),
        escapeCsvCell(r.studentId),
        escapeCsvCell(r.bookName),
        escapeCsvCell(r.bookNumber),
        escapeCsvCell(r.issueDate),
        escapeCsvCell(r.dueDate),
        escapeCsvCell(r.returnDate ?? 'Not Returned'),
        r.lateDays,
        r.fineAmount,
        escapeCsvCell(r.status),
      ].join(',')
    );
  });
  return lines.join('\n');
}

function persistBackupFile(today: string): void {
  const csv = buildRecordsCsv(today);
  fs.writeFileSync(path.join(EXPORT_DIR, 'library_records_backup.csv'), csv, 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Dashboard summary
  app.get('/api/dashboard', (_req, res) => {
    try {
      const today = getTodayIso();
      const bookStats = db
        .prepare('SELECT COUNT(*) AS titleCount, COALESCE(SUM(total_quantity), 0) AS totalCopies, COALESCE(SUM(available_quantity), 0) AS availableCopies FROM books')
        .get() as { titleCount: number; totalCopies: number; availableCopies: number };

      const studentCount = (db.prepare('SELECT COUNT(*) AS cnt FROM students').get() as { cnt: number }).cnt;

      const allIssues = db.prepare('SELECT * FROM issue_records ORDER BY id DESC').all() as unknown as RawIssueRow[];
      const enriched = allIssues.map((r) => enrichRecord(r, today));

      const currentlyIssued = enriched.filter((r) => r.rawStatus === 'ISSUED').length;
      const returnedBooks = enriched.filter((r) => r.rawStatus === 'RETURNED').length;
      const overdueRecords = enriched.filter((r) => r.status === 'OVERDUE');
      const totalFineCollected = enriched
        .filter((r) => r.rawStatus === 'RETURNED')
        .reduce((acc, r) => acc + r.fineAmount, 0);
      const pendingFineEstimate = overdueRecords.reduce((acc, r) => acc + r.fineAmount, 0);

      res.json({
        today,
        finePerDay: FINE_PER_DAY,
        summary: {
          totalBooks: bookStats.totalCopies,
          totalTitles: bookStats.titleCount,
          availableBooks: bookStats.availableCopies,
          totalStudents: studentCount,
          currentlyIssuedBooks: currentlyIssued,
          returnedBooks,
          overdueBooks: overdueRecords.length,
          totalFineCollected,
          pendingFineEstimate,
        },
        overdueRecords,
        recentRecords: enriched.slice(0, 8),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 2. Books CRUD
  app.get('/api/books', (req, res) => {
    try {
      const search = String(req.query.search ?? '').trim().toLowerCase();
      const rows = db.prepare('SELECT * FROM books ORDER BY id DESC').all() as Array<{
        id: number;
        book_number: string;
        book_name: string;
        author: string;
        total_quantity: number;
        available_quantity: number;
        created_at: string;
      }>;

      const mapped = rows
        .map((b) => ({
          id: b.id,
          bookNumber: b.book_number,
          bookName: b.book_name,
          author: b.author,
          totalQuantity: b.total_quantity,
          availableQuantity: b.available_quantity,
          issuedQuantity: b.total_quantity - b.available_quantity,
          createdAt: b.created_at,
        }))
        .filter(
          (b) =>
            !search ||
            b.bookNumber.toLowerCase().includes(search) ||
            b.bookName.toLowerCase().includes(search) ||
            b.author.toLowerCase().includes(search)
        );

      res.json({ books: mapped });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/books', (req, res) => {
    try {
      const bookNumber = String(req.body.bookNumber ?? '').trim().toUpperCase();
      const bookName = String(req.body.bookName ?? '').trim();
      const author = String(req.body.author ?? '').trim();
      const quantity = Number(req.body.quantity);

      if (!bookNumber || !bookName || !author) {
        return res.status(400).json({ error: 'Book Number, Book Name, and Author are required.' });
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ error: 'Quantity must be a positive whole number (at least 1).' });
      }

      const existing = db.prepare('SELECT id FROM books WHERE UPPER(book_number) = UPPER(?)').get(bookNumber);
      if (existing) {
        return res.status(409).json({ error: `Book Number "${bookNumber}" already exists in the catalog.` });
      }

      db.prepare(
        'INSERT INTO books (book_number, book_name, author, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?)'
      ).run(bookNumber, bookName, author, quantity, quantity);

      res.status(201).json({ message: `Book "${bookName}" (${bookNumber}) added successfully.` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/books/:bookNumber', (req, res) => {
    try {
      const targetBookNumber = decodeURIComponent(req.params.bookNumber).trim();
      const bookName = String(req.body.bookName ?? '').trim();
      const author = String(req.body.author ?? '').trim();
      const totalQuantity = Number(req.body.quantity);

      const existing = db.prepare('SELECT * FROM books WHERE UPPER(book_number) = UPPER(?)').get(targetBookNumber) as
        | {
            id: number;
            book_number: string;
            total_quantity: number;
            available_quantity: number;
          }
        | undefined;

      if (!existing) {
        return res.status(404).json({ error: `Book "${targetBookNumber}" not found.` });
      }
      if (!bookName || !author) {
        return res.status(400).json({ error: 'Book Name and Author are required.' });
      }
      if (!Number.isInteger(totalQuantity) || totalQuantity < 1) {
        return res.status(400).json({ error: 'Total quantity must be at least 1.' });
      }

      const currentlyIssued = existing.total_quantity - existing.available_quantity;
      if (totalQuantity < currentlyIssued) {
        return res.status(400).json({
          error: `Cannot reduce quantity below ${currentlyIssued} because ${currentlyIssued} copy/copies are currently issued.`,
        });
      }

      const newAvailable = totalQuantity - currentlyIssued;
      db.prepare('UPDATE books SET book_name = ?, author = ?, total_quantity = ?, available_quantity = ? WHERE id = ?').run(
        bookName,
        author,
        totalQuantity,
        newAvailable,
        existing.id
      );

      // Keep active/historical display book name synchronized if needed? Keep historical accurate or update active issued
      db.prepare("UPDATE issue_records SET book_name = ? WHERE UPPER(book_number) = UPPER(?) AND status = 'ISSUED'").run(
        bookName,
        existing.book_number
      );

      res.json({ message: `Book "${existing.book_number}" updated successfully.` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/books/:bookNumber', (req, res) => {
    try {
      const targetBookNumber = decodeURIComponent(req.params.bookNumber).trim();
      const existing = db.prepare('SELECT * FROM books WHERE UPPER(book_number) = UPPER(?)').get(targetBookNumber) as
        | { id: number; book_number: string; book_name: string }
        | undefined;

      if (!existing) {
        return res.status(404).json({ error: `Book "${targetBookNumber}" not found.` });
      }

      const activeIssue = db
        .prepare("SELECT issue_id FROM issue_records WHERE UPPER(book_number) = UPPER(?) AND status = 'ISSUED' LIMIT 1")
        .get(existing.book_number) as { issue_id: string } | undefined;

      if (activeIssue) {
        return res.status(400).json({
          error: `Cannot delete "${existing.book_name}" (${existing.book_number}) because it is currently issued (Issue ID: ${activeIssue.issue_id}).`,
        });
      }

      db.prepare('DELETE FROM books WHERE id = ?').run(existing.id);
      res.json({ message: `Book "${existing.book_name}" (${existing.book_number}) deleted successfully.` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 3. Students CRUD + borrowing history & pending fines
  app.get('/api/students', (req, res) => {
    try {
      const today = getTodayIso();
      const search = String(req.query.search ?? '').trim().toLowerCase();
      const students = db.prepare('SELECT * FROM students ORDER BY id DESC').all() as Array<{
        id: number;
        student_id: string;
        student_name: string;
        department: string;
        email: string;
        created_at: string;
      }>;

      const issues = db.prepare('SELECT * FROM issue_records ORDER BY id DESC').all() as unknown as RawIssueRow[];
      const enrichedIssues = issues.map((r) => enrichRecord(r, today));

      const mapped = students
        .map((s) => {
          const history = enrichedIssues.filter((r) => r.studentId.toUpperCase() === s.student_id.toUpperCase());
          const activeIssued = history.filter((r) => r.rawStatus === 'ISSUED').length;
          const pendingFines = history
            .filter((r) => r.status === 'OVERDUE')
            .reduce((acc, r) => acc + r.fineAmount, 0);
          const paidFines = history
            .filter((r) => r.rawStatus === 'RETURNED')
            .reduce((acc, r) => acc + r.fineAmount, 0);

          return {
            id: s.id,
            studentId: s.student_id,
            studentName: s.student_name,
            department: s.department,
            email: s.email,
            createdAt: s.created_at,
            activeIssuedCount: activeIssued,
            totalBorrowedCount: history.length,
            pendingFines,
            paidFines,
            history,
          };
        })
        .filter(
          (s) =>
            !search ||
            s.studentId.toLowerCase().includes(search) ||
            s.studentName.toLowerCase().includes(search) ||
            s.department.toLowerCase().includes(search)
        );

      res.json({ students: mapped });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/students', (req, res) => {
    try {
      const studentId = String(req.body.studentId ?? '').trim().toUpperCase();
      const studentName = String(req.body.studentName ?? '').trim();
      const department = String(req.body.department ?? 'General').trim() || 'General';
      const email = String(req.body.email ?? '').trim();

      if (!studentId || !studentName) {
        return res.status(400).json({ error: 'Student ID and Student Name are required.' });
      }

      const existing = db.prepare('SELECT id FROM students WHERE UPPER(student_id) = UPPER(?)').get(studentId);
      if (existing) {
        return res.status(409).json({ error: `Student ID "${studentId}" is already registered.` });
      }

      db.prepare('INSERT INTO students (student_id, student_name, department, email) VALUES (?, ?, ?, ?)').run(
        studentId,
        studentName,
        department,
        email
      );

      res.status(201).json({ message: `Student "${studentName}" (${studentId}) registered successfully.` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/students/:studentId', (req, res) => {
    try {
      const targetId = decodeURIComponent(req.params.studentId).trim();
      const studentName = String(req.body.studentName ?? '').trim();
      const department = String(req.body.department ?? 'General').trim() || 'General';
      const email = String(req.body.email ?? '').trim();

      const existing = db.prepare('SELECT * FROM students WHERE UPPER(student_id) = UPPER(?)').get(targetId) as
        | { id: number; student_id: string }
        | undefined;

      if (!existing) {
        return res.status(404).json({ error: `Student ID "${targetId}" not found.` });
      }
      if (!studentName) {
        return res.status(400).json({ error: 'Student Name is required.' });
      }

      db.prepare('UPDATE students SET student_name = ?, department = ?, email = ? WHERE id = ?').run(
        studentName,
        department,
        email,
        existing.id
      );

      db.prepare("UPDATE issue_records SET student_name = ? WHERE UPPER(student_id) = UPPER(?) AND status = 'ISSUED'").run(
        studentName,
        existing.student_id
      );

      res.json({ message: `Student "${existing.student_id}" updated successfully.` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/students/:studentId', (req, res) => {
    try {
      const targetId = decodeURIComponent(req.params.studentId).trim();
      const existing = db.prepare('SELECT * FROM students WHERE UPPER(student_id) = UPPER(?)').get(targetId) as
        | { id: number; student_id: string; student_name: string }
        | undefined;

      if (!existing) {
        return res.status(404).json({ error: `Student "${targetId}" not found.` });
      }

      const activeIssue = db
        .prepare("SELECT issue_id FROM issue_records WHERE UPPER(student_id) = UPPER(?) AND status = 'ISSUED' LIMIT 1")
        .get(existing.student_id) as { issue_id: string } | undefined;

      if (activeIssue) {
        return res.status(400).json({
          error: `Cannot delete student "${existing.student_name}" because they have an unreturned book (Issue ID: ${activeIssue.issue_id}).`,
        });
      }

      db.prepare('DELETE FROM students WHERE id = ?').run(existing.id);
      res.json({ message: `Student "${existing.student_name}" (${existing.student_id}) deleted successfully.` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 4. All Records (search, filter, sort)
  app.get('/api/records', (req, res) => {
    try {
      const today = getTodayIso();
      const search = String(req.query.search ?? '').trim().toLowerCase();
      const statusFilter = String(req.query.status ?? 'ALL').toUpperCase();
      const sortOrder = String(req.query.sort ?? 'newest').toLowerCase();

      const rows = db.prepare('SELECT * FROM issue_records').all() as unknown as RawIssueRow[];
      let enriched = rows.map((r) => enrichRecord(r, today));

      if (search) {
        enriched = enriched.filter(
          (r) =>
            r.studentId.toLowerCase().includes(search) ||
            r.studentName.toLowerCase().includes(search) ||
            r.bookNumber.toLowerCase().includes(search) ||
            r.bookName.toLowerCase().includes(search) ||
            r.issueId.toLowerCase().includes(search)
        );
      }

      if (statusFilter === 'ISSUED') {
        enriched = enriched.filter((r) => r.rawStatus === 'ISSUED');
      } else if (statusFilter === 'RETURNED') {
        enriched = enriched.filter((r) => r.rawStatus === 'RETURNED');
      } else if (statusFilter === 'OVERDUE') {
        enriched = enriched.filter((r) => r.status === 'OVERDUE');
      }

      enriched.sort((a, b) => {
        if (sortOrder === 'oldest') {
          return a.issueDate.localeCompare(b.issueDate) || a.id - b.id;
        }
        if (sortOrder === 'due_asc') {
          return a.dueDate.localeCompare(b.dueDate) || a.id - b.id;
        }
        if (sortOrder === 'due_desc') {
          return b.dueDate.localeCompare(a.dueDate) || b.id - a.id;
        }
        return b.issueDate.localeCompare(a.issueDate) || b.id - a.id;
      });

      res.json({ records: enriched, today });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 5. Issue a Book (supports optional returnDate to immediately record return & fine if entered)
  app.post('/api/issue', (req, res) => {
    try {
      const studentName = String(req.body.studentName ?? '').trim();
      const studentId = String(req.body.studentId ?? '').trim().toUpperCase();
      const bookName = String(req.body.bookName ?? '').trim();
      const bookNumber = String(req.body.bookNumber ?? '').trim().toUpperCase();
      const issueDate = String(req.body.issueDate ?? '').trim();
      const dueDate = String(req.body.dueDate ?? '').trim();
      const returnDate = req.body.returnDate ? String(req.body.returnDate).trim() : '';

      if (!studentName || !studentId || !bookName || !bookNumber || !issueDate || !dueDate) {
        return res.status(400).json({ error: 'All fields (Student Name, Student ID, Book Name, Book Number, Starting Date, and Final Date) are required.' });
      }

      // Validate dates
      let dateDiff: number;
      try {
        dateDiff = daysBetween(issueDate, dueDate);
      } catch (e) {
        return res.status(400).json({ error: (e as Error).message });
      }
      if (dateDiff < 0) {
        return res.status(400).json({ error: 'Final Date (Due Date) cannot be earlier than Starting Date (Issue Date).' });
      }

      let lateDays = 0;
      let fineAmount = 0;
      if (returnDate) {
        let returnDiff: number;
        try {
          returnDiff = daysBetween(issueDate, returnDate);
        } catch (e) {
          return res.status(400).json({ error: (e as Error).message });
        }
        if (returnDiff < 0) {
          return res.status(400).json({ error: 'Return Date cannot be earlier than Starting Date (Issue Date).' });
        }
        const calc = calculateFine(dueDate, returnDate);
        lateDays = calc.lateDays;
        fineAmount = calc.fineAmount;
      }

      // Register or sync book entry without blocking saved student entries
      let book = db.prepare('SELECT * FROM books WHERE UPPER(book_number) = UPPER(?)').get(bookNumber) as
        | { id: number; book_number: string; book_name: string; available_quantity: number; total_quantity: number }
        | undefined;

      if (!book) {
        db.prepare(
          'INSERT INTO books (book_number, book_name, author, total_quantity, available_quantity) VALUES (?, ?, ?, 1, 1)'
        ).run(bookNumber, bookName, 'Library Catalog');
        book = db.prepare('SELECT * FROM books WHERE UPPER(book_number) = UPPER(?)').get(bookNumber) as {
          id: number;
          book_number: string;
          book_name: string;
          available_quantity: number;
          total_quantity: number;
        };
      }

      // Register student automatically if not present
      const existingStudent = db.prepare('SELECT * FROM students WHERE UPPER(student_id) = UPPER(?)').get(studentId) as
        | { id: number; student_id: string; student_name: string }
        | undefined;

      if (!existingStudent) {
        db.prepare('INSERT INTO students (student_id, student_name, department, email) VALUES (?, ?, ?, ?)').run(
          studentId,
          studentName,
          'General',
          ''
        );
      }

      const issueId = generateNextIssueId();
      const recordStatus = returnDate ? 'RETURNED' : 'ISSUED';

      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare(
          `INSERT INTO issue_records (
            issue_id, student_id, student_name, book_number, book_name,
            issue_date, due_date, return_date, late_days, fine_amount, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          issueId,
          studentId,
          studentName,
          bookNumber,
          bookName,
          issueDate,
          dueDate,
          returnDate || null,
          lateDays,
          fineAmount,
          recordStatus
        );

        if (!returnDate) {
          db.prepare('UPDATE books SET available_quantity = MAX(0, available_quantity - 1) WHERE id = ?').run(book.id);
        }
        db.exec('COMMIT;');
      } catch (txErr) {
        db.exec('ROLLBACK;');
        throw txErr;
      }

      const created = db.prepare('SELECT * FROM issue_records WHERE issue_id = ?').get(issueId) as unknown as RawIssueRow;
      persistBackupFile(getTodayIso());

      const successMessage = returnDate
        ? lateDays > 0
          ? `Saved "${bookName}" (${issueId}). ${lateDays} extra day(s) — Fine: ₹${fineAmount}.`
          : `Saved on-time return for "${bookName}" (${issueId}). Fine: ₹0.`
        : `Saved "${bookName}" for ${studentName} (${studentId}). Click the saved entry anytime to enter Return Date.`;

      res.status(201).json({
        message: successMessage,
        record: enrichRecord(created, getTodayIso()),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 5b. Update Return Date & Calculate Fine on a saved record by Issue ID
  app.put('/api/records/:issueId/return', (req, res) => {
    try {
      const targetIssueId = String(req.params.issueId ?? '').trim();
      const returnDate = String(req.body.returnDate ?? '').trim();
      const requestedDueDate = req.body.dueDate ? String(req.body.dueDate).trim() : '';

      if (!returnDate) {
        return res.status(400).json({ error: 'Return Date is required.' });
      }

      const existing = db
        .prepare('SELECT * FROM issue_records WHERE issue_id = ?')
        .get(targetIssueId) as unknown as RawIssueRow | undefined;

      if (!existing) {
        return res.status(404).json({ error: `Saved record "${targetIssueId}" not found.` });
      }

      const effectiveDueDate = requestedDueDate || existing.due_date;

      let issueToDueDiff: number;
      let issueToReturnDiff: number;
      try {
        issueToDueDiff = daysBetween(existing.issue_date, effectiveDueDate);
        issueToReturnDiff = daysBetween(existing.issue_date, returnDate);
      } catch (e) {
        return res.status(400).json({ error: (e as Error).message });
      }

      if (issueToDueDiff < 0) {
        return res.status(400).json({
          error: `Final Date (${effectiveDueDate}) cannot be earlier than Starting Date (${existing.issue_date}).`,
        });
      }

      if (issueToReturnDiff < 0) {
        return res.status(400).json({
          error: `Return Date (${returnDate}) cannot be earlier than Starting Date (${existing.issue_date}).`,
        });
      }

      const { lateDays, fineAmount } = calculateFine(effectiveDueDate, returnDate);

      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare(
          "UPDATE issue_records SET due_date = ?, return_date = ?, late_days = ?, fine_amount = ?, status = 'RETURNED' WHERE id = ?"
        ).run(effectiveDueDate, returnDate, lateDays, fineAmount, existing.id);

        if (existing.status === 'ISSUED') {
          db.prepare(
            'UPDATE books SET available_quantity = MIN(total_quantity, available_quantity + 1) WHERE UPPER(book_number) = UPPER(?)'
          ).run(existing.book_number);
        }

        db.exec('COMMIT;');
      } catch (txErr) {
        db.exec('ROLLBACK;');
        throw txErr;
      }

      const updated = db.prepare('SELECT * FROM issue_records WHERE id = ?').get(existing.id) as unknown as RawIssueRow;
      persistBackupFile(getTodayIso());

      res.json({
        message:
          lateDays > 0
            ? `Saved return date for ${updated.student_name}. ${lateDays} extra day(s) — Total Fine To Be Paid: ₹${fineAmount}.`
            : `Saved return date for ${updated.student_name}. Returned on time — Total Fine To Be Paid: ₹0.`,
        record: enrichRecord(updated, getTodayIso()),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 5c. Delete a saved record by Issue ID
  app.delete('/api/records/:issueId', (req, res) => {
    try {
      const targetIssueId = String(req.params.issueId ?? '').trim();
      const existing = db
        .prepare('SELECT * FROM issue_records WHERE issue_id = ?')
        .get(targetIssueId) as unknown as RawIssueRow | undefined;

      if (!existing) {
        return res.status(404).json({ error: `Saved record "${targetIssueId}" not found.` });
      }

      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare('DELETE FROM issue_records WHERE id = ?').run(existing.id);
        if (existing.status === 'ISSUED') {
          db.prepare(
            'UPDATE books SET available_quantity = MIN(total_quantity, available_quantity + 1) WHERE UPPER(book_number) = UPPER(?)'
          ).run(existing.book_number);
        }
        db.exec('COMMIT;');
      } catch (txErr) {
        db.exec('ROLLBACK;');
        throw txErr;
      }

      persistBackupFile(getTodayIso());
      res.json({
        message: `Deleted saved record for ${existing.student_name} (${existing.student_id}).`,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 5d. Delete all saved records
  app.delete('/api/records', (_req, res) => {
    try {
      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare('DELETE FROM issue_records').run();
        db.prepare('UPDATE books SET available_quantity = total_quantity').run();
        db.exec('COMMIT;');
      } catch (txErr) {
        db.exec('ROLLBACK;');
        throw txErr;
      }

      persistBackupFile(getTodayIso());
      res.json({ message: 'Cleared all saved student records.' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 6. Lookup active issued record for Return Book form
  app.get('/api/issue/lookup', (req, res) => {
    try {
      const studentId = String(req.query.studentId ?? '').trim().toUpperCase();
      const bookNumber = String(req.query.bookNumber ?? '').trim().toUpperCase();
      const today = getTodayIso();

      if (!studentId || !bookNumber) {
        return res.status(400).json({ error: 'Both Student ID and Book Number are required to look up an issued record.' });
      }

      const row = db
        .prepare(
          "SELECT * FROM issue_records WHERE UPPER(student_id) = UPPER(?) AND UPPER(book_number) = UPPER(?) AND status = 'ISSUED' ORDER BY id DESC LIMIT 1"
        )
        .get(studentId, bookNumber) as unknown as RawIssueRow | undefined;

      if (!row) {
        return res.status(404).json({
          error: `No active issued record found for Student ID "${studentId}" and Book Number "${bookNumber}".`,
        });
      }

      res.json({ record: enrichRecord(row, today) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 7. Return a Book and calculate ₹50/day fine
  app.post('/api/return', (req, res) => {
    try {
      const studentId = String(req.body.studentId ?? '').trim().toUpperCase();
      const bookNumber = String(req.body.bookNumber ?? '').trim().toUpperCase();
      const returnDate = String(req.body.returnDate ?? '').trim();
      const requestedDueDate = req.body.dueDate ? String(req.body.dueDate).trim() : '';

      if (!studentId || !bookNumber || !returnDate) {
        return res.status(400).json({ error: 'Student ID, Book Number, and Actual Return Date are required.' });
      }

      const active = db
        .prepare(
          "SELECT * FROM issue_records WHERE UPPER(student_id) = UPPER(?) AND UPPER(book_number) = UPPER(?) AND status = 'ISSUED' ORDER BY id DESC LIMIT 1"
        )
        .get(studentId, bookNumber) as unknown as RawIssueRow | undefined;

      if (!active) {
        return res.status(404).json({
          error: `No active issued record found for Student "${studentId}" and Book "${bookNumber}".`,
        });
      }

      const effectiveDueDate = requestedDueDate || active.due_date;

      let issueToDueDiff: number;
      let issueToReturnDiff: number;
      try {
        issueToDueDiff = daysBetween(active.issue_date, effectiveDueDate);
        issueToReturnDiff = daysBetween(active.issue_date, returnDate);
      } catch (e) {
        return res.status(400).json({ error: (e as Error).message });
      }

      if (issueToDueDiff < 0) {
        return res.status(400).json({
          error: `Final Date (${effectiveDueDate}) cannot be earlier than Starting Issue Date (${active.issue_date}).`,
        });
      }

      if (issueToReturnDiff < 0) {
        return res.status(400).json({
          error: `Actual Return Date (${returnDate}) cannot be earlier than Starting Issue Date (${active.issue_date}).`,
        });
      }

      const { lateDays, fineAmount } = calculateFine(effectiveDueDate, returnDate);

      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare(
          "UPDATE issue_records SET due_date = ?, return_date = ?, late_days = ?, fine_amount = ?, status = 'RETURNED' WHERE id = ?"
        ).run(effectiveDueDate, returnDate, lateDays, fineAmount, active.id);

        db.prepare(
          'UPDATE books SET available_quantity = MIN(total_quantity, available_quantity + 1) WHERE UPPER(book_number) = UPPER(?)'
        ).run(active.book_number);

        db.exec('COMMIT;');
      } catch (txErr) {
        db.exec('ROLLBACK;');
        throw txErr;
      }

      const updated = db.prepare('SELECT * FROM issue_records WHERE id = ?').get(active.id) as unknown as RawIssueRow;
      persistBackupFile(getTodayIso());

      res.json({
        message:
          lateDays > 0
            ? `Book returned ${lateDays} day(s) late. Total Fine: ₹${fineAmount}.`
            : 'Book returned on time. No fine applicable (₹0).',
        summary: {
          issueId: updated.issue_id,
          studentName: updated.student_name,
          studentId: updated.student_id,
          bookName: updated.book_name,
          bookNumber: updated.book_number,
          issueDate: updated.issue_date,
          dueDate: updated.due_date,
          returnDate: updated.return_date,
          lateDays,
          finePerDay: FINE_PER_DAY,
          totalFineAmount: fineAmount,
        },
        record: enrichRecord(updated, getTodayIso()),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 8. Export CSV (and save local backup file via File I/O)
  app.get('/api/export/csv', (_req, res) => {
    try {
      const today = getTodayIso();
      const csv = buildRecordsCsv(today);
      persistBackupFile(today);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="library_records_${today}.csv"`);
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Mount Vite dev middleware or serve static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Library Management System listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
