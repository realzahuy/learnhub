package com.zh.learnhub_api.services.admin;

import com.zh.learnhub_api.dtos.admin.AdminOverviewDTO;
import com.zh.learnhub_api.dtos.admin.AdminTimeSeriesDTO.AdminStatsPointDTO;
import com.zh.learnhub_api.dtos.admin.AdminTimeSeriesDTO;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.payment.PaymentItemRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.utils.StatsBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminStatsService {

    private static final int PERIOD_DAYS = 30;

    private static final String ROLE_INSTRUCTOR = "ROLE_INSTRUCTOR";

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PaymentItemRepository paymentItemRepository;
    private final CourseRepository courseRepository;

    public AdminOverviewDTO getOverview() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime currentFrom = now.minusDays(PERIOD_DAYS);
        LocalDateTime previousFrom = currentFrom.minusDays(PERIOD_DAYS);

        Map<String, Long> byStatus = new HashMap<>();
        for (var row : courseRepository.countCoursesByStatus()) {
            byStatus.put(row.getStatus(), row.getCourseCount());
        }

        long totalCourses = byStatus.values().stream().mapToLong(Long::longValue).sum();

        return AdminOverviewDTO.builder()
                .totalUsers(userRepository.count())
                .totalInstructors(userRepository.countByRoleName(ROLE_INSTRUCTOR))
                .totalStudents(enrollmentRepository.countDistinctStudentsAllInstructors())
                .totalRevenue(paymentItemRepository.sumTotalRevenue())
                .totalCourses(totalCourses)
                .publishedCourses(byStatus.getOrDefault("PUBLISHED", 0L))
                .pendingCourses(byStatus.getOrDefault("PENDING", 0L))
                .draftCourses(byStatus.getOrDefault("DRAFT", 0L))
                .rejectedCourses(byStatus.getOrDefault("REJECTED", 0L))
                .newUsersCurrentPeriod(userRepository.countCreatedBetween(currentFrom, now))
                .newUsersPreviousPeriod(userRepository.countCreatedBetween(previousFrom, currentFrom))
                .revenueCurrentPeriod(paymentItemRepository.sumTotalRevenueBetween(currentFrom, now))
                .revenuePreviousPeriod(
                        paymentItemRepository.sumTotalRevenueBetween(previousFrom, currentFrom))
                .periodDays(PERIOD_DAYS)
                .build();
    }

    public AdminTimeSeriesDTO getTimeSeries(String groupBy, LocalDate fromDate, LocalDate toDate) {
        StatsBuckets buckets = StatsBuckets.plan(groupBy, fromDate, toDate);

        LocalDateTime from = buckets.getFrom();
        LocalDateTime to = buckets.getTo();
        String granularity = buckets.getGranularity();

        Map<String, Long> users = StatsBuckets.toLongMap(
                userRepository.countCreatedByBucket(from, to, granularity));
        Map<String, Long> instructors = StatsBuckets.toLongMap(
                userRepository.countCreatedByBucketWithRole(from, to, granularity, ROLE_INSTRUCTOR));
        Map<String, BigDecimal> revenue = StatsBuckets.toDecimalMap(
                paymentItemRepository.sumTotalRevenueByBucket(from, to, granularity));

        List<AdminStatsPointDTO> points = new ArrayList<>(buckets.getLabels().size());
        for (String label : buckets.getLabels()) {
            points.add(new AdminStatsPointDTO(
                    label,
                    users.getOrDefault(label, 0L),
                    instructors.getOrDefault(label, 0L),
                    revenue.getOrDefault(label, BigDecimal.ZERO)));
        }

        return new AdminTimeSeriesDTO(
                buckets.getGranularity(), buckets.getStartDate(), buckets.getEndDate(), points);
    }
}
