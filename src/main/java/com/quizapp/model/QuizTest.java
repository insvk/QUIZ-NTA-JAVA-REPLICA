package com.quizapp.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "quiz_tests")
public class QuizTest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private boolean negativeMarkingEnabled;
    private boolean active = true;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "test_id")
    private List<Question> questions;

    public QuizTest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public boolean isNegativeMarkingEnabled() { return negativeMarkingEnabled; }
    public void setNegativeMarkingEnabled(boolean negativeMarkingEnabled) { this.negativeMarkingEnabled = negativeMarkingEnabled; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public List<Question> getQuestions() { return questions; }
    public void setQuestions(List<Question> questions) { this.questions = questions; }
}