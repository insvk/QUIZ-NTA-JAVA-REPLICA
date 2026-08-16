package com.quizapp.controller;

import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizapp.model.GlobalSettings;
import com.quizapp.model.Question;
import com.quizapp.model.QuizAttempt;
import com.quizapp.model.QuizTest;
import com.quizapp.model.StudentNotification;
import com.quizapp.model.SystemLog;
import com.quizapp.model.User;
import com.quizapp.repository.AttemptRepository;
import com.quizapp.repository.GlobalSettingsRepository;
import com.quizapp.repository.LogRepository;
import com.quizapp.repository.NotificationRepository;
import com.quizapp.repository.TestRepository;
import com.quizapp.repository.UserRepository;
import com.quizapp.service.ExamEvaluationService;
import com.quizapp.service.ExamEvaluationService.EvaluationResult;

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
public class AppController {

    @Autowired private UserRepository userRepo;
    @Autowired private TestRepository testRepo;
    @Autowired private AttemptRepository attemptRepo;
    @Autowired private LogRepository logRepo;
    @Autowired private GlobalSettingsRepository settingsRepo;
    @Autowired private NotificationRepository notificationRepo;
    @Autowired private ExamEvaluationService evaluationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
        
        // Custom Sequence Generator Logic
        GlobalSettings settings = settingsRepo.findAll().stream().findFirst().orElse(new GlobalSettings());
        String generatedRegNo = settings.getRegNoPrefix() + settings.getCurrentRegNumber();
        
        // Increment for the next student
        settings.setCurrentRegNumber(settings.getCurrentRegNumber() + 1);
        settingsRepo.save(settings);

        user.setRegNo(generatedRegNo);
        user.setRole("STUDENT");
        userRepo.save(user);

        try { logRepo.save(new SystemLog(user.getUserId(), "REGISTER", "New student registered: " + generatedRegNo)); } catch (Exception ignored) {}
        
        return ResponseEntity.ok(Map.of("message", "Registration Successful! Reg No: " + generatedRegNo, "regNo", generatedRegNo));
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
        
        // Custom Sequence Generator Logic
        GlobalSettings settings = settingsRepo.findAll().stream().findFirst().orElse(new GlobalSettings());
        String generatedRegNo = settings.getRegNoPrefix() + settings.getCurrentRegNumber();
        
        // Increment for the next student
        settings.setCurrentRegNumber(settings.getCurrentRegNumber() + 1);
        settingsRepo.save(settings);

        user.setRegNo(generatedRegNo);
        user.setRole("STUDENT");
        userRepo.save(user);
        
