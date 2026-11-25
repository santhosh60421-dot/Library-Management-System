package com.library.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Calculates overdue days and fines using java.time.LocalDate and ChronoUnit.DAYS.between().
 * Fine Rule: Fine = Number of Extra Days * ₹50.
 */
@Service
public class FineCalculator {

    public static final int FINE_PER_DAY = 50;

    public static class FineResult {
        private final long lateDays;
        private final int finePerDay;
        private final long totalFine;

        public FineResult(long lateDays, int finePerDay, long totalFine) {
            this.lateDays = lateDays;
            this.finePerDay = finePerDay;
            this.totalFine = totalFine;
        }

        public long getLateDays() {
            return lateDays;
        }

        public int getFinePerDay() {
            return finePerDay;
        }

        public long getTotalFine() {
            return totalFine;
        }
    }

    public FineResult calculate(LocalDate issueDate, LocalDate dueDate, LocalDate returnDate) {
        if (issueDate == null || dueDate == null || returnDate == null) {
            throw new IllegalArgumentException("Issue date, due date, and return date must not be null.");
        }
        if (dueDate.isBefore(issueDate)) {
            throw new IllegalArgumentException("Final due date cannot be earlier than starting issue date.");
        }
        if (returnDate.isBefore(issueDate)) {
            throw new IllegalArgumentException("Return date cannot be earlier than starting issue date.");
        }

        long extraDays = ChronoUnit.DAYS.between(dueDate, returnDate);
        long lateDays = Math.max(0L, extraDays);
        long totalFine = lateDays * FINE_PER_DAY;
        return new FineResult(lateDays, FINE_PER_DAY, totalFine);
    }

    public FineResult calculatePendingOverdue(LocalDate dueDate, LocalDate currentDate) {
        long extraDays = ChronoUnit.DAYS.between(dueDate, currentDate);
        long lateDays = Math.max(0L, extraDays);
        return new FineResult(lateDays, FINE_PER_DAY, lateDays * FINE_PER_DAY);
    }
}
