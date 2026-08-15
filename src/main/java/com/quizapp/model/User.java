package com.quizapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String regNo; // 7-digit unique ID

    private String name;
    
    private String email;
    
    @Column(unique = true, nullable = false)
    private String userId; // Username

    @Column(nullable = false)
    private String password;

    private String role; // "STUDENT" or "ADMIN"

    @Column(columnDefinition = "LONGTEXT")
    private String profilePicBase64; // Optional Profile Pic

    public User() {}

    // Getters and Setters
    public Long getId() { return id; } 
    public void setId(Long id) { this.id = id; }
    
    public String getRegNo() { return regNo; } 
    public void setRegNo(String regNo) { this.regNo = regNo; }
    
    public String getName() { return name; } 
    public void setName(String name) { this.name = name; }
    
    public String getEmail() { return email; } 
    public void setEmail(String email) { this.email = email; }
    
    public String getUserId() { return userId; } 
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getPassword() { return password; } 
    public void setPassword(String password) { this.password = password; }
    
    public String getRole() { return role; } 
    public void setRole(String role) { this.role = role; }
    
    public String getProfilePicBase64() { return profilePicBase64; } 
    public void setProfilePicBase64(String profilePicBase64) { this.profilePicBase64 = profilePicBase64; }
}