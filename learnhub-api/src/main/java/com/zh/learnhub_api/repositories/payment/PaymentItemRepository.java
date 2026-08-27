package com.zh.learnhub_api.repositories.payment;

import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.PaymentItem;
import com.zh.learnhub_api.projections.stats.TimeBucketAmountProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PaymentItemRepository extends JpaRepository<PaymentItem, Long> {

    List<PaymentItem> findByPaymentId(Payment payment);

    @Query("SELECT COALESCE(SUM(pi.price), 0) FROM PaymentItem pi "
            + "WHERE pi.courseId.instructorId.id = :instructorId "
            + "AND pi.paymentId.status = com.zh.learnhub_api.enums.PaymentStatus.SUCCESS")
    BigDecimal sumRevenue(@Param("instructorId") Long instructorId);

    @Query("SELECT COALESCE(SUM(pi.price), 0) FROM PaymentItem pi "
            + "WHERE pi.courseId.instructorId.id = :instructorId "
            + "AND pi.paymentId.status = com.zh.learnhub_api.enums.PaymentStatus.SUCCESS "
            + "AND pi.paymentId.createdAt >= :from AND pi.paymentId.createdAt < :to")
    BigDecimal sumRevenueBetween(
            @Param("instructorId") Long instructorId, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query(
            value = "SELECT CASE "
                    + "WHEN :groupBy = 'quarter' THEN CONCAT(YEAR(p.created_at), '-Q', QUARTER(p.created_at)) "
                    + "WHEN :groupBy = 'month' THEN DATE_FORMAT(p.created_at, '%Y-%m') "
                    + "ELSE DATE_FORMAT(p.created_at, '%Y-%m-%d') END AS bucket, "
                    + "COALESCE(SUM(pi.price), 0) AS amount "
                    + "FROM payment_item pi "
                    + "JOIN payment p ON p.id = pi.payment_id "
                    + "JOIN course c ON c.id = pi.course_id "
                    + "WHERE c.instructor_id = :instructorId "
                    + "AND p.status = 'SUCCESS' AND p.created_at >= :from AND p.created_at < :to "
                    + "GROUP BY bucket ORDER BY bucket",
            nativeQuery = true)
    List<TimeBucketAmountProjection> sumRevenueByBucket(
            @Param("instructorId") Long instructorId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("groupBy") String groupBy);

    @Query("SELECT COALESCE(SUM(pi.price), 0) FROM PaymentItem pi "
            + "WHERE pi.paymentId.status = com.zh.learnhub_api.enums.PaymentStatus.SUCCESS")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(pi.price), 0) FROM PaymentItem pi "
            + "WHERE pi.paymentId.status = com.zh.learnhub_api.enums.PaymentStatus.SUCCESS "
            + "AND pi.paymentId.createdAt >= :from AND pi.paymentId.createdAt < :to")
    BigDecimal sumTotalRevenueBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query(
            value = "SELECT CASE "
                    + "WHEN :groupBy = 'quarter' THEN CONCAT(YEAR(p.created_at), '-Q', QUARTER(p.created_at)) "
                    + "WHEN :groupBy = 'month' THEN DATE_FORMAT(p.created_at, '%Y-%m') "
                    + "ELSE DATE_FORMAT(p.created_at, '%Y-%m-%d') END AS bucket, "
                    + "COALESCE(SUM(pi.price), 0) AS amount "
                    + "FROM payment_item pi "
                    + "JOIN payment p ON p.id = pi.payment_id "
                    + "WHERE p.status = 'SUCCESS' AND p.created_at >= :from AND p.created_at < :to "
                    + "GROUP BY bucket ORDER BY bucket",
            nativeQuery = true)
    List<TimeBucketAmountProjection> sumTotalRevenueByBucket(
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, @Param("groupBy") String groupBy);
}
