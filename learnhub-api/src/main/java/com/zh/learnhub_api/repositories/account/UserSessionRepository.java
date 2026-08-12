package com.zh.learnhub_api.repositories.account;

import com.zh.learnhub_api.pojo.UserSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    @EntityGraph(attributePaths = {"user", "user.roleSet"})
    @Query("SELECT s FROM UserSession s WHERE s.id = :sessionId")
    Optional<UserSession> findWithUserAndRolesById(@Param("sessionId") Long sessionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserSession s SET s.refreshTokenHash = :newHash "
         + "WHERE s.id = :sessionId AND s.refreshTokenHash = :oldHash")
    int rotateRefreshToken(@Param("sessionId") Long sessionId,
                           @Param("oldHash") String oldHash,
                           @Param("newHash") String newHash);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.id = :sessionId AND s.refreshTokenHash = :tokenHash")
    int deleteMatchingSession(@Param("sessionId") Long sessionId,
                              @Param("tokenHash") String tokenHash);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.id = :sessionId AND s.user.id = :userId")
    int deleteCurrentSession(@Param("sessionId") Long sessionId,
                             @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.user.id = :userId AND s.id <> :currentSessionId")
    int deleteOtherSessions(@Param("userId") Long userId,
                            @Param("currentSessionId") Long currentSessionId);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt <= :now")
    int deleteExpired(@Param("now") LocalDateTime now);

    boolean existsByIdAndUser_Id(Long sessionId, Long userId);
}
