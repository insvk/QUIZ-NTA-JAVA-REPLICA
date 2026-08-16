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

    // --- ADVANCED STUDENT MANAGEMENT EXTENSIONS ---
    
    // Status
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, SUSPENDED, ARCHIVED, GRADUATED, ALUMNI

    // Identity
    private String dob;
    private String gender;
    private String phone;
    private String alternateContact;
    private String guardianName;
    private String guardianContact;

    // Academic
    private String department;
    private String course;
    private String program;
    private String branch;
    private String academicYear;
    private String semester;
    private String section;
    private String batch;
    private String enrollmentStatus;

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

    public String getStatus() { return status != null ? status : "ACTIVE"; }
    public void setStatus(String status) { this.status = status; }

    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAlternateContact() { return alternateContact; }
    public void setAlternateContact(String alternateContact) { this.alternateContact = alternateContact; }

    public String getGuardianName() { return guardianName; }
    public void setGuardianName(String guardianName) { this.guardianName = guardianName; }

    public String getGuardianContact() { return guardianContact; }
    public void setGuardianContact(String guardianContact) { this.guardianContact = guardianContact; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getCourse() { return course; }
    public void setCourse(String course) { this.course = course; }

    public String getProgram() { return program; }
    public void setProgram(String program) { this.program = program; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }

    public String getEnrollmentStatus() { return enrollmentStatus; }
    public void setEnrollmentStatus(String enrollmentStatus) { this.enrollmentStatus = enrollmentStatus; }
}