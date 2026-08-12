package com.zh.learnhub_api.repositories.notification;

import com.zh.learnhub_api.pojo.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query(value = """
            SELECT n.id AS id,
                   n.type AS type,
                   n.title AS title,
                   n.content AS content,
                   n.course_id AS courseId,
                   n.read_at AS readAt,
                   n.created_at AS createdAt
            FROM notification n
            WHERE n.recipient_id = :recipientId
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<NotificationPageRow> findFirstNotificationPage(
            @Param("recipientId") Long recipientId,
            @Param("limit") int limit);

    @Query(value = """
            SELECT n.id AS id,
                   n.type AS type,
                   n.title AS title,
                   n.content AS content,
                   n.course_id AS courseId,
                   n.read_at AS readAt,
                   n.created_at AS createdAt
            FROM notification n
            WHERE n.recipient_id = :recipientId
              AND (n.created_at < :cursorCreatedAt
                   OR (n.created_at = :cursorCreatedAt AND n.id < :cursorId))
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<NotificationPageRow> findNotificationPageAfter(
            @Param("recipientId") Long recipientId,
            @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit);

    long countByRecipientId_IdAndReadAtIsNull(Long recipientId);

    Optional<Notification> findByIdAndRecipientId_Id(Long id, Long recipientId);

    interface NotificationPageRow {
        Long getId();
        String getType();
        String getTitle();
        String getContent();
        Long getCourseId();
        LocalDateTime getReadAt();
        LocalDateTime getCreatedAt();
    }
}
