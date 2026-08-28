package com.zh.learnhub_api.controllers.account;

import com.zh.learnhub_api.dtos.account.ChangePasswordRequestDTO;
import com.zh.learnhub_api.dtos.account.LogoutOtherDevicesResponseDTO;
import com.zh.learnhub_api.dtos.account.UpdateProfileRequestDTO;
import com.zh.learnhub_api.dtos.account.UserResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.account.AuthService;
import com.zh.learnhub_api.services.account.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthService authService;

    @GetMapping("/me")
    public UserResponseDTO getCurrentUser(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return userService.getUserByUsername(principal.getUsername());
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponseDTO updateProfile(
            @Valid @ModelAttribute UpdateProfileRequestDTO request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return userService.updateProfile(principal.getUsername(), request, avatar);
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        userService.changePassword(
                principal.getUsername(),
                principal.getSessionId(),
                request.getOldPassword(),
                request.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/sessions/logout-others")
    public LogoutOtherDevicesResponseDTO logoutOtherDevices(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        int loggedOutSessions = authService.logoutOtherDevices(
                principal.getUserId(), principal.getSessionId());
        return new LogoutOtherDevicesResponseDTO(
                "Đã đăng xuất khỏi các thiết bị khác", loggedOutSessions);
    }

    @PostMapping("/upgrade-to-instructor")
    public ResponseEntity<Void> upgradeToInstructor(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        userService.upgradeToInstructor(principal.getUsername());
        return ResponseEntity.noContent().build();
    }
}
