package com.quizapp.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.quizapp.model.Question;
import com.quizapp.model.QuizAttempt;
import com.quizapp.model.QuizTest;

@Service
public class ExamEvaluationService {

    public static class EvaluationResult {
        public int totalQuestions = 0;
        public int correctAnswers = 0;
        public int wrongAnswers = 0;
        public int unattempted = 0;
        public double totalScore = 0.0;
        public double accuracy = 0.0;
        public Map<String, SubjectScore> subjectBreakdown = new HashMap<>();
        public Map<String, SectionScore> sectionBreakdown = new HashMap<>();
        public List<QuestionEvaluationDetail> questionDetails = new ArrayList<>();
    }

    public static class SubjectScore {
        public double score = 0.0;
        public int total = 0;
        public int correct = 0;
        public int wrong = 0;
        public int unattempted = 0;
    }

    public static class SectionScore {
        public double score = 0.0;
        public int total = 0;
        public int correct = 0;
        public int wrong = 0;
        public int unattempted = 0;
    }

    public static class QuestionEvaluationDetail {
        public Long questionId;
        public String subject;
        public String sectionName;
        public String questionType;
        public String studentAnswer;
        public String correctAnswer;
        public double marksAwarded;
        public String status; // "CORRECT", "INCORRECT", "PARTIAL", "UNATTEMPTED", "BONUS", "DROPPED"
    }

    /**
     * Evaluates candidate responses for a given QuizTest
     * @param test The QuizTest entity containing all questions & configurations
     * @param answersMap Map of Question ID (as String) to student's answer string
     * @return Comprehensive EvaluationResult
     */
    public EvaluationResult evaluateExam(QuizTest test, Map<String, String> answersMap) {
        EvaluationResult result = new EvaluationResult();
        if (test == null || test.getQuestions() == null) return result;

        result.totalQuestions = test.getQuestions().size();

        for (Question q : test.getQuestions()) {
            String subject = q.getSubject() != null ? q.getSubject() : "General";
            String section = q.getSectionName() != null ? q.getSectionName() : "Section 1";

            result.subjectBreakdown.putIfAbsent(subject, new SubjectScore());
            result.sectionBreakdown.putIfAbsent(section, new SectionScore());

            SubjectScore subScore = result.subjectBreakdown.get(subject);
            SectionScore secScore = result.sectionBreakdown.get(section);

            subScore.total++;
            secScore.total++;

            QuestionEvaluationDetail detail = new QuestionEvaluationDetail();
            detail.questionId = q.getId();
            detail.subject = subject;
            detail.sectionName = section;
            detail.questionType = q.getQuestionType();
            detail.correctAnswer = q.getCorrectAnswer();

            String studentAns = answersMap != null && q.getId() != null ? answersMap.get(q.getId().toString()) : null;
            detail.studentAnswer = studentAns;

            // 1. Dropped or Bonus Question Handling
            if (q.isDropped() || q.isBonus()) {
                double bonus = q.getPositiveMarks() != null ? q.getPositiveMarks() : 4.0;
                detail.marksAwarded = bonus;
                detail.status = q.isDropped() ? "DROPPED" : "BONUS";
                result.correctAnswers++;
                subScore.correct++;
                secScore.correct++;
                result.totalScore += bonus;
                subScore.score += bonus;
                secScore.score += bonus;
                result.questionDetails.add(detail);
                continue;
            }

            // 2. Unattempted Question Handling
            if (studentAns == null || studentAns.trim().isEmpty()) {
                double unattemptedMarks = q.getUnattemptedMarks() != null ? q.getUnattemptedMarks() : 0.0;
                detail.marksAwarded = unattemptedMarks;
                detail.status = "UNATTEMPTED";
                result.unattempted++;
                subScore.unattempted++;
                secScore.unattempted++;
                result.totalScore += unattemptedMarks;
                subScore.score += unattemptedMarks;
                secScore.score += unattemptedMarks;
                result.questionDetails.add(detail);
                continue;
            }

            // 3. Evaluation by Question Type
            String type = q.getQuestionType() != null ? q.getQuestionType().toUpperCase() : "SINGLE_CORRECT";
            double posMarks = q.getPositiveMarks() != null ? q.getPositiveMarks() : 4.0;
            double negMarks = (q.getNegativeMarks() != null) ? q.getNegativeMarks() : (test.isNegativeMarkingEnabled() ? 1.0 : 0.0);

            switch (type) {
                case "MULTIPLE_CORRECT":
                case "MSQ":
                    evaluateMultipleCorrect(q, studentAns.trim(), posMarks, negMarks, detail);
                    break;

                case "NUMERICAL":
                case "NAT":
                    evaluateNumerical(q, studentAns.trim(), posMarks, negMarks, detail);
                    break;

                case "MATRIX_MATCH":
                case "MATRIX":
                    evaluateMatrixMatch(q, studentAns.trim(), posMarks, negMarks, detail);
                    break;

                case "SINGLE_CORRECT":
                case "ASSERTION_REASON":
                case "COMPREHENSION":
                default:
                    evaluateSingleCorrect(q, studentAns.trim(), posMarks, negMarks, detail);
                    break;
            }

            // Aggregate counts & scores
            if ("CORRECT".equals(detail.status)) {
                result.correctAnswers++;
                subScore.correct++;
                secScore.correct++;
            } else if ("PARTIAL".equals(detail.status)) {
                result.correctAnswers++; // Counted as attempted with partial marks
                subScore.correct++;
                secScore.correct++;
            } else {
                result.wrongAnswers++;
                subScore.wrong++;
                secScore.wrong++;
            }

            result.totalScore += detail.marksAwarded;
            subScore.score += detail.marksAwarded;
            secScore.score += detail.marksAwarded;
            result.questionDetails.add(detail);
        }

        // Calculate Accuracy
        int attemptedCount = result.correctAnswers + result.wrongAnswers;
        if (attemptedCount > 0) {
            result.accuracy = Math.round(((double) result.correctAnswers / attemptedCount * 100.0) * 10.0) / 10.0;
        }

        return result;
    }

