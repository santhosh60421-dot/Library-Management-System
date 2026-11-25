package com.library.model;

/**
 * Book entity with private fields and getter/setter encapsulation.
 */
public class Book {
    private int id;
    private String bookNumber;
    private String bookName;
    private String author;
    private int totalQuantity;
    private int availableQuantity;

    public Book() {
    }

    public Book(String bookNumber, String bookName, String author, int totalQuantity, int availableQuantity) {
        this.bookNumber = bookNumber;
        this.bookName = bookName;
        this.author = author;
        this.totalQuantity = totalQuantity;
        this.availableQuantity = availableQuantity;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
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

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public int getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(int totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public int getAvailableQuantity() {
        return availableQuantity;
    }

    public void setAvailableQuantity(int availableQuantity) {
        this.availableQuantity = availableQuantity;
    }

    public int getIssuedQuantity() {
        return Math.max(0, totalQuantity - availableQuantity);
    }
}
