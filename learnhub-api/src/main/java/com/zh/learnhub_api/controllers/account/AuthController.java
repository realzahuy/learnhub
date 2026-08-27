package com.zh.learnhub_api.controllers.account;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.account.*;
import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.account.AuthService;
import com.zh.learnhub_api.services.account.PasswordResetService;
import com.zh.learnhub_api.services.account.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "learnhub_refresh";
    private static final String REFRESH_COOKIE_PATH = "/api/auth";

    private final UserService userService;
    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final AppProperties.Auth authProperties;

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> registerUser(
            @Valid @RequestBody RegisterRequestDTO registerRequest) {
        return new ResponseEntity<>(userService.registerUser(registerRequest), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(
            @Valid @RequestBody LoginRequestDTO loginRequest,
            @CookieValue(name = REFRESH_COOKIE, required = false) String currentRefreshToken) {
        return tokenResponse(authService.login(loginRequest, currentRefreshToken));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponseDTO> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false)
            String authorization) {
        return tokenResponse(authService.refresh(refreshToken, bearerToken(authorization)));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponseDTO> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        authService.logout(
                refreshToken,
                principal == null ? null : principal.getUserId(),
                principal == null ? null : principal.getSessionId());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(new MessageResponseDTO("Đăng xuất thành công"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<PasswordResetStatusDTO> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {
        return ResponseEntity.ok(passwordResetService.requestCode(request.getEmail()));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO request) {
        passwordResetService.resetPassword(
                request.getEmail(), request.getCode(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<LoginResponseDTO> tokenResponse(AuthService.AuthTokens tokens) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(tokens).toString())
                .body(LoginResponseDTO.builder()
                        .accessToken(tokens.accessToken())
                        .user(new AuthenticatedUserDTO(tokens.fullName(), tokens.avatar()))
                        .build());
    }

    private ResponseCookie refreshCookie(AuthService.AuthTokens tokens) {
        long maxAge = Math.max(
                0,
                Duration.between(LocalDateTime.now(), tokens.refreshExpiresAt()).getSeconds());
        return cookieBuilder(tokens.refreshToken()).maxAge(maxAge).build();
    }

    private ResponseCookie clearRefreshCookie() {
        return cookieBuilder("").maxAge(Duration.ZERO).build();
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7);
    }

    private ResponseCookie.ResponseCookieBuilder cookieBuilder(String value) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(authProperties.refreshCookieSecure())
                .sameSite(authProperties.refreshCookieSameSite())
                .path(REFRESH_COOKIE_PATH);
    }
}
