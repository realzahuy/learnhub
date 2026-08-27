package com.zh.learnhub_api.services.instructor;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.instructor.InstructorOverviewDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorTimeSeriesDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorTimeSeriesDTO.InstructorStatsPointDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.payment.PaymentItemRepository;
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
public class InstructorStatsService {

    private final EnrollmentRepository enrollmentRepository;
    private final PaymentItemRepository paymentItemRepository;
    private final CourseRepository courseRepository;
    private final AppProperties.Stats statsProperties;

    public InstructorOverviewDTO getOverview(Long instructorId) {

        LocalDateTime now = LocalDateTime.now();
        int periodDays = statsProperties.overviewPeriodDays();
        LocalDateTime currentFrom = now.minusDays(periodDays);
        LocalDateTime previousFrom = currentFrom.minusDays(periodDays);

        Map<CourseStatus, Long> byStatus = new HashMap<>();
        for (var row : courseRepository.countCoursesByStatusForInstructor(instructorId)) {
            byStatus.put(row.getStatus(), row.getCourseCount());
        }

        return InstructorOverviewDTO.builder()
                .totalStudents(enrollmentRepository.countDistinctStudents(instructorId))
                .totalRevenue(paymentItemRepository.sumRevenue(instructorId))
                .publishedCourses(byStatus.getOrDefault(CourseStatus.PUBLISHED, 0L))
                .pendingCourses(byStatus.getOrDefault(CourseStatus.PENDING, 0L))
                .draftCourses(byStatus.getOrDefault(CourseStatus.DRAFT, 0L))
                .rejectedCourses(byStatus.getOrDefault(CourseStatus.REJECTED, 0L))
                .enrollmentsCurrentPeriod(enrollmentRepository.countEnrollmentsBetween(instructorId, currentFrom, now))
                .enrollmentsPreviousPeriod(
                        enrollmentRepository.countEnrollmentsBetween(instructorId, previousFrom, currentFrom))
                .revenueCurrentPeriod(paymentItemRepository.sumRevenueBetween(instructorId, currentFrom, now))
                .revenuePreviousPeriod(paymentItemRepository.sumRevenueBetween(instructorId, previousFrom, currentFrom))
                .periodDays(periodDays)
                .build();
    }

    public InstructorTimeSeriesDTO getTimeSeries(
            Long instructorId, String groupBy, LocalDate fromDate, LocalDate toDate) {
        StatsBuckets buckets = StatsBuckets.plan(groupBy, fromDate, toDate, statsProperties);

        LocalDateTime from = buckets.getFrom();
        LocalDateTime to = buckets.getTo();
        String granularity = buckets.getGranularity();

        Map<String, Long> enrollments = StatsBuckets.toLongMap(
                enrollmentRepository.countEnrollmentsByBucket(instructorId, from, to, granularity));
        Map<String, Long> students = StatsBuckets.toLongMap(
                enrollmentRepository.countNewStudentsByBucket(instructorId, from, to, granularity));
        Map<String, BigDecimal> revenue = StatsBuckets.toDecimalMap(
                paymentItemRepository.sumRevenueByBucket(instructorId, from, to, granularity));

        List<InstructorStatsPointDTO> points =
                new ArrayList<>(buckets.getLabels().size());
        for (String label : buckets.getLabels()) {
            points.add(new InstructorStatsPointDTO(
                    label,
                    enrollments.getOrDefault(label, 0L),
                    students.getOrDefault(label, 0L),
                    revenue.getOrDefault(label, BigDecimal.ZERO)));
        }

        return new InstructorTimeSeriesDTO(
                buckets.getGranularity(), buckets.getStartDate(), buckets.getEndDate(), points);
    }
}
