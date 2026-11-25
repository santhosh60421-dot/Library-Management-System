package com.library.model;

/**
 * IssueRecord entity tracking issue, due, return dates, late days, and fines.
 */
public class IssueRecord {
    private int id;
    private String issueId;
    private String studentId;
    private String studentName;
    private String bookNumber;
    private String bookName;
    private String issueDate;
    private String dueDate;
    private String returnDate;
    private int lateDays;
    private int fineAmount;
    private String status;    // ISSUED, RETURNED, or OVERDUE (computed)
    private String rawStatus; // ISSUED or RETURNED stored in SQLite

    public IssueRecord() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getIssueId() {
        return issueId;
    }

    public void setIssueId(String issueId) {
        this.issueId = issueId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getBookNumber() {
        return bookNumber;
    }

    public void setBookNumber(String bookNumber) {
        this.bookNumber = bookNumber;
    }

    public String getBookName() {
        return bookName;
    }

    public void setBookName(String bookName) {
        this.bookName = bookName;
    }

    public String getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(String issueDate) {
        this.issueDate = issueDate;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public String getReturnDate() {
        return returnDate;
    }

    public void setReturnDate(String returnDate) {
        this.returnDate = returnDate;
    }

    public int getLateDays() {
        return lateDays;
    }

    public void setLateDays(int lateDays) {
        this.lateDays = lateDays;
    }

    public int getFineAmount() {
        return fineAmount;
    }

    public void setFineAmount(int fineAmount) {
        this.fineAmount = fineAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRawStatus() {
        return rawStatus;
    }

    public void setRawStatus(String rawStatus) {
        this.rawStatus = rawStatus;
    }
}
