package com.zh.learnhub_api.services.notification;

import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO;
import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO.NotificationPageDTO;
import com.zh.learnhub_api.enums.NotificationType;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Notification;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.repositories.notification.NotificationRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void createCourseDecision(
            Course course,
            User admin,
            NotificationType type,
            String title,
            String content) {
        Notification notification = new Notification();
        notification.setRecipientId(course.getInstructorId());
        notification.setSenderId(admin);
        notification.setCourseId(course);
        notification.setType(type);
        notification.setTitle(title);
        notification.setContent(content);

        Notification saved = notificationRepository.save(notification);
        NotificationResponseDTO response = toResponse(saved);
        eventPublisher.publishEvent(new NotificationCreatedEvent(
                saved.getRecipientId().getId(), response));
    }

    public NotificationPageDTO getMine(
            Long userId,
            String username,
            LocalDateTime cursorCreatedAt,
            Long cursorId,
            int pageSize) {
        Long resolvedUserId = resolveUserId(userId, username);

        if ((cursorCreatedAt == null) != (cursorId == null)) {
            throw new IllegalArgumentException(
                    "cursorCreatedAt và cursorId phải được gửi cùng nhau");
        }

        List<NotificationRepository.NotificationPageRow> rows = cursorCreatedAt == null
                ? notificationRepository.findFirstNotificationPage(resolvedUserId, pageSize + 1)
                : notificationRepository.findNotificationPageAfter(
                        resolvedUserId, cursorCreatedAt, cursorId, pageSize + 1);
        long unreadCount = rows.isEmpty() ? 0 : rows.getFirst().getUnreadCount();
        List<NotificationRepository.NotificationPageRow> notificationRows = rows.stream()
                .filter(row -> row.getId() != null)
                .toList();
        boolean last = notificationRows.size() <= pageSize;

        List<NotificationResponseDTO> content = notificationRows.stream()
                .limit(pageSize)
                .map(this::toResponse)
                .toList();

        NotificationResponseDTO nextCursor = !last && !content.isEmpty()
                ? content.getLast()
                : null;

        return new NotificationPageDTO(
                content,
                last,
                unreadCount,
                nextCursor == null ? null : nextCursor.getCreatedAt(),
                nextCursor == null ? null : nextCursor.getId());
    }

    @Transactional
    public NotificationResponseDTO markAsRead(
            Long userId, String username, Long notificationId) {
        Long resolvedUserId = resolveUserId(userId, username);
        Notification notification = notificationRepository
                .findByIdAndRecipientId_Id(notificationId, resolvedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo"));

        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
        }
        return toResponse(notification);
    }

    private Long resolveUserId(Long userId, String username) {
        if (userId != null) {
            return userId;
        }
        return userRepository.findByUsernameWithoutRoles(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"))
                .getId();
    }

    private NotificationResponseDTO toResponse(Notification notification) {
        return new NotificationResponseDTO(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getContent(),
                notification.getCourseId() == null ? null : notification.getCourseId().getId(),
                notification.getReadAt(),
                notification.getCreatedAt());
    }

    private NotificationResponseDTO toResponse(
            NotificationRepository.NotificationPageRow row) {
        return new NotificationResponseDTO(
                row.getId(),
                row.getType(),
                row.getTitle(),
                row.getContent(),
                row.getCourseId(),
                row.getReadAt(),
                row.getCreatedAt());
    }
}
