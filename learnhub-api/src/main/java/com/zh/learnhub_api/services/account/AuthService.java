package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.account.LoginRequestDTO;
import com.zh.learnhub_api.enums.AccountStatus;
import com.zh.learnhub_api.exceptions.AccountLockedException;
import com.zh.learnhub_api.exceptions.InvalidCredentialsException;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.pojo.UserSession;
import com.zh.learnhub_api.projections.account.SessionRefreshProjection;
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

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private static final String ACCOUNT_LOCKED_MESSAGE =
            "Tài khoản đã bị khóa";

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenCodec refreshTokenCodec;
    private final AppProperties.Jwt jwtProperties;

    public AuthTokens login(LoginRequestDTO request, String currentRefreshToken) {
        UserAuthProjection userAuth = findUserAuthByLoginIdentifier(request.getLogin());
        if (!passwordEncoder.matches(request.getPassword(), userAuth.getPassword())) {
            throw new InvalidCredentialsException("Sai thông tin đăng nhập");
        }

        User lockedUser = userRepository
                .findByIdForUpdate(userAuth.getId())
                .orElseThrow(() -> new InvalidCredentialsException("Sai thông tin đăng nhập"));
        if (lockedUser.getAccountStatus() == AccountStatus.LOCKED) {
            throw new AccountLockedException(ACCOUNT_LOCKED_MESSAGE);
        }

        LocalDateTime now = LocalDateTime.now();
        logout(currentRefreshToken);

        String refreshSecret = refreshTokenCodec.newSecret();
        LocalDateTime expiresAt = now.plusSeconds(jwtProperties.refreshTokenExpiration() / 1000);
        UserSession session = sessionRepository.saveAndFlush(
                new UserSession(lockedUser, refreshTokenCodec.hash(refreshSecret), expiresAt));

        userRepository.updateLastLogin(userAuth.getId(), now);
        String accessToken = jwtUtil.generateAccessToken(
                userAuth.getId(), userAuth.getUsername(), userAuth.getRoles(), session.getId());

        return new AuthTokens(
                accessToken,
                refreshTokenCodec.encode(session.getId(), refreshSecret),
                expiresAt,
                lockedUser.getFullName(),
                lockedUser.getAvatar());
    }

    public AuthTokens refresh(String refreshToken, String previousAccessToken) {
        RefreshTokenCodec.ParsedRefreshToken parsed = refreshTokenCodec
                .parse(refreshToken)
                .orElseThrow(() -> new InvalidCredentialsException("Phiên đăng nhập không hợp lệ"));

        SessionRefreshProjection session = sessionRepository
                .findRefreshSessionById(parsed.sessionId())
                .orElseThrow(() -> invalidRefreshToken(parsed.sessionId(), previousAccessToken));

        LocalDateTime now = LocalDateTime.now();
        if (!session.getExpiresAt().isAfter(now)) {
            sessionRepository.deleteById(session.getSessionId());
            throw new InvalidCredentialsException("Phiên đăng nhập đã hết hạn");
        }
        if (!refreshTokenCodec.matches(parsed.secret(), session.getRefreshTokenHash())) {
            throw new InvalidCredentialsException("Phiên đăng nhập không hợp lệ");
        }

        if (session.getAccountStatus() == AccountStatus.LOCKED) {
            throw new AccountLockedException(ACCOUNT_LOCKED_MESSAGE);
        }

        String nextSecret = refreshTokenCodec.newSecret();
        String nextHash = refreshTokenCodec.hash(nextSecret);
        int updated =
                sessionRepository.rotateRefreshToken(session.getSessionId(), session.getRefreshTokenHash(), nextHash);
        if (updated != 1) {
            throw new InvalidCredentialsException("Phiên đăng nhập đã được làm mới");
        }

        String accessToken = jwtUtil.generateAccessToken(
                session.getUserId(), session.getUsername(), session.getRoles(), session.getSessionId());

        return new AuthTokens(
                accessToken,
                refreshTokenCodec.encode(session.getSessionId(), nextSecret),
                session.getExpiresAt(),
                session.getFullName(),
                session.getAvatar());
    }

    private RuntimeException invalidRefreshToken(Long refreshSessionId, String accessToken) {
        return jwtUtil.getAccessTokenIdentityAllowExpired(accessToken)
                .filter(identity -> refreshSessionId.equals(identity.sessionId()))
                .filter(identity -> userRepository.existsByIdAndAccountStatus(identity.userId(), AccountStatus.LOCKED))
                .<RuntimeException>map(identity -> new AccountLockedException(ACCOUNT_LOCKED_MESSAGE))
                .orElseGet(() -> new InvalidCredentialsException("Phiên đăng nhập không hợp lệ"));
    }

    public void logout(String refreshToken) {
        refreshTokenCodec.parse(refreshToken).ifPresent(parsed -> {
            sessionRepository.deleteMatchingSession(parsed.sessionId(), refreshTokenCodec.hash(parsed.secret()));
        });
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
            throw new InvalidCredentialsException("Phiên đăng nhập không còn hiệu lực");
        }
        return sessionRepository.deleteOtherSessions(userId, currentSessionId);
    }

    private UserAuthProjection findUserAuthByLoginIdentifier(String login) {
        return userRepository
                .findAuthInfoByLogin(login)
                .orElseThrow(() -> new InvalidCredentialsException("Sai thông tin đăng nhập"));
    }

    public record AuthTokens(
            String accessToken, String refreshToken, LocalDateTime refreshExpiresAt, String fullName, String avatar) {}
}