    private void evaluateSingleCorrect(Question q, String studentAns, double posMarks, double negMarks, QuestionEvaluationDetail detail) {
        String correct = q.getCorrectAnswer() != null ? q.getCorrectAnswer().trim() : "";
        if (studentAns.equalsIgnoreCase(correct)) {
            detail.marksAwarded = posMarks;
            detail.status = "CORRECT";
        } else {
            detail.marksAwarded = -negMarks;
            detail.status = "INCORRECT";
        }
    }

    private void evaluateMultipleCorrect(Question q, String studentAns, double posMarks, double negMarks, QuestionEvaluationDetail detail) {
        String correct = q.getCorrectAnswer() != null ? q.getCorrectAnswer().trim() : "";
        Set<String> correctSet = new HashSet<>(Arrays.asList(correct.toUpperCase().split("[,;\\s]+")));
        Set<String> studentSet = new HashSet<>(Arrays.asList(studentAns.toUpperCase().split("[,;\\s]+")));

        if (studentSet.equals(correctSet)) {
            // Full Marks
            detail.marksAwarded = posMarks;
            detail.status = "CORRECT";
            return;
        }

        // Check if student selected any incorrect option
        boolean hasWrongOption = false;
        for (String opt : studentSet) {
            if (!correctSet.contains(opt)) {
                hasWrongOption = true;
                break;
            }
        }

        if (hasWrongOption) {
            detail.marksAwarded = -negMarks;
            detail.status = "INCORRECT";
        } else {
            // Partial Credit: Correct options chosen with no incorrect options
            int totalCorrect = correctSet.size();
            int chosenCorrect = studentSet.size();
            double partialCredit = 0.0;

            if (totalCorrect == 4 && chosenCorrect == 3) partialCredit = 3.0;
            else if (totalCorrect >= 3 && chosenCorrect == 2) partialCredit = 2.0;
            else if (chosenCorrect == 1) partialCredit = 1.0;
            else partialCredit = (posMarks / totalCorrect) * chosenCorrect;

            detail.marksAwarded = partialCredit;
            detail.status = "PARTIAL";
        }
    }

