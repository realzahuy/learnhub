package com.zh.learnhub_api.dtos.instructor;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstructorOverviewDTO {
    private long totalStudents;
    private BigDecimal totalRevenue;
    private long publishedCourses;
    private long pendingCourses;
    private long draftCourses;
    private long rejectedCourses;
    private long enrollmentsCurrentPeriod;
    private long enrollmentsPreviousPeriod;
    private BigDecimal revenueCurrentPeriod;
    private BigDecimal revenuePreviousPeriod;
    private int periodDays;
}
