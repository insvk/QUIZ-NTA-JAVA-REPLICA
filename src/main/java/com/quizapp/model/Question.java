package com.quizapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String questionText;

    @Column(columnDefinition = "TEXT")
    private String imageBase64;

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctAnswer; // For Single: "A", Multi: "A,B,C", Numerical: "25.5", Matrix: "P:A,B;Q:C"

    // --- HIERARCHY & GROUPING ---
    private String paperName = "Paper 1";
    private String subject = "General"; // Physics, Chemistry, Mathematics, etc.
    private String sectionName = "Section 1"; // e.g., "Section A - MCQ", "Section B - Numerical"

    // --- QUESTION TYPE & MARKING ENGINE ---
    private String questionType = "SINGLE_CORRECT"; // SINGLE_CORRECT, MULTIPLE_CORRECT, NUMERICAL, MATRIX_MATCH, ASSERTION_REASON, COMPREHENSION
    private Double positiveMarks = 4.0;
    private Double negativeMarks = 1.0;
    private Double unattemptedMarks = 0.0;
    private Double partialMarks = 0.0;

    // --- NUMERICAL ANSWER CONFIGURATION ---
    private Double numericalAnswer;
    private Double numericalMinVal;
    private Double numericalMaxVal;
    private Double tolerance = 0.0;
    private Boolean integerOnly = false;
    private Boolean negativeAllowed = true;

    // --- MATRIX MATCH & COMPREHENSION ---
    @Column(columnDefinition = "TEXT")
    private String matrixConfigJson; // Rows (P, Q, R, S) and Columns (A, B, C, D) definitions

    @Column(columnDefinition = "TEXT")
    private String passageText; // For comprehension passages

    // --- METADATA & RE-EVALUATION ---
    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(columnDefinition = "TEXT")
    private String solution;

    private String topic;
    private String chapter;
    private String difficulty = "MEDIUM"; // EASY, MEDIUM, HARD
    private String status = "APPROVED"; // DRAFT, REVIEW, APPROVED, REJECTED, ARCHIVED
    private Integer version = 1;
    private Boolean isDropped = false;
    private Boolean isBonus = false;

    // Default Constructor
    public Question() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public String getImageBase64() { return imageBase64; }
    public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }

    public String getOptionA() { return optionA; }
    public void setOptionA(String optionA) { this.optionA = optionA; }

    public String getOptionB() { return optionB; }
    public void setOptionB(String optionB) { this.optionB = optionB; }

    public String getOptionC() { return optionC; }
    public void setOptionC(String optionC) { this.optionC = optionC; }

    public String getOptionD() { return optionD; }
    public void setOptionD(String optionD) { this.optionD = optionD; }

    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }

    public String getPaperName() { return paperName != null ? paperName : "Paper 1"; }
    public void setPaperName(String paperName) { this.paperName = paperName; }

    public String getSubject() { return subject != null ? subject : "General"; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getSectionName() { return sectionName != null ? sectionName : "Section 1"; }
    public void setSectionName(String sectionName) { this.sectionName = sectionName; }

    public String getQuestionType() { return questionType != null ? questionType : "SINGLE_CORRECT"; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public Double getPositiveMarks() { return positiveMarks != null ? positiveMarks : 4.0; }
    public void setPositiveMarks(Double positiveMarks) { this.positiveMarks = positiveMarks; }

    public Double getNegativeMarks() { return negativeMarks != null ? negativeMarks : 1.0; }
    public void setNegativeMarks(Double negativeMarks) { this.negativeMarks = negativeMarks; }

    public Double getUnattemptedMarks() { return unattemptedMarks != null ? unattemptedMarks : 0.0; }
    public void setUnattemptedMarks(Double unattemptedMarks) { this.unattemptedMarks = unattemptedMarks; }

    public Double getPartialMarks() { return partialMarks != null ? partialMarks : 0.0; }
    public void setPartialMarks(Double partialMarks) { this.partialMarks = partialMarks; }

    public Double getNumericalAnswer() { return numericalAnswer; }
    public void setNumericalAnswer(Double numericalAnswer) { this.numericalAnswer = numericalAnswer; }

    public Double getNumericalMinVal() { return numericalMinVal; }
    public void setNumericalMinVal(Double numericalMinVal) { this.numericalMinVal = numericalMinVal; }

    public Double getNumericalMaxVal() { return numericalMaxVal; }
    public void setNumericalMaxVal(Double numericalMaxVal) { this.numericalMaxVal = numericalMaxVal; }

    public Double getTolerance() { return tolerance != null ? tolerance : 0.0; }
    public void setTolerance(Double tolerance) { this.tolerance = tolerance; }

    public Boolean getIntegerOnly() { return integerOnly != null ? integerOnly : false; }
    public void setIntegerOnly(Boolean integerOnly) { this.integerOnly = integerOnly; }

    public Boolean getNegativeAllowed() { return negativeAllowed != null ? negativeAllowed : true; }
    public void setNegativeAllowed(Boolean negativeAllowed) { this.negativeAllowed = negativeAllowed; }

    public String getMatrixConfigJson() { return matrixConfigJson; }
    public void setMatrixConfigJson(String matrixConfigJson) { this.matrixConfigJson = matrixConfigJson; }

    public String getPassageText() { return passageText; }
    public void setPassageText(String passageText) { this.passageText = passageText; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public String getSolution() { return solution; }
    public void setSolution(String solution) { this.solution = solution; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getChapter() { return chapter; }
    public void setChapter(String chapter) { this.chapter = chapter; }

    public String getDifficulty() { return difficulty != null ? difficulty : "MEDIUM"; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getStatus() { return status != null ? status : "APPROVED"; }
    public void setStatus(String status) { this.status = status; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

    public Boolean isDropped() { return isDropped; }
    public void setDropped(Boolean dropped) { this.isDropped = dropped; }

    public Boolean isBonus() { return isBonus; }
    public void setBonus(Boolean bonus) { this.isBonus = bonus; }
}