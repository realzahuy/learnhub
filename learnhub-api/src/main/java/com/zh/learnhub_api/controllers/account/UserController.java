package com.zh.learnhub_api.controllers.account;

import com.zh.learnhub_api.dtos.account.ChangePasswordRequestDTO;
import com.zh.learnhub_api.dtos.account.LogoutOtherDevicesResponseDTO;
import com.zh.learnhub_api.dtos.account.UpdateProfileRequestDTO;
import com.zh.learnhub_api.dtos.account.UserResponseDTO;
import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.account.AuthService;
import com.zh.learnhub_api.services.account.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> getCurrentUser(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        UserResponseDTO user = userService.getUserByUsername(principal.getUsername());
        return ResponseEntity.ok(user);
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponseDTO> updateProfile(
            @Valid @ModelAttribute UpdateProfileRequestDTO request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        UserResponseDTO updated = userService.updateProfile(principal.getUsername(), request, avatar);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/me/password")
    public ResponseEntity<MessageResponseDTO> changePassword(
            @Valid @RequestBody ChangePasswordRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        userService.changePassword(
                principal.getUsername(),
                principal.getSessionId(),
                request.getOldPassword(),
                request.getNewPassword());
        return ResponseEntity.ok(new MessageResponseDTO("Đổi mật khẩu thành công"));
    }

    @PostMapping("/me/sessions/logout-others")
    public ResponseEntity<LogoutOtherDevicesResponseDTO> logoutOtherDevices(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        int loggedOutSessions = authService.logoutOtherDevices(
                principal.getUserId(), principal.getSessionId());
        return ResponseEntity.ok(new LogoutOtherDevicesResponseDTO(
                "Đã đăng xuất khỏi các thiết bị khác", loggedOutSessions));
    }

    @PostMapping("/upgrade-to-instructor")
    public ResponseEntity<MessageResponseDTO> upgradeToInstructor(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        userService.upgradeToInstructor(principal.getUsername());
        return ResponseEntity.ok(
                new MessageResponseDTO("Nâng cấp tài khoản lên giảng viên thành công"));
    }
}
