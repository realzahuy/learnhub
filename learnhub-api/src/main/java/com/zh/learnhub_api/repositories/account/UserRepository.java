package com.zh.learnhub_api.repositories.account;

import com.zh.learnhub_api.enums.AccountStatus;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.account.ExistingUserProjection;
import com.zh.learnhub_api.projections.account.UserAuthProjection;
import com.zh.learnhub_api.projections.account.UserUpgradeProjection;
import com.zh.learnhub_api.projections.admin.AdminUserProjection;
import com.zh.learnhub_api.projections.instructor.PublicInstructorProjection;
import com.zh.learnhub_api.projections.stats.TimeBucketCountProjection;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    String ADMIN_USER_SELECT = "SELECT u.id AS id, u.username AS username, "
            + "u.email AS email, u.fullName AS fullName, u.avatar AS avatar, "
            + "u.bio AS bio, u.emailVerified AS emailVerified, "
            + "u.accountStatus AS accountStatus, "
            + "u.createdAt AS createdAt, u.lastLogin AS lastLogin ";

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByIdAndAccountStatus(Long id, AccountStatus accountStatus);

    @Query("SELECT u.username AS username, u.email AS email FROM User u "
            + "WHERE u.username = :username OR u.email = :email")
    List<ExistingUserProjection> findExisting(@Param("username") String username, @Param("email") String email);

    @Query(
            value = "SELECT u.id AS id, u.email_verified AS emailVerified, " + "GROUP_CONCAT(r.name) AS roleNames "
                    + "FROM user u "
                    + "LEFT JOIN user_role ur ON u.id = ur.user_id "
                    + "LEFT JOIN role r ON r.id = ur.role_id "
                    + "WHERE u.username = :username "
                    + "GROUP BY u.id",
            nativeQuery = true)
    Optional<UserUpgradeProjection> findUserForUpgrade(@Param("username") String username);

    @Modifying
    @Query(
            value = "INSERT INTO user_role (user_id, role_id) "
                    + "SELECT :userId, r.id FROM role r WHERE r.name = 'ROLE_INSTRUCTOR' "
                    + "AND NOT EXISTS (SELECT 1 FROM user_role ur WHERE ur.user_id = :userId AND ur.role_id = r.id)",
            nativeQuery = true)
    int addInstructorRole(@Param("userId") Long userId);

    @Query(
            value = "SELECT u.id AS id, u.username AS username, u.password AS password, "
                    + "GROUP_CONCAT(r.name) AS roleNames "
                    + "FROM user u "
                    + "LEFT JOIN user_role ur ON u.id = ur.user_id "
                    + "LEFT JOIN role r ON r.id = ur.role_id "
                    + "WHERE u.username = :login OR u.email = :login "
                    + "GROUP BY u.id",
            nativeQuery = true)
    Optional<UserAuthProjection> findAuthInfoByLogin(@Param("login") String login);

    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :lastLogin WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") Long userId, @Param("lastLogin") LocalDateTime lastLogin);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.fullName = :fullName, u.bio = :bio, u.avatar = :avatar WHERE u.id = :userId")
    void updateProfile(
            @Param("userId") Long userId,
            @Param("fullName") String fullName,
            @Param("bio") String bio,
            @Param("avatar") String avatar);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.password = :password WHERE u.id = :userId")
    void updatePassword(@Param("userId") Long userId, @Param("password") String password);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE User u SET u.emailVerified = true WHERE u.id = :userId")
    void markEmailVerified(@Param("userId") Long userId);

    @Query(
            value = ADMIN_USER_SELECT + "FROM User u "
                    + "WHERE EXISTS (SELECT 1 FROM u.roleSet r WHERE r.name = :roleName)",
            countQuery = "SELECT COUNT(u) FROM User u "
                    + "WHERE EXISTS (SELECT 1 FROM u.roleSet r WHERE r.name = :roleName)")
    Page<AdminUserProjection> findByRoleName(@Param("roleName") String roleName, Pageable pageable);

    @Query(
            value = ADMIN_USER_SELECT + "FROM User u "
                    + "WHERE EXISTS (SELECT 1 FROM u.roleSet r WHERE r.name = :roleName) "
                    + "AND (u.fullName LIKE :keyword "
                    + "  OR u.username LIKE :keyword "
                    + "  OR u.email LIKE :keyword)",
            countQuery = "SELECT COUNT(u) FROM User u "
                    + "WHERE EXISTS (SELECT 1 FROM u.roleSet r WHERE r.name = :roleName) "
                    + "AND (u.fullName LIKE :keyword "
                    + "  OR u.username LIKE :keyword "
                    + "  OR u.email LIKE :keyword)")
    Page<AdminUserProjection> findByRoleNameAndKeyword(
            @Param("roleName") String roleName, @Param("keyword") String keyword, Pageable pageable);

    @Query(
            value = ADMIN_USER_SELECT + "FROM User u WHERE u.accountStatus = :accountStatus",
            countQuery = "SELECT COUNT(u) FROM User u WHERE u.accountStatus = :accountStatus")
    Page<AdminUserProjection> findByAccountStatus(
            @Param("accountStatus") AccountStatus accountStatus, Pageable pageable);

    @Query(
            value = ADMIN_USER_SELECT + "FROM User u "
                    + "WHERE u.accountStatus = :accountStatus "
                    + "AND (u.fullName LIKE :keyword "
                    + "  OR u.username LIKE :keyword "
                    + "  OR u.email LIKE :keyword)",
            countQuery = "SELECT COUNT(u) FROM User u "
                    + "WHERE u.accountStatus = :accountStatus "
                    + "AND (u.fullName LIKE :keyword "
                    + "  OR u.username LIKE :keyword "
                    + "  OR u.email LIKE :keyword)")
    Page<AdminUserProjection> findByAccountStatusAndKeyword(
            @Param("accountStatus") AccountStatus accountStatus, @Param("keyword") String keyword, Pageable pageable);

    @Query(value = ADMIN_USER_SELECT + "FROM User u", countQuery = "SELECT COUNT(u) FROM User u")
    Page<AdminUserProjection> findAllProjected(Pageable pageable);

    @Query(
            value = ADMIN_USER_SELECT + "FROM User u "
                    + "WHERE u.fullName LIKE :keyword "
                    + "OR u.username LIKE :keyword "
                    + "OR u.email LIKE :keyword",
            countQuery = "SELECT COUNT(u) FROM User u "
                    + "WHERE u.fullName LIKE :keyword "
                    + "OR u.username LIKE :keyword "
                    + "OR u.email LIKE :keyword")
    Page<AdminUserProjection> findByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT u.id AS id, u.fullName AS fullName, u.avatar AS avatar, "
            + "u.bio AS bio, u.createdAt AS joinedAt FROM User u "
            + "WHERE u.id = :userId "
            + "AND EXISTS (SELECT 1 FROM u.roleSet r WHERE r.name = :roleName)")
    Optional<PublicInstructorProjection> findPublicInstructor(
            @Param("userId") Long userId, @Param("roleName") String roleName);

    @Query("SELECT u.id AS userId, r.name AS roleName " + "FROM User u JOIN u.roleSet r WHERE u.id IN :userIds")
    List<UserRoleProjection> findRolesByUserIds(@Param("userIds") List<Long> userIds);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END "
            + "FROM User u JOIN u.roleSet r WHERE u.id = :userId AND r.name = :roleName")
    boolean hasRole(@Param("userId") Long userId, @Param("roleName") String roleName);

    @Query("SELECT COUNT(u) FROM User u " + "WHERE EXISTS (SELECT 1 FROM u.roleSet r WHERE r.name = :roleName)")
    long countByRoleName(@Param("roleName") String roleName);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :from AND u.createdAt < :to")
    long countCreatedBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query(
            value = "SELECT CASE "
                    + "WHEN :groupBy = 'quarter' THEN CONCAT(YEAR(u.created_at), '-Q', QUARTER(u.created_at)) "
                    + "WHEN :groupBy = 'month' THEN DATE_FORMAT(u.created_at, '%Y-%m') "
                    + "ELSE DATE_FORMAT(u.created_at, '%Y-%m-%d') END AS bucket, COUNT(*) AS total "
                    + "FROM user u "
                    + "WHERE u.created_at >= :from AND u.created_at < :to "
                    + "GROUP BY bucket ORDER BY bucket",
            nativeQuery = true)
    List<TimeBucketCountProjection> countCreatedByBucket(
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, @Param("groupBy") String groupBy);

    @Query(
            value = "SELECT CASE "
                    + "WHEN :groupBy = 'quarter' THEN CONCAT(YEAR(u.created_at), '-Q', QUARTER(u.created_at)) "
                    + "WHEN :groupBy = 'month' THEN DATE_FORMAT(u.created_at, '%Y-%m') "
                    + "ELSE DATE_FORMAT(u.created_at, '%Y-%m-%d') END AS bucket, COUNT(*) AS total "
                    + "FROM user u "
                    + "WHERE u.created_at >= :from AND u.created_at < :to "
                    + "AND EXISTS (SELECT 1 FROM user_role ur JOIN role r ON r.id = ur.role_id "
                    + "            WHERE ur.user_id = u.id AND r.name = :roleName) "
                    + "GROUP BY bucket ORDER BY bucket",
            nativeQuery = true)
    List<TimeBucketCountProjection> countCreatedByBucketWithRole(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("groupBy") String groupBy,
            @Param("roleName") String roleName);

    interface UserRoleProjection {
        Long getUserId();

        String getRoleName();
    }
}
