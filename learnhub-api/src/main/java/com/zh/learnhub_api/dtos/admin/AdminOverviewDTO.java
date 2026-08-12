package com.zh.learnhub_api.dtos.admin;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewDTO {
    private long totalUsers;
    private long totalInstructors;
    private long totalStudents;
    private BigDecimal totalRevenue;
    private long totalCourses;
    private long publishedCourses;
    private long pendingCourses;
    private long draftCourses;
    private long rejectedCourses;
    private long newUsersCurrentPeriod;
    private long newUsersPreviousPeriod;
    private BigDecimal revenueCurrentPeriod;
    private BigDecimal revenuePreviousPeriod;
    private int periodDays;
}
