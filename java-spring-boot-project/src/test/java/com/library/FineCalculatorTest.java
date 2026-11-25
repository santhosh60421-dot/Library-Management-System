package com.library;

import com.library.service.FineCalculator;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class FineCalculatorTest {

    private final FineCalculator calculator = new FineCalculator();
    private final LocalDate issueDate = LocalDate.of(2026, 11, 1);
    private final LocalDate dueDate = LocalDate.of(2026, 11, 10);

    @Test
    void testReturnOnDueDateEqualsZero() {
        FineCalculator.FineResult result = calculator.calculate(issueDate, dueDate, LocalDate.of(2026, 11, 10));
        assertEquals(0, result.getLateDays());
        assertEquals(0, result.getTotalFine());
    }

    @Test
    void testReturnOneDayLateEquals50() {
        FineCalculator.FineResult result = calculator.calculate(issueDate, dueDate, LocalDate.of(2026, 11, 11));
        assertEquals(1, result.getLateDays());
        assertEquals(50, result.getTotalFine());
    }

    @Test
    void testReturnTwoDaysLateEquals100() {
        FineCalculator.FineResult result = calculator.calculate(issueDate, dueDate, LocalDate.of(2026, 11, 12));
        assertEquals(2, result.getLateDays());
        assertEquals(100, result.getTotalFine());
    }

    @Test
    void testReturnFiveDaysLateEquals250() {
        FineCalculator.FineResult result = calculator.calculate(issueDate, dueDate, LocalDate.of(2026, 11, 15));
        assertEquals(5, result.getLateDays());
        assertEquals(250, result.getTotalFine());
    }

    @Test
    void testReturnBeforeDueDateEqualsZero() {
        FineCalculator.FineResult result = calculator.calculate(issueDate, dueDate, LocalDate.of(2026, 11, 8));
        assertEquals(0, result.getLateDays());
        assertEquals(0, result.getTotalFine());
    }

    @Test
    void testReturnBeforeIssueDateThrowsException() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculate(issueDate, dueDate, LocalDate.of(2026, 10, 30)));
    }
}
