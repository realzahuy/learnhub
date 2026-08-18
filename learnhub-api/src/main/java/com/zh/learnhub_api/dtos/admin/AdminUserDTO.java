package com.zh.learnhub_api.dtos.admin;

import com.zh.learnhub_api.enums.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDTO {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String avatar;
    private String bio;
    private boolean emailVerified;
    private AccountStatus accountStatus;
    private List<String> roles;

    private LocalDateTime createdAt;

    private LocalDateTime lastLogin;

    private long totalCourses;
    private long publishedCourses;
    private long pendingCourses;
    private long draftCourses;
    private long rejectedCourses;

    private long totalStudents;
}