    private void evaluateNumerical(Question q, String studentAns, double posMarks, double negMarks, QuestionEvaluationDetail detail) {
        try {
            double val = Double.parseDouble(studentAns.trim());
            double tolerance = q.getTolerance() != null ? q.getTolerance() : 0.0;

            boolean isCorrect = false;
            if (q.getNumericalMinVal() != null && q.getNumericalMaxVal() != null) {
                isCorrect = (val >= q.getNumericalMinVal() && val <= q.getNumericalMaxVal());
            } else if (q.getNumericalAnswer() != null) {
                double target = q.getNumericalAnswer();
                isCorrect = Math.abs(val - target) <= tolerance;
            } else if (q.getCorrectAnswer() != null) {
                double target = Double.parseDouble(q.getCorrectAnswer().trim());
                isCorrect = Math.abs(val - target) <= tolerance;
            }

            if (isCorrect) {
                detail.marksAwarded = posMarks;
                detail.status = "CORRECT";
            } else {
                detail.marksAwarded = -negMarks;
                detail.status = "INCORRECT";
            }
        } catch (NumberFormatException e) {
            detail.marksAwarded = -negMarks;
            detail.status = "INCORRECT";
        }
    }

    private void evaluateMatrixMatch(Question q, String studentAns, double posMarks, double negMarks, QuestionEvaluationDetail detail) {
        // Expected format: P:A,B;Q:C;R:D;S:A
        String correct = q.getCorrectAnswer() != null ? q.getCorrectAnswer().trim() : "";
        Map<String, Set<String>> correctMap = parseMatrixAnswer(correct);
        Map<String, Set<String>> studentMap = parseMatrixAnswer(studentAns);

        if (correctMap.isEmpty()) {
            detail.marksAwarded = 0.0;
            detail.status = "INCORRECT";
            return;
        }

        int totalRows = correctMap.size();
        int matchingRows = 0;
        boolean hasAnyWrongRow = false;

        for (Map.Entry<String, Set<String>> entry : correctMap.entrySet()) {
            String row = entry.getKey();
            Set<String> correctCols = entry.getValue();
            Set<String> studentCols = studentMap.getOrDefault(row, new HashSet<>());

            if (studentCols.equals(correctCols)) {
                matchingRows++;
            } else if (!studentCols.isEmpty()) {
                hasAnyWrongRow = true;
            }
        }

        if (matchingRows == totalRows) {
            detail.marksAwarded = posMarks;
            detail.status = "CORRECT";
        } else if (matchingRows > 0 && !hasAnyWrongRow) {
            double partial = (posMarks / totalRows) * matchingRows;
            detail.marksAwarded = Math.round(partial * 100.0) / 100.0;
            detail.status = "PARTIAL";
        } else {
            detail.marksAwarded = -negMarks;
            detail.status = "INCORRECT";
        }
    }

    private Map<String, Set<String>> parseMatrixAnswer(String input) {
        Map<String, Set<String>> map = new HashMap<>();
        if (input == null || input.isEmpty()) return map;
        String[] rowEntries = input.toUpperCase().split("[;\\n]+");
        for (String entry : rowEntries) {
            String[] parts = entry.split("[:=-]");
            if (parts.length >= 2) {
                String row = parts[0].trim();
                String[] cols = parts[1].trim().split("[,\\s]+");
                map.put(row, new HashSet<>(Arrays.asList(cols)));
            }
        }
        return map;
    }
}
