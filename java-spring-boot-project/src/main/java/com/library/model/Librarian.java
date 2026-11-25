package com.library.model;

/**
 * Librarian class extending Person to demonstrate multi-subclass inheritance.
 */
public class Librarian extends Person {
    private String staffId;
    private String shift;

    public Librarian() {
        super();
    }

    public Librarian(String staffId, String name, String department, String email, String shift) {
        super(name, email, department);
        this.staffId = staffId;
        this.shift = shift;
    }

    public String getStaffId() {
        return staffId;
    }

    public void setStaffId(String staffId) {
        this.staffId = staffId;
    }

    public String getShift() {
        return shift;
    }

    public void setShift(String shift) {
        this.shift = shift;
    }

    @Override
    public String getRoleDescription() {
        return "Head Librarian (" + staffId + " - " + shift + " Shift)";
    }
}
