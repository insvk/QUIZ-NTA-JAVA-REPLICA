package com.quizapp.controller;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.apache.poi.ss.usermodel.Cell;
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
            // Hardcoded Admin Account Check
            if ("admin@java.in".equals(uid) && "jg@0987654321".equals(pwd)) {
                try { logRepo.save(new SystemLog(uid, "ADMIN_LOGIN", "Admin logged in successfully")); } catch (Exception ignored) {}
                return ResponseEntity.ok(Map.of("role", "ADMIN", "userId", uid, "message", "Admin Login Success"));
            }

            // Student Account Check against Supabase DBMS
            Optional<User> user = userRepo.findByUserId(uid);
            if (user.isPresent() && user.get().getPassword().equals(pwd)) {
                try { logRepo.save(new SystemLog(uid, "STUDENT_LOGIN", "Student logged in successfully")); } catch (Exception ignored) {}
                return ResponseEntity.ok(Map.of("role", "STUDENT", "studentId", user.get().getId(), "userId", uid, "message", "Login Success"));
            }

            try { logRepo.save(new SystemLog(uid, "FAILED_LOGIN", "Invalid login attempt")); } catch (Exception ignored) {}
            return ResponseEntity.status(401).body("Invalid Credentials - Please check ID and Password.");
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Server Database Error: " + e.getMessage());
        }
    }

    // Student Self-Registration (Stores in Supabase DBMS)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        String cleanUid = user.getUserId() != null ? user.getUserId().trim() : "";
        String cleanPwd = user.getPassword() != null ? user.getPassword().trim() : "";

        if (cleanUid.isEmpty() || cleanPwd.isEmpty()) {
            return ResponseEntity.badRequest().body("User ID and Password cannot be empty.");
        }

        if (userRepo.findByUserId(cleanUid).isPresent()) {
            return ResponseEntity.badRequest().body("User ID already exists in system.");
        }

        user.setUserId(cleanUid);
        user.setPassword(cleanPwd);
        user.setRole("STUDENT");
        userRepo.save(user);

        try { logRepo.save(new SystemLog(cleanUid, "REGISTER", "New student self-registered")); } catch (Exception ignored) {}
        return ResponseEntity.ok("Registration Successful");
    }

    // --- ADMIN USER MANAGEMENT ENDPOINTS ---
    @GetMapping("/admin/users")
    public List<User> getAllStudents() {
        return userRepo.findByRole("STUDENT");
    }

    @PostMapping("/admin/users/create")
    public ResponseEntity<?> adminCreateUser(@RequestBody User user) {
        String cleanUid = user.getUserId() != null ? user.getUserId().trim() : "";
        String cleanPwd = user.getPassword() != null ? user.getPassword().trim() : "";

        if (cleanUid.isEmpty() || cleanPwd.isEmpty()) {
            return ResponseEntity.badRequest().body("User ID and Password cannot be empty.");
        }

        if (userRepo.findByUserId(cleanUid).isPresent()) {
            return ResponseEntity.badRequest().body("User ID already exists.");
        }

        user.setUserId(cleanUid);
        user.setPassword(cleanPwd);
        user.setRole("STUDENT");
        userRepo.save(user);

        try { logRepo.save(new SystemLog("admin@java.in", "ADMIN_CREATE_USER", "Admin manually created user: " + cleanUid)); } catch (Exception ignored) {}
        return ResponseEntity.ok("User Account Created Successfully");
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> user = userRepo.findById(id);
        if (user.isPresent()) {
            String uid = user.get().getUserId();
            userRepo.deleteById(id);
            try { logRepo.save(new SystemLog("admin@java.in", "DELETE_USER", "Deleted user ID: " + id + " (" + uid + ")")); } catch (Exception ignored) {}
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

    @GetMapping("/admin/attempts")
    public List<QuizAttempt> getAllAttempts() {
        return attemptRepo.findAll();
    }

    @GetMapping("/admin/logs")
    public List<SystemLog> getLogs() {
        return logRepo.findAll();
    }

    @GetMapping("/admin/export-excel")
    public ResponseEntity<byte[]> exportExcel() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Quiz Analysis");

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Attempt ID", "Student ID", "Test Title", "Score", "Correct Answers", "Wrong Answers", "Total Questions", "Attempt Time"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

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
            try { logRepo.save(new SystemLog("admin@java.in", "EXPORT_EXCEL", "Downloaded results excel analysis")); } catch (Exception ignored) {}

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=quiz_results_analysis.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- STUDENT ENDPOINTS ---
    @GetMapping("/student/tests")
    public List<QuizTest> getAvailableTests() {
        return testRepo.findByActiveTrue();
    }

    @GetMapping("/student/test/{id}")
    public ResponseEntity<?> getTestById(@PathVariable Long id) {
        Optional<QuizTest> test = testRepo.findById(id);
        if (test.isPresent() && test.get().isActive()) {
            return ResponseEntity.ok(test.get());
        }
        return ResponseEntity.badRequest().body("Test not available or closed by admin");
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
                    if (test.isNegativeMarkingEnabled()) {
                        score -= 1;
                    }
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