package com.zh.learnhub_api.controllers.admin;

import com.zh.learnhub_api.dtos.admin.AdminUserDTO;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.enums.AdminUserFilter;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.admin.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<PageResponseDTO<AdminUserDTO>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") AdminUserFilter filter,
            Pageable pageable) {

        return ResponseEntity.ok(adminUserService.listUsers(search, filter, pageable));
    }

    @PostMapping("/{userId}/lock")
    public ResponseEntity<Void> lockUser(
            @PathVariable Long userId, @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        adminUserService.lockUser(userId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/unlock")
    public ResponseEntity<Void> unlockUser(@PathVariable Long userId) {
        adminUserService.unlockUser(userId);
        return ResponseEntity.noContent().build();
    }
}
