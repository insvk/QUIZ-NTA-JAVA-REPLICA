package com.quizapp.model;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "quiz_tests")
public class QuizTest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private boolean negativeMarkingEnabled;
    private boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String instructions;
    
    private int durationMinutes = 180;

    private LocalDateTime scheduledTime; // For scheduled tests

    // --- ADVANCED JEE CBT EXTENSIONS ---
    private String examType = "NORMAL_MCQ"; // NORMAL_MCQ, JEE_MAIN, JEE_ADVANCED, CUSTOM, MOCK
    private String examCode;
    private String description;
    private String academicYear;
    private String status = "LIVE"; // DRAFT, REVIEW, SCHEDULED, LIVE, COMPLETED, ARCHIVED
    
    private Double maxMarks = 300.0;
    private Double passingMarks = 100.0;
    private int allowedAttempts = 1;
    private String resultVisibility = "INSTANT"; // INSTANT, DELAYED, MANUAL
    
    private boolean randomizeQuestions = false;
    private boolean randomizeOptions = false;

    @Column(columnDefinition = "TEXT")
    private String assignedStudentIds; // comma-separated or JSON list, null/empty = all eligible

    @Column(columnDefinition = "TEXT")
    private String assignedBatches; // comma-separated

    @Column(columnDefinition = "TEXT")
    private String assignedDepartments; // comma-separated

    @Column(columnDefinition = "TEXT")
    private String assignedSections; // comma-separated

    @Column(columnDefinition = "TEXT")
    private String rulesConfigJson; // Navigation rules, section timers, etc.

    @Column(columnDefinition = "TEXT")
    private String blueprintJson; // Hierarchy metadata (Papers, Subjects, Sections)

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    private List<Question> questions;

    public QuizTest() {}

    // Getters and Setters
    public Long getId() { return id; } 
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; } 
    public void setTitle(String title) { this.title = title; }
    
    public boolean isNegativeMarkingEnabled() { return negativeMarkingEnabled; } 
    public void setNegativeMarkingEnabled(boolean negativeMarkingEnabled) { this.negativeMarkingEnabled = negativeMarkingEnabled; }
    
    public boolean isActive() { return active; } 
    public void setActive(boolean active) { this.active = active; }
    
    public String getInstructions() { return instructions; } 
    public void setInstructions(String instructions) { this.instructions = instructions; }
    
    public int getDurationMinutes() { return durationMinutes; } 
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }
    
    public LocalDateTime getScheduledTime() { return scheduledTime; } 
    public void setScheduledTime(LocalDateTime scheduledTime) { this.scheduledTime = scheduledTime; }
    
    public List<Question> getQuestions() { return questions; } 
    public void setQuestions(List<Question> questions) { this.questions = questions; }

    public String getExamType() { return examType != null ? examType : "NORMAL_MCQ"; }
    public void setExamType(String examType) { this.examType = examType; }

    public String getExamCode() { return examCode; }
    public void setExamCode(String examCode) { this.examCode = examCode; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getStatus() { return status != null ? status : (active ? "LIVE" : "DRAFT"); }
    public void setStatus(String status) { this.status = status; }

    public Double getMaxMarks() { return maxMarks; }
    public void setMaxMarks(Double maxMarks) { this.maxMarks = maxMarks; }

    public Double getPassingMarks() { return passingMarks; }
    public void setPassingMarks(Double passingMarks) { this.passingMarks = passingMarks; }

    public int getAllowedAttempts() { return allowedAttempts; }
    public void setAllowedAttempts(int allowedAttempts) { this.allowedAttempts = allowedAttempts; }

    public String getResultVisibility() { return resultVisibility != null ? resultVisibility : "INSTANT"; }
    public void setResultVisibility(String resultVisibility) { this.resultVisibility = resultVisibility; }

    public boolean isRandomizeQuestions() { return randomizeQuestions; }
    public void setRandomizeQuestions(boolean randomizeQuestions) { this.randomizeQuestions = randomizeQuestions; }

    public boolean isRandomizeOptions() { return randomizeOptions; }
    public void setRandomizeOptions(boolean randomizeOptions) { this.randomizeOptions = randomizeOptions; }

    public String getAssignedStudentIds() { return assignedStudentIds; }
    public void setAssignedStudentIds(String assignedStudentIds) { this.assignedStudentIds = assignedStudentIds; }

    public String getAssignedBatches() { return assignedBatches; }
    public void setAssignedBatches(String assignedBatches) { this.assignedBatches = assignedBatches; }

    public String getAssignedDepartments() { return assignedDepartments; }
    public void setAssignedDepartments(String assignedDepartments) { this.assignedDepartments = assignedDepartments; }

    public String getAssignedSections() { return assignedSections; }
    public void setAssignedSections(String assignedSections) { this.assignedSections = assignedSections; }

    public String getRulesConfigJson() { return rulesConfigJson; }
    public void setRulesConfigJson(String rulesConfigJson) { this.rulesConfigJson = rulesConfigJson; }

    public String getBlueprintJson() { return blueprintJson; }
    public void setBlueprintJson(String blueprintJson) { this.blueprintJson = blueprintJson; }
}