package com.quizapp.repository;

import com.quizapp.model.QuizTest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TestRepository extends JpaRepository<QuizTest, Long> {
    List<QuizTest> findByActiveTrue();
}