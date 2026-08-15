package com.quizapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.quizapp.model.GlobalSettings;

public interface GlobalSettingsRepository extends JpaRepository<GlobalSettings, Long> {
}