package com.library.model;

/**
 * Student class extending Person (Inheritance + Encapsulation).
 */
public class Student extends Person {
    private int id;
    private String studentId;
    private int activeIssuedCount;
    private int totalBorrowedCount;
    private int pendingFines;
    private int paidFines;

    public Student() {
        super();
    }

    public Student(String studentId, String name, String department, String email) {
        super(name, email, department);
        this.studentId = studentId;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return getName();
    }

    public void setStudentName(String studentName) {
        setName(studentName);
    }

    public int getActiveIssuedCount() {
        return activeIssuedCount;
    }

    public void setActiveIssuedCount(int activeIssuedCount) {
        this.activeIssuedCount = activeIssuedCount;
    }

    public int getTotalBorrowedCount() {
        return totalBorrowedCount;
    }

    public void setTotalBorrowedCount(int totalBorrowedCount) {
        this.totalBorrowedCount = totalBorrowedCount;
    }

    public int getPendingFines() {
        return pendingFines;
    }

    public void setPendingFines(int pendingFines) {
        this.pendingFines = pendingFines;
    }

    public int getPaidFines() {
        return paidFines;
    }

    public void setPaidFines(int paidFines) {
        this.paidFines = paidFines;
    }

    @Override
    public String getRoleDescription() {
        return "Student Member (" + studentId + ")";
    }
}
