package com.quizapp.repository;

import com.quizapp.model.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogRepository extends JpaRepository<SystemLog, Long> {
}