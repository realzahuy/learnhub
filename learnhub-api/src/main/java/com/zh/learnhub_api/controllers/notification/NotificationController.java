package com.zh.learnhub_api.controllers.notification;

import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO;
import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO.NotificationPageDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.notification.NotificationService;
import com.zh.learnhub_api.services.notification.NotificationSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final NotificationService notificationService;
    private final NotificationSseService notificationSseService;

    @GetMapping
    public ResponseEntity<NotificationPageDTO> getMine(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    java.time.LocalDateTime cursorCreatedAt,
            @RequestParam(required = false) Long cursorId,
            Pageable pageable) {
        return ResponseEntity.ok(
                notificationService.getMine(principal.getUserId(), cursorCreatedAt, cursorId, pageable.getPageSize()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponseDTO> markAsRead(
            @PathVariable Long id, @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ResponseEntity.ok(notificationService.markAsRead(principal.getUserId(), id));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        boolean isAdmin =
                principal.getAuthorities().stream().anyMatch(authority -> ROLE_ADMIN.equals(authority.getAuthority()));
        return notificationSseService.subscribe(principal.getUserId(), isAdmin);
    }
}
