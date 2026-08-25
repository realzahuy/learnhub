package com.zh.learnhub_api.repositories.payment;

import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Payment p SET p.status = com.zh.learnhub_api.enums.PaymentStatus.EXPIRED, "
         + "p.updatedAt = :now WHERE p.status = com.zh.learnhub_api.enums.PaymentStatus.PENDING "
         + "AND p.createdAt <= :threshold")
    int expireAllOverdue(@Param("threshold") LocalDateTime threshold,
                         @Param("now") LocalDateTime now);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE Payment p SET p.status = com.zh.learnhub_api.enums.PaymentStatus.EXPIRED, "
         + "p.updatedAt = :now WHERE p.userId = :user "
         + "AND p.status = com.zh.learnhub_api.enums.PaymentStatus.PENDING "
         + "AND p.createdAt <= :threshold AND EXISTS ("
         + "SELECT pi.id FROM PaymentItem pi "
         + "WHERE pi.paymentId = p AND pi.courseId.id IN :courseIds)")
    int expireOverdueByUserAndCourseIds(@Param("user") User user,
                                        @Param("courseIds") List<Long> courseIds,
                                        @Param("threshold") LocalDateTime threshold,
                                        @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Payment p SET p.status = com.zh.learnhub_api.enums.PaymentStatus.EXPIRED, "
         + "p.updatedAt = :now "
         + "WHERE p.id = :paymentId AND p.userId.id = :userId "
         + "AND p.status = com.zh.learnhub_api.enums.PaymentStatus.PENDING "
         + "AND p.createdAt <= :threshold")
    int expireOverdueByIdAndUserId(@Param("paymentId") Long paymentId,
                                   @Param("userId") Long userId,
                                   @Param("threshold") LocalDateTime threshold,
                                   @Param("now") LocalDateTime now);

    Optional<Payment> findByIdAndUserId_Id(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id AND p.userId.id = :userId")
    Optional<Payment> findByIdAndUserIdForUpdate(@Param("id") Long id,
                                                 @Param("userId") Long userId);
}
