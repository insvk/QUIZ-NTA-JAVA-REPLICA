package com.quizapp.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;
    private String studentUserId;
    private Long testId;
    private String testTitle;
    private int score;
    private int correctAnswers;
    private int wrongAnswers;
    private int totalQuestions;
    private LocalDateTime attemptTime;

    // --- CBT EXTENSIONS & ANALYTICS ---
    @Column(columnDefinition = "TEXT")
    private String answersJson; // JSON serialized student answers and question states

    @Column(columnDefinition = "TEXT")
    private String subjectScoresJson; // JSON breakdown per subject / section

    private String status = "EVALUATED"; // IN_PROGRESS, SUBMITTED, EVALUATED, EXPIRED
    private Double accuracy = 0.0;
    private Long timeSpentSeconds = 0L;
    private Double partialScore = 0.0;

    private LocalDateTime startTime;
    private LocalDateTime serverExpiryTime;

    public QuizAttempt() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }
    public String getStudentUserId() { return studentUserId; }
    public void setStudentUserId(String studentUserId) { this.studentUserId = studentUserId; }
    public Long getTestId() { return testId; }
    public void setTestId(Long testId) { this.testId = testId; }
    public String getTestTitle() { return testTitle; }
    public void setTestTitle(String testTitle) { this.testTitle = testTitle; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public int getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(int correctAnswers) { this.correctAnswers = correctAnswers; }
    public int getWrongAnswers() { return wrongAnswers; }
    public void setWrongAnswers(int wrongAnswers) { this.wrongAnswers = wrongAnswers; }
    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }
    public LocalDateTime getAttemptTime() { return attemptTime; }
    public void setAttemptTime(LocalDateTime attemptTime) { this.attemptTime = attemptTime; }

    public String getAnswersJson() { return answersJson; }
    public void setAnswersJson(String answersJson) { this.answersJson = answersJson; }

    public String getSubjectScoresJson() { return subjectScoresJson; }
    public void setSubjectScoresJson(String subjectScoresJson) { this.subjectScoresJson = subjectScoresJson; }

    public String getStatus() { return status != null ? status : "EVALUATED"; }
    public void setStatus(String status) { this.status = status; }

    public Double getAccuracy() { return accuracy != null ? accuracy : 0.0; }
    public void setAccuracy(Double accuracy) { this.accuracy = accuracy; }

    public Long getTimeSpentSeconds() { return timeSpentSeconds != null ? timeSpentSeconds : 0L; }
    public void setTimeSpentSeconds(Long timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }

    public Double getPartialScore() { return partialScore != null ? partialScore : 0.0; }
    public void setPartialScore(Double partialScore) { this.partialScore = partialScore; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getServerExpiryTime() { return serverExpiryTime; }
    public void setServerExpiryTime(LocalDateTime serverExpiryTime) { this.serverExpiryTime = serverExpiryTime; }
}