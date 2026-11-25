package com.library.service;

import com.library.model.IssueRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Demonstrates Java File I/O (BufferedWriter/FileWriter and BufferedReader/FileReader)
 * to export CSV records, save TXT backups, and read previously exported records.
 */
@Service
public class FileRecordManager {

    @Value("${library.export.dir:exports}")
    private String exportDir;

    public String buildCsvContent(List<IssueRecord> records) {
        StringBuilder sb = new StringBuilder();
        sb.append("S.No.,Issue ID,Student Name,Student ID,Book Name,Book Number,Starting Date,Final Date,Return Date,Late Days,Fine Amount (INR),Status\n");
        for (int i = 0; i < records.size(); i++) {
            IssueRecord r = records.get(i);
            sb.append(i + 1).append(',')
              .append(escapeCsv(r.getIssueId())).append(',')
              .append(escapeCsv(r.getStudentName())).append(',')
              .append(escapeCsv(r.getStudentId())).append(',')
              .append(escapeCsv(r.getBookName())).append(',')
              .append(escapeCsv(r.getBookNumber())).append(',')
              .append(escapeCsv(r.getIssueDate())).append(',')
              .append(escapeCsv(r.getDueDate())).append(',')
              .append(escapeCsv(r.getReturnDate() != null ? r.getReturnDate() : "Not Returned")).append(',')
              .append(r.getLateDays()).append(',')
              .append(r.getFineAmount()).append(',')
              .append(escapeCsv(r.getStatus()))
              .append('\n');
        }
        return sb.toString();
    }

    public Path exportToCsvAndBackup(List<IssueRecord> records) throws IOException {
        Path dir = Paths.get(exportDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }

        Path csvPath = dir.resolve("library_records.csv");
        try (BufferedWriter writer = new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(csvPath.toFile()), StandardCharsets.UTF_8))) {
            writer.write(buildCsvContent(records));
        }

        Path txtBackupPath = dir.resolve("library_backup.txt");
        try (BufferedWriter writer = new BufferedWriter(
                new FileWriter(txtBackupPath.toFile(), StandardCharsets.UTF_8))) {
            writer.write("LIBRARY MANAGEMENT SYSTEM - TRANSACTION BACKUP\n");
            writer.write("=========================================================================\n");
            for (IssueRecord r : records) {
                writer.write(String.format("%s | %s (%s) | %s (%s) | Issue: %s | Due: %s | Return: %s | Late: %dd | Fine: INR %d | %s%n",
                        r.getIssueId(),
                        r.getStudentName(), r.getStudentId(),
                        r.getBookName(), r.getBookNumber(),
                        r.getIssueDate(), r.getDueDate(),
                        r.getReturnDate() != null ? r.getReturnDate() : "Pending",
                        r.getLateDays(), r.getFineAmount(), r.getStatus()));
            }
        }

        return csvPath;
    }

    public List<String> readExportedRecords() throws IOException {
        Path csvPath = Paths.get(exportDir).resolve("library_records.csv");
        List<String> lines = new ArrayList<>();
        if (!Files.exists(csvPath)) {
            return lines;
        }
        try (BufferedReader reader = new BufferedReader(
                new FileReader(csvPath.toFile(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        }
        return lines;
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
