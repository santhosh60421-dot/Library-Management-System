package com.library.service;

import com.library.model.Book;
import com.library.model.IssueRecord;
import com.library.model.Librarian;
import com.library.model.Student;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;

/**
 * Core Library service demonstrating ArrayList and HashMap Java Collections
 * synchronized with SQLite persistence.
 */
@Service
public class Library {

    private final DatabaseManager dbManager;
    private final FineCalculator fineCalculator;
    private final FileRecordManager fileRecordManager;

    private final ArrayList<Book> bookList = new ArrayList<>();
    private final ArrayList<Student> studentList = new ArrayList<>();
    private final ArrayList<IssueRecord> issueRecordList = new ArrayList<>();

    private final HashMap<String, Book> bookIndexByNumber = new HashMap<>();
    private final HashMap<String, Student> studentIndexById = new HashMap<>();

    private final Librarian headLibrarian = new Librarian("LIB-001", "Central Librarian", "Library", "library@college.edu", "Day");

    public Library(DatabaseManager dbManager, FineCalculator fineCalculator, FileRecordManager fileRecordManager) {
        this.dbManager = dbManager;
        this.fineCalculator = fineCalculator;
        this.fileRecordManager = fileRecordManager;
    }

    @PostConstruct
    public synchronized void refreshCollectionsFromDatabase() {
        try {
            bookList.clear();
            studentList.clear();
            issueRecordList.clear();
            bookIndexByNumber.clear();
            studentIndexById.clear();

            bookList.addAll(dbManager.loadAllBooks());
            for (Book b : bookList) {
                bookIndexByNumber.put(b.getBookNumber().toUpperCase(), b);
            }

            studentList.addAll(dbManager.loadAllStudents());
            for (Student s : studentList) {
                studentIndexById.put(s.getStudentId().toUpperCase(), s);
            }

            LocalDate today = LocalDate.now();
            List<IssueRecord> loaded = dbManager.loadAllIssueRecords();
            for (IssueRecord r : loaded) {
                enrichOverdueStatus(r, today);
                issueRecordList.add(r);
            }
            enrichStudentStats();
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to sync library collections: " + e.getMessage(), e);
        }
    }

    private void enrichOverdueStatus(IssueRecord r, LocalDate today) {
        if ("ISSUED".equalsIgnoreCase(r.getRawStatus())) {
            LocalDate due = LocalDate.parse(r.getDueDate());
            FineCalculator.FineResult pending = fineCalculator.calculatePendingOverdue(due, today);
            if (pending.getLateDays() > 0) {
                r.setStatus("OVERDUE");
                r.setLateDays((int) pending.getLateDays());
                r.setFineAmount((int) pending.getTotalFine());
            } else {
                r.setStatus("ISSUED");
            }
        } else {
            r.setStatus("RETURNED");
        }
    }

    private void enrichStudentStats() {
        for (Student s : studentList) {
            int active = 0;
            int total = 0;
            int pendingFines = 0;
            int paidFines = 0;
            for (IssueRecord r : issueRecordList) {
                if (r.getStudentId().equalsIgnoreCase(s.getStudentId())) {
                    total++;
                    if ("ISSUED".equalsIgnoreCase(r.getRawStatus())) {
                        active++;
                        if ("OVERDUE".equalsIgnoreCase(r.getStatus())) {
                            pendingFines += r.getFineAmount();
                        }
                    } else {
                        paidFines += r.getFineAmount();
                    }
                }
            }
            s.setActiveIssuedCount(active);
            s.setTotalBorrowedCount(total);
            s.setPendingFines(pendingFines);
            s.setPaidFines(paidFines);
        }
    }