        try { logRepo.save(new SystemLog("admin@java.in", "ADMIN_CREATE_USER", "Admin manually created user: " + user.getUserId())); } catch (Exception ignored) {}
        return ResponseEntity.ok("User Account Created Successfully");
    }

    @PostMapping("/admin/users/bulk-import")
    public ResponseEntity<?> bulkImportUsers(@RequestBody List<User> users) {
        GlobalSettings settings = settingsRepo.findAll().stream().findFirst().orElse(new GlobalSettings());
        int count = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < users.size(); i++) {
            User u = users.get(i);
            if (u.getUserId() == null || u.getUserId().trim().isEmpty()) {
                errors.add("Row " + (i + 1) + ": Username is required.");
                continue;
            }
            if (userRepo.findByUserId(u.getUserId()).isPresent()) {
                errors.add("Row " + (i + 1) + ": Username '" + u.getUserId() + "' already exists.");
                continue;
            }
            
            String generatedRegNo = settings.getRegNoPrefix() + settings.getCurrentRegNumber();
            settings.setCurrentRegNumber(settings.getCurrentRegNumber() + 1);
            
            u.setRegNo(generatedRegNo);
            u.setRole("STUDENT");
            if (u.getPassword() == null || u.getPassword().isEmpty()) {
                u.setPassword("password123"); // default fallback password
            }
            userRepo.save(u);
            count++;
        }
        settingsRepo.save(settings);
        try { logRepo.save(new SystemLog("admin@java.in", "BULK_IMPORT_USERS", "Admin bulk imported " + count + " users.")); } catch (Exception ignored) {}
        
        if (!errors.isEmpty()) {
            return ResponseEntity.status(207).body(Map.of("message", "Imported " + count + " users with some errors.", "errors", errors));
        }
        return ResponseEntity.ok(Map.of("message", "Successfully imported " + count + " users."));
    }

    @PostMapping("/admin/students/search")
    public ResponseEntity<?> searchStudents(@RequestBody Map<String, String> filters) {
        List<User> students = userRepo.findByRole("STUDENT");
        
        String dep = filters.get("department");
        String batch = filters.get("batch");
        String status = filters.get("status");
        String query = filters.get("query");

        List<User> filtered = students.stream().filter(u -> {
            boolean match = true;
            if (dep != null && !dep.isEmpty() && !dep.equalsIgnoreCase(u.getDepartment())) match = false;
            if (batch != null && !batch.isEmpty() && !batch.equalsIgnoreCase(u.getBatch())) match = false;
            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase(u.getStatus())) match = false;
            if (query != null && !query.isEmpty()) {
                String q = query.toLowerCase();
                boolean qMatch = (u.getName() != null && u.getName().toLowerCase().contains(q)) ||
                                 (u.getUserId() != null && u.getUserId().toLowerCase().contains(q)) ||
                                 (u.getRegNo() != null && u.getRegNo().toLowerCase().contains(q));
                if (!qMatch) match = false;
            }
            return match;
        }).toList();

        return ResponseEntity.ok(filtered);
    }

    @PutMapping("/admin/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User updatedUser) {
        Optional<User> userOpt = userRepo.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (updatedUser.getName() != null) user.setName(updatedUser.getName());
            if (updatedUser.getEmail() != null) user.setEmail(updatedUser.getEmail());
            if (updatedUser.getDob() != null) user.setDob(updatedUser.getDob());
            if (updatedUser.getGender() != null) user.setGender(updatedUser.getGender());
            if (updatedUser.getPhone() != null) user.setPhone(updatedUser.getPhone());
            if (updatedUser.getDepartment() != null) user.setDepartment(updatedUser.getDepartment());
            if (updatedUser.getCourse() != null) user.setCourse(updatedUser.getCourse());
            if (updatedUser.getBatch() != null) user.setBatch(updatedUser.getBatch());
            if (updatedUser.getSection() != null) user.setSection(updatedUser.getSection());
            if (updatedUser.getStatus() != null) user.setStatus(updatedUser.getStatus());
            if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) user.setPassword(updatedUser.getPassword());
            
            userRepo.save(user);
            try { logRepo.save(new SystemLog("admin@java.in", "UPDATE_USER", "Updated user ID: " + id)); } catch (Exception ignored) {}
            return ResponseEntity.ok("User updated successfully.");
        }
        return ResponseEntity.badRequest().body("User not found.");
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepo.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            List<QuizAttempt> attempts = attemptRepo.findByStudentId(id);
            if (!attempts.isEmpty()) {
                user.setStatus("ARCHIVED");
                userRepo.save(user);
                try { logRepo.save(new SystemLog("admin@java.in", "ARCHIVE_USER", "Archived user ID: " + id)); } catch (Exception ignored) {}
                return ResponseEntity.ok("User archived successfully (historical records exist).");
            } else {
                userRepo.deleteById(id);
                try { logRepo.save(new SystemLog("admin@java.in", "DELETE_USER", "Deleted user ID: " + id)); } catch (Exception ignored) {}
                return ResponseEntity.ok("User Deleted Successfully");
            }
        }
        return ResponseEntity.badRequest().body("User not found.");
    }

    // --- ADMIN TEST & LOG MANAGEMENT ---
    @PostMapping("/admin/test/create")
    public ResponseEntity<?> createTest(@RequestBody QuizTest test) {
        if (test.getExamType() == null) test.setExamType("NORMAL_MCQ");
        if (test.getStatus() == null) test.setStatus("LIVE");
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
        test.setStatus(test.isActive() ? "LIVE" : "DRAFT");
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
            String[] headers = {"Attempt ID", "Student ID", "Test Title", "Score", "Correct", "Wrong", "Total", "Accuracy %", "Status", "Time"};
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
                row.createCell(7).setCellValue(attempt.getAccuracy() != null ? attempt.getAccuracy() : 0.0);
                row.createCell(8).setCellValue(attempt.getStatus());
                row.createCell(9).setCellValue(attempt.getAttemptTime() != null ? attempt.getAttemptTime().toString() : "");
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

    // --- ADVANCED JEE CBT ADMIN ENDPOINTS ---

    @GetMapping("/admin/exam-templates")
    public ResponseEntity<?> getExamTemplates() {
        List<Map<String, Object>> templates = new ArrayList<>();

        // 1. JEE Main Preset
        templates.add(Map.of(
            "id", "JEE_MAIN_2024",
            "name", "JEE Main Style (NTA Pattern)",
            "examType", "JEE_MAIN",
            "durationMinutes", 180,
            "maxMarks", 300.0,
            "subjects", List.of("Physics", "Chemistry", "Mathematics"),
            "sections", List.of(
                Map.of("name", "Section A - MCQ", "type", "SINGLE_CORRECT", "count", 20, "pos", 4.0, "neg", 1.0),
                Map.of("name", "Section B - Numerical", "type", "NUMERICAL", "count", 10, "attemptAny", 5, "pos", 4.0, "neg", 1.0)
            ),
            "instructions", "<h3>JEE Main Instructions</h3><p>Physics, Chemistry, and Mathematics each contain 2 Sections (Section A: 20 MCQs, Section B: 10 Numerical questions). In Section B, attempt any 5 questions. Correct: +4, Incorrect: -1.</p>"
        ));

        // 2. JEE Advanced Preset (Paper 1)
        templates.add(Map.of(
            "id", "JEE_ADV_PAPER1",
            "name", "JEE Advanced Style (Paper 1)",
            "examType", "JEE_ADVANCED",
            "durationMinutes", 180,
            "maxMarks", 180.0,
            "subjects", List.of("Physics", "Chemistry", "Mathematics"),
            "sections", List.of(
                Map.of("name", "Section 1 - Single Correct", "type", "SINGLE_CORRECT", "count", 4, "pos", 3.0, "neg", 1.0),
                Map.of("name", "Section 2 - Multiple Correct (MSQ)", "type", "MULTIPLE_CORRECT", "count", 6, "pos", 4.0, "neg", 2.0, "partial", true),
                Map.of("name", "Section 3 - Numerical (NAT)", "type", "NUMERICAL", "count", 6, "pos", 4.0, "neg", 0.0)
            ),
            "instructions", "<h3>JEE Advanced Paper 1 Instructions</h3><p>Includes Single Correct, One or More Than One Correct (Partial Marking Enabled), and Non-Negative Numerical Value questions.</p>"
        ));

        // 3. JEE Advanced Preset (Paper 2)
        templates.add(Map.of(
            "id", "JEE_ADV_PAPER2",
            "name", "JEE Advanced Style (Paper 2)",
            "examType", "JEE_ADVANCED",
            "durationMinutes", 180,
            "maxMarks", 180.0,
            "subjects", List.of("Physics", "Chemistry", "Mathematics"),
            "sections", List.of(
                Map.of("name", "Section 1 - Multiple Correct", "type", "MULTIPLE_CORRECT", "count", 6, "pos", 4.0, "neg", 2.0),
                Map.of("name", "Section 2 - Numerical", "type", "NUMERICAL", "count", 6, "pos", 3.0, "neg", 0.0),
                Map.of("name", "Section 3 - Matrix Match", "type", "MATRIX_MATCH", "count", 4, "pos", 3.0, "neg", 1.0)
            ),
            "instructions", "<h3>JEE Advanced Paper 2 Instructions</h3><p>Includes Multiple Correct, Numerical value, and Matrix Matching questions.</p>"
        ));

        // 4. Standard Single MCQ Preset
        templates.add(Map.of(
            "id", "STANDARD_MCQ",
            "name", "Standard MCQ Test (+4 / -1)",
            "examType", "NORMAL_MCQ",
            "durationMinutes", 60,
            "maxMarks", 100.0,
            "subjects", List.of("General"),
            "sections", List.of(
                Map.of("name", "General Section", "type", "SINGLE_CORRECT", "count", 25, "pos", 4.0, "neg", 1.0)
            ),
            "instructions", "<p>Standard single correct MCQ test with +4 for correct and -1 for wrong answers.</p>"
        ));

        return ResponseEntity.ok(templates);
    }

    @PostMapping("/admin/exam/advanced-create")
    public ResponseEntity<?> createAdvancedExam(@RequestBody QuizTest exam) {
        if (exam.getTitle() == null || exam.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Exam Title is required.");
        }
        if (exam.getStatus() == null) exam.setStatus("LIVE");
        if (exam.getExamType() == null) exam.setExamType("JEE_MAIN");
        exam.setActive("LIVE".equalsIgnoreCase(exam.getStatus()));

        testRepo.save(exam);
        try { logRepo.save(new SystemLog("admin@java.in", "CREATE_ADVANCED_EXAM", "Created advanced exam: " + exam.getTitle() + " [" + exam.getExamType() + "]")); } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("message", "Advanced Exam Created Successfully!", "testId", exam.getId()));
    }

    @PostMapping("/admin/exam/{id}/validate")
    public ResponseEntity<?> validateExam(@PathVariable Long id) {
        Optional<QuizTest> testOpt = testRepo.findById(id);
        if (testOpt.isEmpty()) return ResponseEntity.badRequest().body("Exam not found.");

        QuizTest test = testOpt.get();
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (test.getQuestions() == null || test.getQuestions().isEmpty()) {
            errors.add("Exam must contain at least 1 question before publishing.");
        } else {
            for (int i = 0; i < test.getQuestions().size(); i++) {
                Question q = test.getQuestions().get(i);
                if (q.getQuestionText() == null || q.getQuestionText().trim().isEmpty()) {
                    errors.add("Question #" + (i + 1) + " has empty question text.");
                }
                String type = q.getQuestionType() != null ? q.getQuestionType().toUpperCase() : "SINGLE_CORRECT";
                if ("SINGLE_CORRECT".equals(type) || "MULTIPLE_CORRECT".equals(type)) {
                    if (q.getOptionA() == null || q.getOptionB() == null) {
                        warnings.add("Question #" + (i + 1) + " (" + type + ") has missing options.");
                    }
                }
                if (q.getCorrectAnswer() == null || q.getCorrectAnswer().trim().isEmpty()) {
                    if (q.getNumericalAnswer() == null && (q.getNumericalMinVal() == null || q.getNumericalMaxVal() == null)) {
                        errors.add("Question #" + (i + 1) + " is missing a correct answer key.");
                    }
                }
            }
        }

        boolean isValid = errors.isEmpty();
        return ResponseEntity.ok(Map.of("valid", isValid, "errors", errors, "warnings", warnings));
    }

    @PostMapping("/admin/exam/{id}/publish")
    public ResponseEntity<?> publishExam(@PathVariable Long id) {
        QuizTest test = testRepo.findById(id).orElseThrow();
        test.setStatus("LIVE");
        test.setActive(true);
        testRepo.save(test);
        try { logRepo.save(new SystemLog("admin@java.in", "PUBLISH_EXAM", "Published exam ID " + id + ": " + test.getTitle())); } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("message", "Exam published and live for students!"));
    }

    @PostMapping("/admin/exam/{id}/assign")
    public ResponseEntity<?> assignExamStudents(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        QuizTest test = testRepo.findById(id).orElseThrow();
        String studentIds = payload.get("assignedStudentIds"); // null or comma-separated
        test.setAssignedStudentIds(studentIds);
        testRepo.save(test);
        try { logRepo.save(new SystemLog("admin@java.in", "ASSIGN_EXAM", "Updated assignments for exam ID " + id)); } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("message", "Exam assignments updated successfully!"));
    }

    @PostMapping("/admin/exam/{id}/question/{qId}/drop-bonus")
    public ResponseEntity<?> dropOrBonusQuestion(@PathVariable Long id, @PathVariable Long qId, @RequestBody Map<String, Object> payload) {
        QuizTest test = testRepo.findById(id).orElseThrow();
        boolean isDropped = Boolean.TRUE.equals(payload.get("isDropped"));
        boolean isBonus = Boolean.TRUE.equals(payload.get("isBonus"));

        for (Question q : test.getQuestions()) {
            if (q.getId().equals(qId)) {
                q.setDropped(isDropped);
                q.setBonus(isBonus);
                break;
            }
        }
        testRepo.save(test);

        // Automatically trigger re-evaluation of all attempts for this test
        reEvaluateTestAttempts(test);

        try { logRepo.save(new SystemLog("admin@java.in", "DROP_BONUS_QUESTION", "Updated Q#" + qId + " on test ID " + id + " (Dropped=" + isDropped + ", Bonus=" + isBonus + ") and re-evaluated all attempts.")); } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("message", "Question status updated & all attempts re-evaluated!"));
    }

    @PostMapping("/admin/exam/{id}/re-evaluate")
    public ResponseEntity<?> reEvaluateExam(@PathVariable Long id) {
        QuizTest test = testRepo.findById(id).orElseThrow();
        int count = reEvaluateTestAttempts(test);
        try { logRepo.save(new SystemLog("admin@java.in", "RE_EVALUATE_EXAM", "Manually re-evaluated " + count + " attempts for exam: " + test.getTitle())); } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("message", "Re-evaluated " + count + " student attempts successfully!", "count", count));
    }

    private int reEvaluateTestAttempts(QuizTest test) {
        List<QuizAttempt> attempts = attemptRepo.findByTestId(test.getId());
        for (QuizAttempt att : attempts) {
            try {
                Map<String, String> answersMap = new HashMap<>();
                if (att.getAnswersJson() != null && !att.getAnswersJson().isEmpty()) {
                    answersMap = objectMapper.readValue(att.getAnswersJson(), new TypeReference<Map<String, String>>() {});
                }
                EvaluationResult eval = evaluationService.evaluateExam(test, answersMap);
                att.setScore((int) Math.round(eval.totalScore));
                att.setCorrectAnswers(eval.correctAnswers);
                att.setWrongAnswers(eval.wrongAnswers);
                att.setAccuracy(eval.accuracy);
                att.setSubjectScoresJson(objectMapper.writeValueAsString(eval.subjectBreakdown));
                attemptRepo.save(att);
            } catch (Exception ignored) {}
        }
        return attempts.size();
    }

    @GetMapping("/admin/exam/{id}/analytics")
    public ResponseEntity<?> getExamAnalytics(@PathVariable Long id) {
        QuizTest test = testRepo.findById(id).orElseThrow();
        List<QuizAttempt> attempts = attemptRepo.findByTestId(id);

        int totalCandidates = attempts.size();
        double avgScore = 0.0, maxScore = 0.0, minScore = 0.0, avgAccuracy = 0.0;
        if (!attempts.isEmpty()) {
            double sumScore = 0.0, sumAcc = 0.0;
            maxScore = attempts.get(0).getScore();
            minScore = attempts.get(0).getScore();
            for (QuizAttempt a : attempts) {
                sumScore += a.getScore();
                sumAcc += (a.getAccuracy() != null ? a.getAccuracy() : 0.0);
                if (a.getScore() > maxScore) maxScore = a.getScore();
                if (a.getScore() < minScore) minScore = a.getScore();
            }
            avgScore = Math.round((sumScore / totalCandidates) * 10.0) / 10.0;
            avgAccuracy = Math.round((sumAcc / totalCandidates) * 10.0) / 10.0;
        }

        // Question correctness analysis
        List<Map<String, Object>> questionStats = new ArrayList<>();
        for (Question q : test.getQuestions()) {
            int qAttempted = 0, qCorrect = 0, qWrong = 0;
            for (QuizAttempt a : attempts) {
                try {
                    if (a.getAnswersJson() != null) {
                        Map<String, String> ans = objectMapper.readValue(a.getAnswersJson(), new TypeReference<Map<String, String>>() {});
                        String sAns = ans.get(q.getId().toString());
                        if (sAns != null && !sAns.isEmpty()) {
                            qAttempted++;
                            if (sAns.equalsIgnoreCase(q.getCorrectAnswer())) qCorrect++;
                            else qWrong++;
                        }
                    }
                } catch (Exception ignored) {}
            }
            double corrPct = qAttempted > 0 ? Math.round(((double) qCorrect / qAttempted * 100.0) * 10.0) / 10.0 : 0.0;
            questionStats.add(Map.of(
                "questionId", q.getId(),
                "subject", q.getSubject() != null ? q.getSubject() : "General",
                "questionType", q.getQuestionType() != null ? q.getQuestionType() : "SINGLE_CORRECT",
                "difficulty", q.getDifficulty() != null ? q.getDifficulty() : "MEDIUM",
                "attemptedCount", qAttempted,
                "correctCount", qCorrect,
                "wrongCount", qWrong,
                "correctPercentage", corrPct,
                "isDropped", q.isDropped(),
                "isBonus", q.isBonus()
            ));
        }

        return ResponseEntity.ok(Map.of(
            "testTitle", test.getTitle(),
            "examType", test.getExamType(),
            "totalCandidates", totalCandidates,
            "avgScore", avgScore,
            "maxScore", maxScore,
            "minScore", minScore,
            "avgAccuracy", avgAccuracy,
            "questions", questionStats
        ));
    }

    @PostMapping("/admin/question-bank/import-json")
    public ResponseEntity<?> importQuestionsJson(@RequestBody List<Question> questions) {
        if (questions == null || questions.isEmpty()) {
            return ResponseEntity.badRequest().body("No questions found in payload.");
        }
        return ResponseEntity.ok(Map.of("message", "Successfully imported " + questions.size() + " questions.", "count", questions.size()));
    }

    // --- STUDENT ENDPOINTS (Handling IST Schedule & CBT Engine) ---
    @GetMapping("/student/tests")
    public ResponseEntity<?> getAvailableTests(@RequestParam(required = false) Long studentId) {
        List<QuizTest> allTests = testRepo.findByActiveTrue();
        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDateTime nowIST = LocalDateTime.now(istZone);
        
        User student = null;
        if (studentId != null) {
            student = userRepo.findById(studentId).orElse(null);
        }
        
        List<QuizTest> available = new ArrayList<>();
        List<QuizTest> upcoming = new ArrayList<>();
        
        for (QuizTest t : allTests) {
            boolean eligible = true;
            if (student != null) {
                boolean hasRules = (t.getAssignedStudentIds() != null && !t.getAssignedStudentIds().isEmpty()) || 
                                   (t.getAssignedBatches() != null && !t.getAssignedBatches().isEmpty()) || 
                                   (t.getAssignedDepartments() != null && !t.getAssignedDepartments().isEmpty()) || 
                                   (t.getAssignedSections() != null && !t.getAssignedSections().isEmpty());
                
                if (hasRules) {
                    boolean idMatch = t.getAssignedStudentIds() != null && (t.getAssignedStudentIds().contains(student.getRegNo()) || t.getAssignedStudentIds().contains(String.valueOf(student.getId())));
                    boolean batchMatch = t.getAssignedBatches() != null && student.getBatch() != null && t.getAssignedBatches().contains(student.getBatch());
                    boolean depMatch = t.getAssignedDepartments() != null && student.getDepartment() != null && t.getAssignedDepartments().contains(student.getDepartment());
                    boolean secMatch = t.getAssignedSections() != null && student.getSection() != null && t.getAssignedSections().contains(student.getSection());
                    
                    eligible = idMatch || batchMatch || depMatch || secMatch;
                }
            }
            
            if (eligible) {
                if (t.getScheduledTime() == null || !t.getScheduledTime().isAfter(nowIST)) {
                    available.add(t);
                } else {
                    upcoming.add(t);
                }
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

    // --- ADVANCED CBT START / RESUME / AUTOSAVE / SUBMIT ---

    @PostMapping("/student/exam/{testId}/start-or-resume")
    public ResponseEntity<?> startOrResumeExam(@PathVariable Long testId, @RequestBody Map<String, Object> payload) {
        Long studentId = Long.parseLong(payload.get("studentId").toString());
        String studentUserId = (String) payload.get("studentUserId");

        QuizTest test = testRepo.findById(testId).orElseThrow();
        if (!test.isActive()) return ResponseEntity.badRequest().body("This exam is not active.");

        // Check if student has an existing IN_PROGRESS attempt
        Optional<QuizAttempt> inProgress = attemptRepo.findFirstByStudentIdAndTestIdAndStatusOrderByAttemptTimeDesc(studentId, testId, "IN_PROGRESS");
        QuizAttempt attempt;
        LocalDateTime now = LocalDateTime.now();

        if (inProgress.isPresent()) {
            attempt = inProgress.get();
            // Check if server-side timer expired
            if (attempt.getServerExpiryTime() != null && now.isAfter(attempt.getServerExpiryTime())) {
                // Auto-evaluate expired attempt
                return finalizeExamSubmission(attempt, test);
            }
        } else {
            // Initialize new CBT attempt
            attempt = new QuizAttempt();
            attempt.setStudentId(studentId);
            attempt.setStudentUserId(studentUserId);
            attempt.setTestId(testId);
            attempt.setTestTitle(test.getTitle());
            attempt.setTotalQuestions(test.getQuestions().size());
            attempt.setStartTime(now);
            attempt.setAttemptTime(now);
            attempt.setServerExpiryTime(now.plusMinutes(test.getDurationMinutes() > 0 ? test.getDurationMinutes() : 180));
            attempt.setStatus("IN_PROGRESS");
            attemptRepo.save(attempt);
            try { logRepo.save(new SystemLog(studentUserId, "START_EXAM", "Started exam: " + test.getTitle())); } catch (Exception ignored) {}
        }

        // Calculate remaining seconds based on server expiry time
        long remainingSecs = 0;
        if (attempt.getServerExpiryTime() != null) {
            remainingSecs = Math.max(0, Duration.between(now, attempt.getServerExpiryTime()).getSeconds());
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("attemptId", attempt.getId());
        resp.put("test", test);
        resp.put("remainingSeconds", remainingSecs);
        resp.put("savedAnswersJson", attempt.getAnswersJson() != null ? attempt.getAnswersJson() : "{}");
        resp.put("status", attempt.getStatus());

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/student/exam/{attemptId}/autosave")
    public ResponseEntity<?> autoSaveAttempt(@PathVariable Long attemptId, @RequestBody Map<String, Object> payload) {
        Optional<QuizAttempt> attOpt = attemptRepo.findById(attemptId);
        if (attOpt.isEmpty()) return ResponseEntity.badRequest().body("Attempt not found.");

        QuizAttempt attempt = attOpt.get();
        if (!"IN_PROGRESS".equalsIgnoreCase(attempt.getStatus())) {
            return ResponseEntity.badRequest().body("Attempt is already completed.");
        }

        if (payload.containsKey("answersJson")) {
            attempt.setAnswersJson((String) payload.get("answersJson"));
        }
        if (payload.containsKey("timeSpentSeconds")) {
            attempt.setTimeSpentSeconds(Long.parseLong(payload.get("timeSpentSeconds").toString()));
        }
        attemptRepo.save(attempt);

        return ResponseEntity.ok(Map.of("saved", true, "timestamp", LocalDateTime.now().toString()));
    }

    @PostMapping("/student/exam/{attemptId}/submit-final")
    public ResponseEntity<?> submitFinalExam(@PathVariable Long attemptId, @RequestBody Map<String, Object> payload) {
        QuizAttempt attempt = attemptRepo.findById(attemptId).orElseThrow();
        QuizTest test = testRepo.findById(attempt.getTestId()).orElseThrow();

        if (payload.containsKey("answersJson")) {
            attempt.setAnswersJson((String) payload.get("answersJson"));
        }
        if (payload.containsKey("timeSpentSeconds")) {
            attempt.setTimeSpentSeconds(Long.parseLong(payload.get("timeSpentSeconds").toString()));
        }

        return finalizeExamSubmission(attempt, test);
    }

    private ResponseEntity<?> finalizeExamSubmission(QuizAttempt attempt, QuizTest test) {
        Map<String, String> answersMap = new HashMap<>();
        try {
            if (attempt.getAnswersJson() != null && !attempt.getAnswersJson().isEmpty()) {
                answersMap = objectMapper.readValue(attempt.getAnswersJson(), new TypeReference<Map<String, String>>() {});
            }
        } catch (Exception ignored) {}

        EvaluationResult eval = evaluationService.evaluateExam(test, answersMap);

        attempt.setScore((int) Math.round(eval.totalScore));
        attempt.setCorrectAnswers(eval.correctAnswers);
        attempt.setWrongAnswers(eval.wrongAnswers);
        attempt.setAccuracy(eval.accuracy);
        attempt.setStatus("EVALUATED");
        attempt.setAttemptTime(LocalDateTime.now());

        try {
            attempt.setSubjectScoresJson(objectMapper.writeValueAsString(eval.subjectBreakdown));
        } catch (Exception ignored) {}

        attemptRepo.save(attempt);

        try { logRepo.save(new SystemLog(attempt.getStudentUserId(), "SUBMIT_FINAL_EXAM", "Completed exam: " + test.getTitle() + " with score: " + eval.totalScore + " (Acc: " + eval.accuracy + "%)")); } catch (Exception ignored) {}

        Map<String, Object> response = new HashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("score", eval.totalScore);
        response.put("correctAnswers", eval.correctAnswers);
        response.put("wrongAnswers", eval.wrongAnswers);
        response.put("unattempted", eval.unattempted);
        response.put("totalQuestions", eval.totalQuestions);
        response.put("accuracy", eval.accuracy);
        response.put("subjectBreakdown", eval.subjectBreakdown);
        response.put("sectionBreakdown", eval.sectionBreakdown);
        response.put("resultVisibility", test.getResultVisibility());

        return ResponseEntity.ok(response);
    }

    // Legacy Fallback submit endpoint for backward compatibility
    @PostMapping("/student/submit")
    public ResponseEntity<?> submitTest(@RequestBody Map<String, Object> submission) {
        Long testId = Long.parseLong(submission.get("testId").toString());
        Long studentId = Long.parseLong(submission.get("studentId").toString());
        String studentUserId = (String) submission.get("studentUserId");
        Map<String, String> answers = submission.containsKey("answers") ? (Map<String, String>) submission.get("answers") : new HashMap<>();

        QuizTest test = testRepo.findById(testId).orElseThrow();
        EvaluationResult eval = evaluationService.evaluateExam(test, answers);

        QuizAttempt attempt = new QuizAttempt();
        attempt.setTestId(testId);
        attempt.setTestTitle(test.getTitle());
        attempt.setStudentId(studentId);
        attempt.setStudentUserId(studentUserId);
        attempt.setScore((int) Math.round(eval.totalScore));
        attempt.setCorrectAnswers(eval.correctAnswers);
        attempt.setWrongAnswers(eval.wrongAnswers);
        attempt.setTotalQuestions(test.getQuestions().size());
        attempt.setAccuracy(eval.accuracy);
        attempt.setStatus("EVALUATED");
        attempt.setAttemptTime(LocalDateTime.now());
        try {
            attempt.setAnswersJson(objectMapper.writeValueAsString(answers));
            attempt.setSubjectScoresJson(objectMapper.writeValueAsString(eval.subjectBreakdown));
        } catch (Exception ignored) {}
        attemptRepo.save(attempt);

        try { logRepo.save(new SystemLog(studentUserId, "SUBMIT_TEST", "Completed test: " + test.getTitle() + " with score: " + eval.totalScore)); } catch (Exception ignored) {}
        return ResponseEntity.ok(attempt);
    }

    @GetMapping("/student/result/{attemptId}")
    public ResponseEntity<?> getDetailedResult(@PathVariable Long attemptId) {
        QuizAttempt attempt = attemptRepo.findById(attemptId).orElseThrow();
        QuizTest test = testRepo.findById(attempt.getTestId()).orElseThrow();

        Map<String, String> answersMap = new HashMap<>();
        try {
            if (attempt.getAnswersJson() != null && !attempt.getAnswersJson().isEmpty()) {
                answersMap = objectMapper.readValue(attempt.getAnswersJson(), new TypeReference<Map<String, String>>() {});
            }
        } catch (Exception ignored) {}

        EvaluationResult eval = evaluationService.evaluateExam(test, answersMap);

        Map<String, Object> resp = new HashMap<>();
        resp.put("attempt", attempt);
        resp.put("test", test);
        resp.put("eval", eval);
        resp.put("allowSolutions", "INSTANT".equalsIgnoreCase(test.getResultVisibility()));

        return ResponseEntity.ok(resp);
    }

    // --- GOD MAXX STUDENT MANAGEMENT ENDPOINTS ---
    
    // Admin: Update the Registration Sequence
    @PostMapping("/admin/settings/reg-sequence")
    public ResponseEntity<?> updateRegSequence(@RequestBody java.util.Map<String, String> payload) {
        GlobalSettings settings = settingsRepo.findAll().stream().findFirst().orElse(new GlobalSettings());
        settings.setRegNoPrefix(payload.get("prefix"));
        settings.setCurrentRegNumber(Long.parseLong(payload.get("startNumber")));
        settingsRepo.save(settings);
        return ResponseEntity.ok(java.util.Map.of("message", "Sequence Updated Successfully!"));
    }

    @GetMapping("/student/profile/{studentId}")
    public ResponseEntity<?> getStudentProfile(@PathVariable Long studentId) {
        return userRepo.findById(studentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- STUDENT PERFORMANCE & ANALYTICS ---
    @GetMapping("/student/performance/{id}")
    public ResponseEntity<?> getStudentPerformance(@PathVariable Long id) {
        List<QuizAttempt> attempts = attemptRepo.findByStudentId(id);
        int totalExams = attempts.size();
        double avgScore = attempts.stream().mapToDouble(QuizAttempt::getScore).average().orElse(0.0);
        double maxScore = attempts.stream().mapToDouble(QuizAttempt::getScore).max().orElse(0.0);
        
        return ResponseEntity.ok(java.util.Map.of(
            "totalExams", totalExams,
            "averageScore", Math.round(avgScore * 10.0) / 10.0,
            "highestScore", maxScore,
            "recentScores", attempts.stream().sorted((a,b) -> b.getAttemptTime().compareTo(a.getAttemptTime())).limit(5).map(QuizAttempt::getScore).toList()
        ));
    }

    @GetMapping("/admin/analytics/batch")
    public ResponseEntity<?> getBatchAnalytics(@RequestParam String batch) {
        List<User> students = userRepo.findByRole("STUDENT").stream().filter(u -> batch.equalsIgnoreCase(u.getBatch())).toList();
        List<Long> studentIds = students.stream().map(User::getId).toList();
        
        List<QuizAttempt> allAttempts = attemptRepo.findAll().stream().filter(a -> studentIds.contains(a.getStudentId())).toList();
        
        double avgScore = allAttempts.stream().mapToDouble(QuizAttempt::getScore).average().orElse(0.0);
        return ResponseEntity.ok(java.util.Map.of(
            "batch", batch,
            "totalStudents", students.size(),
            "totalAttempts", allAttempts.size(),
            "averageScore", Math.round(avgScore * 10.0) / 10.0
        ));
    }

    // --- NOTIFICATIONS ---
    @GetMapping("/student/notifications/{studentId}")
    public ResponseEntity<?> getNotifications(@PathVariable Long studentId) {
        return ResponseEntity.ok(notificationRepo.findByStudentIdOrderByCreatedAtDesc(studentId));
    }

    @PostMapping("/student/notifications/{id}/read")
    public ResponseEntity<?> markNotificationRead(@PathVariable Long id) {
        Optional<StudentNotification> notifOpt = notificationRepo.findById(id);
        if (notifOpt.isPresent()) {
            StudentNotification notif = notifOpt.get();
            notif.setRead(true);
            notificationRepo.save(notif);
            return ResponseEntity.ok("Marked as read");
        }
        return ResponseEntity.badRequest().build();
    }
}