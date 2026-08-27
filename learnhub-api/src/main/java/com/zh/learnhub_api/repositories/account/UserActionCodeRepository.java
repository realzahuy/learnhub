package com.zh.learnhub_api.repositories.account;

import com.zh.learnhub_api.enums.UserActionCodePurpose;
import com.zh.learnhub_api.pojo.UserActionCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserActionCodeRepository extends JpaRepository<UserActionCode, Long> {

    Optional<UserActionCode> findTopByUserId_IdAndPurposeOrderByIdDesc(Long userId, UserActionCodePurpose purpose);

    @Modifying
    @Query("UPDATE UserActionCode c SET c.expiresAt = :now "
            + "WHERE c.userId.id = :userId AND c.purpose = :purpose "
            + "AND c.usedAt IS NULL AND c.expiresAt > :now")
    int expireActiveCodes(
            @Param("userId") Long userId,
            @Param("purpose") UserActionCodePurpose purpose,
            @Param("now") LocalDateTime now);
}