    public synchronized Map<String, Object> getDashboardData() {
        refreshCollectionsFromDatabase();
        int totalCopies = bookList.stream().mapToInt(Book::getTotalQuantity).sum();
        int availableCopies = bookList.stream().mapToInt(Book::getAvailableQuantity).sum();
        long currentlyIssued = issueRecordList.stream().filter(r -> "ISSUED".equals(r.getRawStatus())).count();
        long returnedBooks = issueRecordList.stream().filter(r -> "RETURNED".equals(r.getRawStatus())).count();
        List<IssueRecord> overdueRecords = issueRecordList.stream().filter(r -> "OVERDUE".equals(r.getStatus())).toList();
        int totalFineCollected = issueRecordList.stream()
                .filter(r -> "RETURNED".equals(r.getRawStatus()))
                .mapToInt(IssueRecord::getFineAmount)
                .sum();
        int pendingFineEstimate = overdueRecords.stream().mapToInt(IssueRecord::getFineAmount).sum();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalBooks", totalCopies);
        summary.put("totalTitles", bookList.size());
        summary.put("availableBooks", availableCopies);
        summary.put("totalStudents", studentList.size());
        summary.put("currentlyIssuedBooks", currentlyIssued);
        summary.put("returnedBooks", returnedBooks);
        summary.put("overdueBooks", overdueRecords.size());
        summary.put("totalFineCollected", totalFineCollected);
        summary.put("pendingFineEstimate", pendingFineEstimate);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("today", LocalDate.now().toString());
        response.put("finePerDay", FineCalculator.FINE_PER_DAY);
        response.put("librarian", headLibrarian.getRoleDescription());
        response.put("summary", summary);
        response.put("overdueRecords", overdueRecords);
        response.put("recentRecords", issueRecordList.stream().limit(8).toList());
        return response;
    }

    public synchronized List<Book> getBooks(String search) {
        refreshCollectionsFromDatabase();
        if (search == null || search.isBlank()) {
            return new ArrayList<>(bookList);
        }
        String q = search.trim().toLowerCase();
        return bookList.stream()
                .filter(b -> b.getBookNumber().toLowerCase().contains(q)
                        || b.getBookName().toLowerCase().contains(q)
                        || b.getAuthor().toLowerCase().contains(q))
                .toList();
    }

