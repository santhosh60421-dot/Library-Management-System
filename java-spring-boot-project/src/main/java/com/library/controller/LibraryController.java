package com.library.controller;

import com.library.model.Book;
import com.library.model.IssueRecord;
import com.library.model.Student;
import com.library.service.Library;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
public class LibraryController {

    private final Library library;

    public LibraryController(Library library) {
        this.library = library;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        return ResponseEntity.ok(library.getDashboardData());
    }

    @GetMapping("/books")
    public ResponseEntity<?> getBooks(@RequestParam(required = false) String search) {
        List<Book> books = library.getBooks(search);
        return ResponseEntity.ok(Map.of("books", books));
    }

    @PostMapping("/books")
    public ResponseEntity<?> addBook(@RequestBody Map<String, Object> body) {
        try {
            String bookNumber = String.valueOf(body.getOrDefault("bookNumber", ""));
            String bookName = String.valueOf(body.getOrDefault("bookName", ""));
            String author = String.valueOf(body.getOrDefault("author", ""));
            int quantity = Integer.parseInt(String.valueOf(body.getOrDefault("quantity", "1")));
            library.addBook(bookNumber, bookName, author, quantity);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Book \"" + bookName + "\" added successfully."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/books/{bookNumber}")
    public ResponseEntity<?> updateBook(@PathVariable String bookNumber, @RequestBody Map<String, Object> body) {
        try {
            String bookName = String.valueOf(body.getOrDefault("bookName", ""));
            String author = String.valueOf(body.getOrDefault("author", ""));
            int quantity = Integer.parseInt(String.valueOf(body.getOrDefault("quantity", "1")));
            library.updateBook(bookNumber, bookName, author, quantity);
            return ResponseEntity.ok(Map.of("message", "Book \"" + bookNumber + "\" updated successfully."));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/books/{bookNumber}")
    public ResponseEntity<?> deleteBook(@PathVariable String bookNumber) {
        try {
            library.deleteBook(bookNumber);
            return ResponseEntity.ok(Map.of("message", "Book \"" + bookNumber + "\" deleted successfully."));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/students")
    public ResponseEntity<?> getStudents(@RequestParam(required = false) String search) {
        List<Student> students = library.getStudents(search);
        List<IssueRecord> allRecords = library.getRecords(null, "ALL", "newest");
        List<Map<String, Object>> mapped = students.stream().map(s -> {
            List<IssueRecord> history = allRecords.stream()
                    .filter(r -> r.getStudentId().equalsIgnoreCase(s.getStudentId()))
                    .toList();
            return Map.<String, Object>of(
                    "studentId", s.getStudentId(),
                    "studentName", s.getStudentName(),
                    "department", s.getDepartment(),
                    "email", s.getEmail(),
                    "activeIssuedCount", s.getActiveIssuedCount(),
                    "totalBorrowedCount", s.getTotalBorrowedCount(),
                    "pendingFines", s.getPendingFines(),
                    "paidFines", s.getPaidFines(),
                    "history", history
            );
        }).toList();
        return ResponseEntity.ok(Map.of("students", mapped));
    }

    @PostMapping("/students")
    public ResponseEntity<?> addStudent(@RequestBody Map<String, String> body) {
        try {
            String studentId = body.getOrDefault("studentId", "");
            String studentName = body.getOrDefault("studentName", "");
            String department = body.getOrDefault("department", "General");
            String email = body.getOrDefault("email", "");
            library.addStudent(studentId, studentName, department, email);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Student \"" + studentName + "\" registered successfully."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/students/{studentId}")
    public ResponseEntity<?> updateStudent(@PathVariable String studentId, @RequestBody Map<String, String> body) {
        try {
            library.updateStudent(
                    studentId,
                    body.getOrDefault("studentName", ""),
                    body.getOrDefault("department", "General"),
                    body.getOrDefault("email", "")
            );
            return ResponseEntity.ok(Map.of("message", "Student \"" + studentId + "\" updated successfully."));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/students/{studentId}")
    public ResponseEntity<?> deleteStudent(@PathVariable String studentId) {
        try {
            library.deleteStudent(studentId);
            return ResponseEntity.ok(Map.of("message", "Student \"" + studentId + "\" deleted successfully."));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/records")
    public ResponseEntity<?> getRecords(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "newest") String sort) {
        return ResponseEntity.ok(Map.of(
                "records", library.getRecords(search, status, sort),
                "today", LocalDate.now().toString()
        ));
    }

    @PostMapping("/issue")
    public ResponseEntity<?> issueBook(@RequestBody Map<String, String> body) {
        try {
            IssueRecord record = library.issueBook(
                    body.getOrDefault("studentId", ""),
                    body.getOrDefault("studentName", ""),
                    body.getOrDefault("bookNumber", ""),
                    body.getOrDefault("bookName", ""),
                    body.getOrDefault("issueDate", ""),
                    body.getOrDefault("dueDate", ""),
                    body.getOrDefault("returnDate", "")
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Book issued successfully (Issue ID: " + record.getIssueId() + ").",
                    "record", record
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/records/{issueId}/return")
    public ResponseEntity<?> updateRecordReturn(
            @PathVariable String issueId,
            @RequestBody Map<String, String> body) {
        try {
            IssueRecord updated = library.returnByIssueId(
                    issueId,
                    body.getOrDefault("returnDate", ""),
                    body.getOrDefault("dueDate", "")
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Saved return date for " + updated.getStudentName() + ". Total Fine To Be Paid: ₹" + updated.getFineAmount(),
                    "record", updated
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/records/{issueId}")
    public ResponseEntity<?> deleteRecord(@PathVariable String issueId) {
        try {
            library.deleteRecordByIssueId(issueId);
            return ResponseEntity.ok(Map.of("message", "Deleted saved record " + issueId + "."));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/records")
    public ResponseEntity<?> deleteAllRecords() {
        try {
            library.deleteAllRecords();
            return ResponseEntity.ok(Map.of("message", "Cleared all saved student records."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/issue/lookup")
    public ResponseEntity<?> lookupIssue(@RequestParam String studentId, @RequestParam String bookNumber) {
        try {
            IssueRecord record = library.lookupActiveIssue(studentId, bookNumber);
            return ResponseEntity.ok(Map.of("record", record));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/return")
    public ResponseEntity<?> returnBook(@RequestBody Map<String, String> body) {
        try {
            Map<String, Object> result = library.returnBook(
                    body.getOrDefault("studentId", ""),
                    body.getOrDefault("bookNumber", ""),
                    body.getOrDefault("returnDate", ""),
                    body.getOrDefault("dueDate", "")
            );
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv() {
        try {
            String csv = library.exportRecordsCsv();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv; charset=utf-8"));
            headers.set(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"library_records_" + LocalDate.now() + ".csv\"");
            return new ResponseEntity<>(csv, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error exporting CSV: " + e.getMessage());
        }
    }

    @GetMapping("/export/read-backup")
    public ResponseEntity<?> readBackup() {
        try {
            return ResponseEntity.ok(Map.of("lines", library.readExportedBackup()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
