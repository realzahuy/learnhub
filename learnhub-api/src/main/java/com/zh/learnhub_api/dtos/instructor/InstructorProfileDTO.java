package com.zh.learnhub_api.dtos.instructor;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstructorProfileDTO {
    private Long id;
    private String fullName;
    private String avatar;
    private String bio;
    private LocalDateTime joinedAt;
    private double averageRating;
    private long totalReviews;
    private long totalStudents;
    private long totalCourses;
}
