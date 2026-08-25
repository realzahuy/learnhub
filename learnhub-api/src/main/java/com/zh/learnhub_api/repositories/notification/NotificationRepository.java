package com.zh.learnhub_api.repositories.notification;

import com.zh.learnhub_api.enums.NotificationType;
import com.zh.learnhub_api.pojo.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query(value = """
            SELECT page.id AS id,
                   page.type AS type,
                   page.title AS title,
                   page.content AS content,
                   page.courseId AS courseId,
                   page.readAt AS readAt,
                   page.createdAt AS createdAt,
                   unread.unreadCount AS unreadCount
            FROM (SELECT COUNT(*) AS unreadCount
                  FROM notification n
                  WHERE n.recipient_id = :recipientId
                    AND n.read_at IS NULL) unread
            LEFT JOIN (SELECT n.id AS id,
                              n.type AS type,
                              n.title AS title,
                              n.content AS content,
                              n.course_id AS courseId,
                              n.read_at AS readAt,
                              n.created_at AS createdAt
                       FROM notification n
                       WHERE n.recipient_id = :recipientId
                       ORDER BY n.created_at DESC, n.id DESC
                       LIMIT :limit) page ON TRUE
            ORDER BY page.createdAt DESC, page.id DESC
            """, nativeQuery = true)
    List<NotificationPageRow> findFirstNotificationPage(
            @Param("recipientId") Long recipientId,
            @Param("limit") int limit);

    @Query(value = """
            SELECT page.id AS id,
                   page.type AS type,
                   page.title AS title,
                   page.content AS content,
                   page.courseId AS courseId,
                   page.readAt AS readAt,
                   page.createdAt AS createdAt,
                   unread.unreadCount AS unreadCount
            FROM (SELECT COUNT(*) AS unreadCount
                  FROM notification n
                  WHERE n.recipient_id = :recipientId
                    AND n.read_at IS NULL) unread
            LEFT JOIN (SELECT n.id AS id,
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
                       LIMIT :limit) page ON TRUE
            ORDER BY page.createdAt DESC, page.id DESC
            """, nativeQuery = true)
    List<NotificationPageRow> findNotificationPageAfter(
            @Param("recipientId") Long recipientId,
            @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit);

    Optional<Notification> findByIdAndRecipientId_Id(Long id, Long recipientId);

    interface NotificationPageRow {
        Long getId();
        NotificationType getType();
        String getTitle();
        String getContent();
        Long getCourseId();
        LocalDateTime getReadAt();
        LocalDateTime getCreatedAt();
        Long getUnreadCount();
    }
}