    public synchronized void addBook(String bookNumber, String bookName, String author, int quantity) throws SQLException {
        String key = bookNumber.trim().toUpperCase();
        if (bookIndexByNumber.containsKey(key)) {
            throw new IllegalStateException("Book Number \"" + key + "\" already exists.");
        }
        if (quantity < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1.");
        }
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO books (book_number, book_name, author, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?)")) {
            ps.setString(1, key);
            ps.setString(2, bookName.trim());
            ps.setString(3, author.trim());
            ps.setInt(4, quantity);
            ps.setInt(5, quantity);
            ps.executeUpdate();
        }
        refreshCollectionsFromDatabase();
    }

    public synchronized void updateBook(String bookNumber, String bookName, String author, int totalQuantity) throws SQLException {
        String key = bookNumber.trim().toUpperCase();
        Book existing = bookIndexByNumber.get(key);
        if (existing == null) {
            throw new NoSuchElementException("Book \"" + key + "\" not found.");
        }
        int issued = existing.getIssuedQuantity();
        if (totalQuantity < issued) {
            throw new IllegalArgumentException("Cannot reduce quantity below currently issued count (" + issued + ").");
        }
        int newAvailable = totalQuantity - issued;
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE books SET book_name = ?, author = ?, total_quantity = ?, available_quantity = ? WHERE UPPER(book_number) = ?")) {
            ps.setString(1, bookName.trim());
            ps.setString(2, author.trim());
            ps.setInt(3, totalQuantity);
            ps.setInt(4, newAvailable);
            ps.setString(5, key);
            ps.executeUpdate();
        }
        refreshCollectionsFromDatabase();
    }

    public synchronized void deleteBook(String bookNumber) throws SQLException {
        String key = bookNumber.trim().toUpperCase();
        Book existing = bookIndexByNumber.get(key);
        if (existing == null) {
            throw new NoSuchElementException("Book \"" + key + "\" not found.");
        }
        if (existing.getIssuedQuantity() > 0) {
            throw new IllegalStateException("Cannot delete book \"" + existing.getBookName() + "\" because copies are currently issued.");
        }
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement("DELETE FROM books WHERE UPPER(book_number) = ?")) {
            ps.setString(1, key);
            ps.executeUpdate();
        }
        refreshCollectionsFromDatabase();
    }

    public synchronized List<Student> getStudents(String search) {
        refreshCollectionsFromDatabase();
        if (search == null || search.isBlank()) {
            return new ArrayList<>(studentList);
        }
        String q = search.trim().toLowerCase();
        return studentList.stream()
                .filter(s -> s.getStudentId().toLowerCase().contains(q)
                        || s.getStudentName().toLowerCase().contains(q)
                        || s.getDepartment().toLowerCase().contains(q))
                .toList();
    }

    public synchronized void addStudent(String studentId, String studentName, String department, String email) throws SQLException {
        String key = studentId.trim().toUpperCase();
        if (studentIndexById.containsKey(key)) {
            throw new IllegalStateException("Student ID \"" + key + "\" is already registered.");
        }
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO students (student_id, student_name, department, email) VALUES (?, ?, ?, ?)")) {
            ps.setString(1, key);
            ps.setString(2, studentName.trim());
            ps.setString(3, department == null || department.isBlank() ? "General" : department.trim());
            ps.setString(4, email == null ? "" : email.trim());
            ps.executeUpdate();
        }
        refreshCollectionsFromDatabase();
    }

    public synchronized void updateStudent(String studentId, String studentName, String department, String email) throws SQLException {
        String key = studentId.trim().toUpperCase();
        if (!studentIndexById.containsKey(key)) {
            throw new NoSuchElementException("Student ID \"" + key + "\" not found.");
        }
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE students SET student_name = ?, department = ?, email = ? WHERE UPPER(student_id) = ?")) {
            ps.setString(1, studentName.trim());
            ps.setString(2, department == null || department.isBlank() ? "General" : department.trim());
            ps.setString(3, email == null ? "" : email.trim());
            ps.setString(4, key);
            ps.executeUpdate();
        }
        refreshCollectionsFromDatabase();
    }

    public synchronized void deleteStudent(String studentId) throws SQLException {
        String key = studentId.trim().toUpperCase();
        Student s = studentIndexById.get(key);
        if (s == null) {
            throw new NoSuchElementException("Student ID \"" + key + "\" not found.");
        }
        if (s.getActiveIssuedCount() > 0) {
            throw new IllegalStateException("Cannot delete student with unreturned books.");
        }
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement("DELETE FROM students WHERE UPPER(student_id) = ?")) {
            ps.setString(1, key);
            ps.executeUpdate();
        }
        refreshCollectionsFromDatabase();
    }

    public synchronized List<IssueRecord> getRecords(String search, String status, String sort) {
        refreshCollectionsFromDatabase();
        String q = search == null ? "" : search.trim().toLowerCase();
        String st = status == null ? "ALL" : status.trim().toUpperCase();

        List<IssueRecord> filtered = new ArrayList<>(issueRecordList.stream()
                .filter(r -> {
                    if ("ISSUED".equals(st) && !"ISSUED".equals(r.getRawStatus())) return false;
                    if ("RETURNED".equals(st) && !"RETURNED".equals(r.getRawStatus())) return false;
                    if ("OVERDUE".equals(st) && !"OVERDUE".equals(r.getStatus())) return false;
                    if (q.isEmpty()) return true;
                    return r.getStudentId().toLowerCase().contains(q)
                            || r.getStudentName().toLowerCase().contains(q)
                            || r.getBookNumber().toLowerCase().contains(q)
                            || r.getBookName().toLowerCase().contains(q)
                            || r.getIssueId().toLowerCase().contains(q);
                })
                .toList());

        if ("oldest".equalsIgnoreCase(sort)) {
            filtered.sort(Comparator.comparing(IssueRecord::getIssueDate).thenComparingInt(IssueRecord::getId));
        } else if ("due_asc".equalsIgnoreCase(sort)) {
            filtered.sort(Comparator.comparing(IssueRecord::getDueDate).thenComparingInt(IssueRecord::getId));
        } else {
            filtered.sort(Comparator.comparing(IssueRecord::getIssueDate).reversed().thenComparingInt(IssueRecord::getId).reversed());
        }
        return filtered;
    }

    public synchronized IssueRecord issueBook(String studentId, String studentName, String bookNumber, String bookName,
                                              String issueDateStr, String dueDateStr, String returnDateStr) throws SQLException, IOException {
        LocalDate issueDate = LocalDate.parse(issueDateStr);
        LocalDate dueDate = LocalDate.parse(dueDateStr);
        if (dueDate.isBefore(issueDate)) {
            throw new IllegalArgumentException("Final Date (Due Date) cannot be earlier than Starting Date (Issue Date).");
        }

        boolean hasReturnDate = returnDateStr != null && !returnDateStr.isBlank();
        int lateDays = 0;
        int fineAmount = 0;
        LocalDate returnDate = null;
        if (hasReturnDate) {
            returnDate = LocalDate.parse(returnDateStr);
            FineCalculator.FineResult fine = fineCalculator.calculate(issueDate, dueDate, returnDate);
            lateDays = (int) fine.getLateDays();
            fineAmount = (int) fine.getTotalFine();
        }

        String sid = studentId.trim().toUpperCase();
        String bnum = bookNumber.trim().toUpperCase();
        String cleanStudentName = studentName.trim();
        String cleanBookName = bookName.trim();

        refreshCollectionsFromDatabase();

        if (!bookIndexByNumber.containsKey(bnum)) {
            addBook(bnum, cleanBookName, "Library Catalog", 1);
        }

        if (!studentIndexById.containsKey(sid)) {
            addStudent(sid, cleanStudentName, "General", "");
        }

        String issueId = "ISS-" + LocalDate.now().getYear() + "-" + (1001 + issueRecordList.size());
        String status = hasReturnDate ? "RETURNED" : "ISSUED";

        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO issue_records (issue_id, student_id, student_name, book_number, book_name, issue_date, due_date, return_date, late_days, fine_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
                    ps.setString(1, issueId);
                    ps.setString(2, sid);
                    ps.setString(3, cleanStudentName);
                    ps.setString(4, bnum);
                    ps.setString(5, cleanBookName);
                    ps.setString(6, issueDate.toString());
                    ps.setString(7, dueDate.toString());
                    if (hasReturnDate) {
                        ps.setString(8, returnDate.toString());
                    } else {
                        ps.setNull(8, Types.VARCHAR);
                    }
                    ps.setInt(9, lateDays);
                    ps.setInt(10, fineAmount);
                    ps.setString(11, status);
                    ps.executeUpdate();
                }

                if (!hasReturnDate) {
                    try (PreparedStatement ps = conn.prepareStatement(
                            "UPDATE books SET available_quantity = MAX(0, available_quantity - 1) WHERE UPPER(book_number) = ?")) {
                        ps.setString(1, bnum);
                        ps.executeUpdate();
                    }
                }
                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }

        refreshCollectionsFromDatabase();
        fileRecordManager.exportToCsvAndBackup(issueRecordList);
        return issueRecordList.stream().filter(r -> r.getIssueId().equals(issueId)).findFirst().orElseThrow();
    }

    public synchronized IssueRecord returnByIssueId(String issueId, String returnDateStr, String dueDateOverride)
            throws SQLException, IOException {
        refreshCollectionsFromDatabase();
        IssueRecord existing = issueRecordList.stream()
                .filter(r -> r.getIssueId().equalsIgnoreCase(issueId.trim()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Saved record \"" + issueId + "\" not found."));

        LocalDate issueDate = LocalDate.parse(existing.getIssueDate());
        LocalDate dueDate = (dueDateOverride != null && !dueDateOverride.isBlank())
                ? LocalDate.parse(dueDateOverride)
                : LocalDate.parse(existing.getDueDate());
        LocalDate returnDate = LocalDate.parse(returnDateStr);

        FineCalculator.FineResult fineResult = fineCalculator.calculate(issueDate, dueDate, returnDate);

        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE issue_records SET due_date = ?, return_date = ?, late_days = ?, fine_amount = ?, status = 'RETURNED' WHERE issue_id = ?")) {
                    ps.setString(1, dueDate.toString());
                    ps.setString(2, returnDate.toString());
                    ps.setInt(3, (int) fineResult.getLateDays());
                    ps.setInt(4, (int) fineResult.getTotalFine());
                    ps.setString(5, existing.getIssueId());
                    ps.executeUpdate();
                }

                if ("ISSUED".equalsIgnoreCase(existing.getRawStatus())) {
                    try (PreparedStatement ps = conn.prepareStatement(
                            "UPDATE books SET available_quantity = MIN(total_quantity, available_quantity + 1) WHERE UPPER(book_number) = ?")) {
                        ps.setString(1, existing.getBookNumber().toUpperCase());
                        ps.executeUpdate();
                    }
                }
                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }

        refreshCollectionsFromDatabase();
        fileRecordManager.exportToCsvAndBackup(issueRecordList);
        return issueRecordList.stream().filter(r -> r.getIssueId().equals(existing.getIssueId())).findFirst().orElseThrow();
    }

    public synchronized void deleteRecordByIssueId(String issueId) throws SQLException, IOException {
        refreshCollectionsFromDatabase();
        IssueRecord existing = issueRecordList.stream()
                .filter(r -> r.getIssueId().equalsIgnoreCase(issueId.trim()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Saved record \"" + issueId + "\" not found."));

        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement("DELETE FROM issue_records WHERE issue_id = ?")) {
                    ps.setString(1, existing.getIssueId());
                    ps.executeUpdate();
                }
                if ("ISSUED".equalsIgnoreCase(existing.getRawStatus())) {
                    try (PreparedStatement ps = conn.prepareStatement(
                            "UPDATE books SET available_quantity = MIN(total_quantity, available_quantity + 1) WHERE UPPER(book_number) = ?")) {
                        ps.setString(1, existing.getBookNumber().toUpperCase());
                        ps.executeUpdate();
                    }
                }
                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }

        refreshCollectionsFromDatabase();
        fileRecordManager.exportToCsvAndBackup(issueRecordList);
    }

    public synchronized void deleteAllRecords() throws SQLException, IOException {
        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (Statement st = conn.createStatement()) {
                    st.executeUpdate("DELETE FROM issue_records");
                    st.executeUpdate("UPDATE books SET available_quantity = total_quantity");
                }
                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }
        refreshCollectionsFromDatabase();
        fileRecordManager.exportToCsvAndBackup(issueRecordList);
    }

    public synchronized IssueRecord lookupActiveIssue(String studentId, String bookNumber) {
        refreshCollectionsFromDatabase();
        return issueRecordList.stream()
                .filter(r -> r.getStudentId().equalsIgnoreCase(studentId.trim())
                        && r.getBookNumber().equalsIgnoreCase(bookNumber.trim())
                        && "ISSUED".equalsIgnoreCase(r.getRawStatus()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("No active issued record found for Student " + studentId + " and Book " + bookNumber));
    }

    public synchronized Map<String, Object> returnBook(String studentId, String bookNumber, String returnDateStr, String dueDateOverride)
            throws SQLException, IOException {
        IssueRecord active = lookupActiveIssue(studentId, bookNumber);
        IssueRecord updated = returnByIssueId(active.getIssueId(), returnDateStr, dueDateOverride);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("issueId", updated.getIssueId());
        summary.put("studentName", updated.getStudentName());
        summary.put("studentId", updated.getStudentId());
        summary.put("bookName", updated.getBookName());
        summary.put("bookNumber", updated.getBookNumber());
        summary.put("issueDate", updated.getIssueDate());
        summary.put("dueDate", updated.getDueDate());
        summary.put("returnDate", updated.getReturnDate());
        summary.put("lateDays", updated.getLateDays());
        summary.put("finePerDay", FineCalculator.FINE_PER_DAY);
        summary.put("totalFineAmount", updated.getFineAmount());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", summary);
        result.put("record", updated);
        result.put("message", updated.getLateDays() > 0
                ? "Book returned " + updated.getLateDays() + " day(s) late. Total Fine To Be Paid: INR " + updated.getFineAmount()
                : "Book returned on time. Total Fine To Be Paid: INR 0.");
        return result;
    }

    public synchronized String exportRecordsCsv() throws IOException {
        refreshCollectionsFromDatabase();
        fileRecordManager.exportToCsvAndBackup(issueRecordList);
        return fileRecordManager.buildCsvContent(issueRecordList);
    }

    public synchronized List<String> readExportedBackup() throws IOException {
        return fileRecordManager.readExportedRecords();
    }
}
