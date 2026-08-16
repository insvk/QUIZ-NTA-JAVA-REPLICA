package com.quizapp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.quizapp.model.QuizAttempt;

public interface AttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByStudentId(Long studentId);
    List<QuizAttempt> findByTestId(Long testId);
    Optional<QuizAttempt> findFirstByStudentIdAndTestIdAndStatusOrderByAttemptTimeDesc(Long studentId, Long testId, String status);
}