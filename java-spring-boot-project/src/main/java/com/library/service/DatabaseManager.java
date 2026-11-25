package com.library.service;

import com.library.model.Book;
import com.library.model.IssueRecord;
import com.library.model.Student;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Manages SQLite JDBC connection, schema initialization, and persistent CRUD queries.
 */
@Repository
public class DatabaseManager {

    @Value("${library.db.path:library.db}")
    private String dbPath;

    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection("jdbc:sqlite:" + dbPath);
    }

    @PostConstruct
    public void initializeDatabase() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA foreign_keys = ON;");

            stmt.execute("""
                CREATE TABLE IF NOT EXISTS books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    book_number TEXT NOT NULL UNIQUE,
                    book_name TEXT NOT NULL,
                    author TEXT NOT NULL,
                    total_quantity INTEGER NOT NULL CHECK (total_quantity >= 1),
                    available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            """);

            stmt.execute("""
                CREATE TABLE IF NOT EXISTS students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL UNIQUE,
                    student_name TEXT NOT NULL,
                    department TEXT NOT NULL DEFAULT 'Computer Science',
                    email TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            """);

            stmt.execute("""
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
            """);

            seedIfEmpty(conn);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to initialize SQLite database: " + e.getMessage(), e);
        }
    }

    private void seedIfEmpty(Connection conn) throws SQLException {
        int totalCount = 0;
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery("SELECT (SELECT COUNT(*) FROM books) + (SELECT COUNT(*) FROM students) + (SELECT COUNT(*) FROM issue_records)")) {
            if (rs.next()) {
                totalCount = rs.getInt(1);
            }
        }
        if (totalCount > 0) {
            return;
        }

        LocalDate today = LocalDate.now();

        String[][] books = {
            {"BK-101", "Clean Code: A Handbook of Agile Software Craftsmanship", "Robert C. Martin", "4", "3"},
            {"BK-102", "Introduction to Algorithms (CLRS)", "Thomas H. Cormen", "3", "2"},
            {"BK-103", "Operating System Concepts", "Abraham Silberschatz", "5", "4"},
            {"BK-104", "Database System Concepts", "Henry F. Korth", "3", "3"},
            {"BK-105", "Effective Java (3rd Edition)", "Joshua Bloch", "2", "2"}
        };

        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO books (book_number, book_name, author, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?)")) {
            for (String[] b : books) {
                ps.setString(1, b[0]);
                ps.setString(2, b[1]);
                ps.setString(3, b[2]);
                ps.setInt(4, Integer.parseInt(b[3]));
                ps.setInt(5, Integer.parseInt(b[4]));
                ps.executeUpdate();
            }
        }

        String[][] students = {
            {"CS2024001", "Aarav Sharma", "Computer Science", "aarav.sharma@college.edu"},
            {"CS2024002", "Priya Nair", "Computer Science", "priya.nair@college.edu"},
            {"EC2024014", "Rohan Kulkarni", "Electronics", "rohan.k@college.edu"},
            {"IT2024008", "Meera Krishnan", "Information Tech", "meera.k@college.edu"}
        };

        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO students (student_id, student_name, department, email) VALUES (?, ?, ?, ?)")) {
            for (String[] s : students) {
                ps.setString(1, s[0]);
                ps.setString(2, s[1]);
                ps.setString(3, s[2]);
                ps.setString(4, s[3]);
                ps.executeUpdate();
            }
        }

        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO issue_records (issue_id, student_id, student_name, book_number, book_name, issue_date, due_date, return_date, late_days, fine_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            // Overdue sample
            ps.setString(1, "ISS-2026-1001");
            ps.setString(2, "CS2024001");
            ps.setString(3, "Aarav Sharma");
            ps.setString(4, "BK-101");
            ps.setString(5, "Clean Code: A Handbook of Agile Software Craftsmanship");
            ps.setString(6, today.minusDays(19).toString());
            ps.setString(7, today.minusDays(5).toString());
            ps.setNull(8, Types.VARCHAR);
            ps.setInt(9, 0);
            ps.setInt(10, 0);
            ps.setString(11, "ISSUED");
            ps.executeUpdate();

            // Active issued sample
            ps.setString(1, "ISS-2026-1002");
            ps.setString(2, "CS2024002");
            ps.setString(3, "Priya Nair");
            ps.setString(4, "BK-103");
            ps.setString(5, "Operating System Concepts");
            ps.setString(6, today.minusDays(3).toString());
            ps.setString(7, today.plusDays(11).toString());
            ps.setNull(8, Types.VARCHAR);
            ps.setInt(9, 0);
            ps.setInt(10, 0);
            ps.setString(11, "ISSUED");
            ps.executeUpdate();

            // Returned with ₹250 fine (5 extra days)
            ps.setString(1, "ISS-2026-1003");
            ps.setString(2, "IT2024008");
            ps.setString(3, "Meera Krishnan");
            ps.setString(4, "BK-102");
            ps.setString(5, "Introduction to Algorithms (CLRS)");
            ps.setString(6, today.minusDays(25).toString());
            ps.setString(7, today.minusDays(15).toString());
            ps.setString(8, today.minusDays(10).toString());
            ps.setInt(9, 5);
            ps.setInt(10, 250);
            ps.setString(11, "RETURNED");
            ps.executeUpdate();
        }
    }

    public List<Book> loadAllBooks() throws SQLException {
        List<Book> list = new ArrayList<>();
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM books ORDER BY id DESC")) {
            while (rs.next()) {
                Book b = new Book();
                b.setId(rs.getInt("id"));
                b.setBookNumber(rs.getString("book_number"));
                b.setBookName(rs.getString("book_name"));
                b.setAuthor(rs.getString("author"));
                b.setTotalQuantity(rs.getInt("total_quantity"));
                b.setAvailableQuantity(rs.getInt("available_quantity"));
                list.add(b);
            }
        }
        return list;
    }

    public List<Student> loadAllStudents() throws SQLException {
        List<Student> list = new ArrayList<>();
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM students ORDER BY id DESC")) {
            while (rs.next()) {
                Student s = new Student();
                s.setId(rs.getInt("id"));
                s.setStudentId(rs.getString("student_id"));
                s.setStudentName(rs.getString("student_name"));
                s.setDepartment(rs.getString("department"));
                s.setEmail(rs.getString("email"));
                list.add(s);
            }
        }
        return list;
    }

    public List<IssueRecord> loadAllIssueRecords() throws SQLException {
        List<IssueRecord> list = new ArrayList<>();
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM issue_records ORDER BY id DESC")) {
            while (rs.next()) {
                IssueRecord r = new IssueRecord();
                r.setId(rs.getInt("id"));
                r.setIssueId(rs.getString("issue_id"));
                r.setStudentId(rs.getString("student_id"));
                r.setStudentName(rs.getString("student_name"));
                r.setBookNumber(rs.getString("book_number"));
                r.setBookName(rs.getString("book_name"));
                r.setIssueDate(rs.getString("issue_date"));
                r.setDueDate(rs.getString("due_date"));
                r.setReturnDate(rs.getString("return_date"));
                r.setLateDays(rs.getInt("late_days"));
                r.setFineAmount(rs.getInt("fine_amount"));
                r.setRawStatus(rs.getString("status"));
                r.setStatus(rs.getString("status"));
                list.add(r);
            }
        }
        return list;
    }
}
