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
    
    private int durationMinutes;

    private LocalDateTime scheduledTime; // For scheduled tests

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
}