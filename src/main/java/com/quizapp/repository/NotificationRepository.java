package com.quizapp.repository;

import com.quizapp.model.StudentNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<StudentNotification, Long> {
    List<StudentNotification> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<StudentNotification> findByStudentIdAndIsReadFalse(Long studentId);
}
