package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.account.LoginRequestDTO;
import com.zh.learnhub_api.exceptions.InvalidCredentialsException;
import com.zh.learnhub_api.pojo.Role;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.pojo.UserSession;
import com.zh.learnhub_api.projections.account.UserAuthProjection;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import com.zh.learnhub_api.security.JwtUtil;
import com.zh.learnhub_api.security.RefreshTokenCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenCodec refreshTokenCodec;
    private final AppProperties.Jwt jwtProperties;

    public AuthTokens login(LoginRequestDTO request, String currentRefreshToken) {
        UserAuthProjection userAuth = findUserAuthByLoginIdentifier(request.getLogin());
        if (!passwordEncoder.matches(request.getPassword(), userAuth.getPassword())) {
            throw new InvalidCredentialsException("Tên đăng nhập hoặc mật khẩu không đúng");
        }

        LocalDateTime now = LocalDateTime.now();
        logout(currentRefreshToken);
        sessionRepository.deleteExpired(now);

        String refreshSecret = refreshTokenCodec.newSecret();
        LocalDateTime expiresAt = now.plusSeconds(jwtProperties.refreshTokenExpiration() / 1000);
        User userReference = userRepository.getReferenceById(userAuth.getId());
        UserSession session = sessionRepository.saveAndFlush(
                new UserSession(userReference, refreshTokenCodec.hash(refreshSecret), expiresAt));

        userRepository.updateLastLogin(userAuth.getId(), now);
        String accessToken = jwtUtil.generateAccessToken(
                userAuth.getId(), userAuth.getUsername(), userAuth.getRoles(), session.getId());

        return new AuthTokens(
                accessToken,
                refreshTokenCodec.encode(session.getId(), refreshSecret),
                expiresAt);
    }

    public AuthTokens refresh(String refreshToken) {
        RefreshTokenCodec.ParsedRefreshToken parsed = refreshTokenCodec.parse(refreshToken)
                .orElseThrow(() -> new InvalidCredentialsException("Refresh token không hợp lệ"));

        UserSession session = sessionRepository.findWithUserAndRolesById(parsed.sessionId())
                .orElseThrow(() -> new InvalidCredentialsException("Refresh token không hợp lệ"));

        LocalDateTime now = LocalDateTime.now();
        if (!session.getExpiresAt().isAfter(now)) {
            sessionRepository.deleteById(session.getId());
            throw new InvalidCredentialsException("Phiên đăng nhập đã hết hạn");
        }
        if (!refreshTokenCodec.matches(parsed.secret(), session.getRefreshTokenHash())) {
            throw new InvalidCredentialsException("Refresh token không hợp lệ");
        }

        String nextSecret = refreshTokenCodec.newSecret();
        String nextHash = refreshTokenCodec.hash(nextSecret);
        int updated = sessionRepository.rotateRefreshToken(
                session.getId(), session.getRefreshTokenHash(), nextHash);
        if (updated != 1) {
            throw new InvalidCredentialsException("Refresh token đã được sử dụng");
        }

        User user = session.getUser();
        List<String> roles = user.getRoleSet().stream()
                .map(Role::getName)
                .toList();
        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), user.getUsername(), roles, session.getId());

        return new AuthTokens(
                accessToken,
                refreshTokenCodec.encode(session.getId(), nextSecret),
                session.getExpiresAt());
    }

    public void logout(String refreshToken) {
        refreshTokenCodec.parse(refreshToken).ifPresent(parsed ->
                sessionRepository.deleteMatchingSession(
                        parsed.sessionId(), refreshTokenCodec.hash(parsed.secret())));
    }

    public void logout(String refreshToken, Long authenticatedUserId, Long authenticatedSessionId) {
        if (authenticatedUserId != null && authenticatedSessionId != null) {
            sessionRepository.deleteCurrentSession(authenticatedSessionId, authenticatedUserId);
            return;
        }
        logout(refreshToken);
    }

    public int logoutOtherDevices(Long userId, Long currentSessionId) {
        if (!sessionRepository.existsByIdAndUser_Id(currentSessionId, userId)) {
            throw new InvalidCredentialsException("Phiên đăng nhập hiện tại không còn hiệu lực");
        }
        return sessionRepository.deleteOtherSessions(userId, currentSessionId);
    }

    private UserAuthProjection findUserAuthByLoginIdentifier(String login) {
        return userRepository.findAuthInfoByLogin(login)
                .orElseThrow(() -> new InvalidCredentialsException(
                        "Tên đăng nhập hoặc mật khẩu không đúng"));
    }

    public record AuthTokens(
            String accessToken,
            String refreshToken,
            LocalDateTime refreshExpiresAt) {
    }
}
