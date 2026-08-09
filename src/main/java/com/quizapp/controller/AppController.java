package com.quizapp.controller;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.quizapp.model.Question;
import com.quizapp.model.QuizAttempt;
import com.quizapp.model.QuizTest;
import com.quizapp.model.SystemLog;
import com.quizapp.model.User;
import com.quizapp.repository.AttemptRepository;
import com.quizapp.repository.LogRepository;
import com.quizapp.repository.TestRepository;
import com.quizapp.repository.UserRepository;

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
public class AppController {

    @Autowired private UserRepository userRepo;
    @Autowired private TestRepository testRepo;
    @Autowired private AttemptRepository attemptRepo;
    @Autowired private LogRepository logRepo;

    // --- AUTHENTICATION ---
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> creds) {
        String uid = creds.get("userId") != null ? creds.get("userId").trim() : "";
        String pwd = creds.get("password") != null ? creds.get("password").trim() : "";

        try {
            if ("admin@java.in".equals(uid) && "jg@0987654321".equals(pwd)) {
                try { logRepo.save(new SystemLog(uid, "ADMIN_LOGIN", "Admin logged in successfully")); } catch (Exception ignored) {}
                return ResponseEntity.ok(Map.of("role", "ADMIN", "userId", uid, "message", "Admin Login Success"));
            }

            Optional<User> user = userRepo.findByUserId(uid);
            if (user.isPresent() && user.get().getPassword().equals(pwd)) {
                try { logRepo.save(new SystemLog(uid, "STUDENT_LOGIN", "Student logged in successfully")); } catch (Exception ignored) {}
                
                Map<String, Object> response = new HashMap<>();
                response.put("role", "STUDENT");
                response.put("studentId", user.get().getId());
                response.put("userId", uid);
                response.put("regNo", user.get().getRegNo());
                response.put("name", user.get().getName());
                response.put("profilePicBase64", user.get().getProfilePicBase64());
                response.put("message", "Login Success");
                
                return ResponseEntity.ok(response);
            }

            try { logRepo.save(new SystemLog(uid, "FAILED_LOGIN", "Invalid login attempt")); } catch (Exception ignored) {}
            return ResponseEntity.status(401).body("Invalid Credentials - Please check ID and Password.");
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Server Database Error: " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepo.findByUserId(user.getUserId()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists.");
        }
        
        // Generate Unique 7-Digit Reg No
        String regNo;
        Random rnd = new Random();
        do {
            regNo = String.format("%07d", rnd.nextInt(10000000));
        } while (false); // In production, verify against DB to ensure no duplicates

        user.setRegNo(regNo);
        user.setRole("STUDENT");
        userRepo.save(user);

        try { logRepo.save(new SystemLog(user.getUserId(), "REGISTER", "New student registered: " + regNo)); } catch (Exception ignored) {}
        
        return ResponseEntity.ok(Map.of("message", "Registration Successful! Reg No: " + regNo, "regNo", regNo));
    }

    // --- ADMIN USER MANAGEMENT ---
    @GetMapping("/admin/users")
    public List<User> getAllStudents() {
        return userRepo.findByRole("STUDENT");
    }

    @PostMapping("/admin/users/create")
    public ResponseEntity<?> adminCreateUser(@RequestBody User user) {
        if (userRepo.findByUserId(user.getUserId()).isPresent()) {
            return ResponseEntity.badRequest().body("User ID already exists.");
        }
        String regNo = String.format("%07d", new Random().nextInt(10000000));
        user.setRegNo(regNo);
        user.setRole("STUDENT");
        userRepo.save(user);
        try { logRepo.save(new SystemLog("admin@java.in", "ADMIN_CREATE_USER", "Admin manually created user: " + user.getUserId())); } catch (Exception ignored) {}
        return ResponseEntity.ok("User Account Created Successfully");
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (userRepo.existsById(id)) {
            userRepo.deleteById(id);
            try { logRepo.save(new SystemLog("admin@java.in", "DELETE_USER", "Deleted user ID: " + id)); } catch (Exception ignored) {}
            return ResponseEntity.ok("User Deleted Successfully");
        }
        return ResponseEntity.badRequest().body("User not found.");
    }

    // --- ADMIN TEST & LOG MANAGEMENT ---
    @PostMapping("/admin/test/create")
    public ResponseEntity<?> createTest(@RequestBody QuizTest test) {
        testRepo.save(test);
        try { logRepo.save(new SystemLog("admin@java.in", "CREATE_TEST", "Created test: " + test.getTitle())); } catch (Exception ignored) {}
        return ResponseEntity.ok("Test Created successfully");
    }

    @GetMapping("/admin/tests")
    public List<QuizTest> getAllTests() {
        return testRepo.findAll();
    }

    @PostMapping("/admin/test/toggle/{id}")
    public ResponseEntity<?> toggleTestAccess(@PathVariable Long id) {
        QuizTest test = testRepo.findById(id).orElseThrow();
        test.setActive(!test.isActive());
        testRepo.save(test);
        try { logRepo.save(new SystemLog("admin@java.in", "TOGGLE_TEST", "Toggled test ID " + id + " access to " + test.isActive())); } catch (Exception ignored) {}
        return ResponseEntity.ok("Test status updated");
    }

    @DeleteMapping("/admin/test/{id}")
    public ResponseEntity<?> deleteTest(@PathVariable Long id) {
        testRepo.deleteById(id);
        try { logRepo.save(new SystemLog("admin@java.in", "DELETE_TEST", "Deleted test ID: " + id)); } catch (Exception ignored) {}
        return ResponseEntity.ok("Test Deleted Successfully");
    }

    @GetMapping("/admin/attempts")
    public List<QuizAttempt> getAllAttempts() { return attemptRepo.findAll(); }

    @GetMapping("/admin/logs")
    public List<SystemLog> getLogs() { return logRepo.findAll(); }

    @GetMapping("/admin/export-excel")
    public ResponseEntity<byte[]> exportExcel() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Quiz Analysis");
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Attempt ID", "Student ID", "Test Title", "Score", "Correct", "Wrong", "Total", "Time"};
            for (int i = 0; i < headers.length; i++) headerRow.createCell(i).setCellValue(headers[i]);

            List<QuizAttempt> attempts = attemptRepo.findAll();
            int rowIdx = 1;
            for (QuizAttempt attempt : attempts) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(attempt.getId());
                row.createCell(1).setCellValue(attempt.getStudentUserId() != null ? attempt.getStudentUserId() : "Student #" + attempt.getStudentId());
                row.createCell(2).setCellValue(attempt.getTestTitle());
                row.createCell(3).setCellValue(attempt.getScore());
                row.createCell(4).setCellValue(attempt.getCorrectAnswers());
                row.createCell(5).setCellValue(attempt.getWrongAnswers());
                row.createCell(6).setCellValue(attempt.getTotalQuestions());
                row.createCell(7).setCellValue(attempt.getAttemptTime().toString());
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=quiz_results.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- STUDENT ENDPOINTS (Handling IST Schedule) ---
    @GetMapping("/student/tests")
    public ResponseEntity<?> getAvailableTests() {
        List<QuizTest> allTests = testRepo.findByActiveTrue();
        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDateTime nowIST = LocalDateTime.now(istZone);
        
        List<QuizTest> available = new ArrayList<>();
        List<QuizTest> upcoming = new ArrayList<>();
        
        for (QuizTest t : allTests) {
            if (t.getScheduledTime() == null || !t.getScheduledTime().isAfter(nowIST)) {
                available.add(t);
            } else {
                upcoming.add(t);
            }
        }
        return ResponseEntity.ok(Map.of("available", available, "upcoming", upcoming));
    }

    @GetMapping("/student/test/{id}")
    public ResponseEntity<?> getTestById(@PathVariable Long id) {
        Optional<QuizTest> test = testRepo.findById(id);
        if (test.isPresent() && test.get().isActive()) return ResponseEntity.ok(test.get());
        return ResponseEntity.badRequest().body("Test not available.");
    }

    @GetMapping("/student/attempts/{studentId}")
    public List<QuizAttempt> getStudentAttempts(@PathVariable Long studentId) {
        return attemptRepo.findByStudentId(studentId);
    }

    @PostMapping("/student/submit")
    public ResponseEntity<?> submitTest(@RequestBody Map<String, Object> submission) {
        Long testId = Long.parseLong(submission.get("testId").toString());
        Long studentId = Long.parseLong(submission.get("studentId").toString());
        String studentUserId = (String) submission.get("studentUserId");
        Map<String, String> answers = (Map<String, String>) submission.get("answers");

        QuizTest test = testRepo.findById(testId).orElseThrow();
        int score = 0, correct = 0, wrong = 0;

        for (Question q : test.getQuestions()) {
            String studentAns = answers.get(q.getId().toString());
            if (studentAns != null && !studentAns.isEmpty()) {
                if (studentAns.equalsIgnoreCase(q.getCorrectAnswer())) {
                    score += 4;
                    correct++;
                } else {
                    if (test.isNegativeMarkingEnabled()) score -= 1;
                    wrong++;
                }
            }
        }

        QuizAttempt attempt = new QuizAttempt();
        attempt.setTestId(testId);
        attempt.setTestTitle(test.getTitle());
        attempt.setStudentId(studentId);
        attempt.setStudentUserId(studentUserId);
        attempt.setScore(score);
        attempt.setCorrectAnswers(correct);
        attempt.setWrongAnswers(wrong);
        attempt.setTotalQuestions(test.getQuestions().size());
        attempt.setAttemptTime(LocalDateTime.now());
        attemptRepo.save(attempt);

        try { logRepo.save(new SystemLog(studentUserId, "SUBMIT_TEST", "Completed test: " + test.getTitle() + " with score: " + score)); } catch (Exception ignored) {}
        return ResponseEntity.ok(attempt);
    }
}