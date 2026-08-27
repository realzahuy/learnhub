package com.zh.learnhub_api.repositories.account;

import com.zh.learnhub_api.pojo.UserSession;
import com.zh.learnhub_api.projections.account.SessionAuthenticationProjection;
import com.zh.learnhub_api.projections.account.SessionRefreshProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    @Query(
            value = "SELECT us.id AS sessionId, us.refresh_token_hash AS refreshTokenHash, "
                    + "us.expires_at AS expiresAt, u.id AS userId, u.username AS username, "
                    + "u.full_name AS fullName, u.avatar AS avatar, "
                    + "u.account_status AS accountStatus, GROUP_CONCAT(r.name) AS roleNames "
                    + "FROM user_session us "
                    + "JOIN user u ON u.id = us.user_id "
                    + "LEFT JOIN user_role ur ON ur.user_id = u.id "
                    + "LEFT JOIN role r ON r.id = ur.role_id "
                    + "WHERE us.id = :sessionId "
                    + "GROUP BY us.id, us.refresh_token_hash, us.expires_at, u.id, "
                    + "u.username, u.full_name, u.avatar, u.account_status",
            nativeQuery = true)
    Optional<SessionRefreshProjection> findRefreshSessionById(@Param("sessionId") Long sessionId);

    @Query("SELECT s.user.id AS userId, s.user.accountStatus AS accountStatus, "
            + "s.expiresAt AS expiresAt FROM UserSession s WHERE s.id = :sessionId")
    Optional<SessionAuthenticationProjection> findAuthenticationById(@Param("sessionId") Long sessionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserSession s SET s.refreshTokenHash = :newHash "
            + "WHERE s.id = :sessionId AND s.refreshTokenHash = :oldHash")
    int rotateRefreshToken(
            @Param("sessionId") Long sessionId, @Param("oldHash") String oldHash, @Param("newHash") String newHash);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.id = :sessionId AND s.refreshTokenHash = :tokenHash")
    int deleteMatchingSession(@Param("sessionId") Long sessionId, @Param("tokenHash") String tokenHash);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.id = :sessionId AND s.user.id = :userId")
    int deleteCurrentSession(@Param("sessionId") Long sessionId, @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.user.id = :userId AND s.id <> :currentSessionId")
    int deleteOtherSessions(@Param("userId") Long userId, @Param("currentSessionId") Long currentSessionId);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt <= :now")
    int deleteExpired(@Param("now") LocalDateTime now);

    boolean existsByIdAndUser_Id(Long sessionId, Long userId);
}
