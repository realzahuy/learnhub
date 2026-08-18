package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.notification.email.AccountEmailSender;

import com.zh.learnhub_api.dtos.account.PasswordResetStatusDTO;
import com.zh.learnhub_api.enums.UserActionCodePurpose;
import com.zh.learnhub_api.exceptions.TooManyRequestsException;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.pojo.UserActionCode;
import com.zh.learnhub_api.repositories.account.UserActionCodeRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import com.zh.learnhub_api.security.SessionAuthenticationCache;
import com.zh.learnhub_api.utils.UserActionCodes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Slf4j
public class PasswordResetService {

    private static final UserActionCodePurpose PURPOSE = UserActionCodePurpose.PASSWORD_RESET;

    private static final String SENT_MESSAGE =
            "Nếu email này đã đăng ký tài khoản, mã đặt lại mật khẩu vừa được gửi tới hòm thư của bạn.";

    private static final String INVALID_CODE_MESSAGE =
            "Mã không đúng hoặc đã hết hạn. Vui lòng yêu cầu mã mới.";

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final UserActionCodeRepository codeRepository;
    private final AccountEmailSender emailService;
    private final PasswordEncoder passwordEncoder;
    private final SessionAuthenticationCache sessionAuthenticationCache;

    private final int codeLength;
    private final int expireMinutes;
    private final int resendCooldownSeconds;
    private final int maxAttempts;

    public PasswordResetService(
            UserRepository userRepository,
            UserSessionRepository sessionRepository,
            UserActionCodeRepository codeRepository,
            AccountEmailSender emailService,
            PasswordEncoder passwordEncoder,
            SessionAuthenticationCache sessionAuthenticationCache,
            AppProperties.PasswordReset properties) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.codeRepository = codeRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.sessionAuthenticationCache = sessionAuthenticationCache;
        this.codeLength = properties.codeLength();
        this.expireMinutes = properties.expireMinutes();
        this.resendCooldownSeconds = properties.resendCooldownSeconds();
        this.maxAttempts = properties.maxAttempts();
    }

    @Transactional
    public PasswordResetStatusDTO requestCode(String rawEmail) {

        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();

        Optional<User> found = userRepository.findByEmail(email);
        if (found.isEmpty()) {
            log.info("Yêu cầu đặt lại mật khẩu cho email không tồn tại: {}",
                    AccountEmailSender.maskEmail(email));
            return sentStatus();
        }

        User user = found.get();
        LocalDateTime now = LocalDateTime.now();

        Optional<UserActionCode> latest = codeRepository
                .findTopByUserId_IdAndPurposeOrderByIdDesc(user.getId(), PURPOSE);
        if (latest.map(code -> UserActionCodes.secondsUntilResend(
                code, now, resendCooldownSeconds)).orElse(0L) > 0) {
            log.info("Bỏ qua yêu cầu đặt lại mật khẩu của user {} - chưa hết thời gian chờ",
                    user.getUsername());
            return sentStatus();
        }

        codeRepository.expireActiveCodes(user.getId(), PURPOSE, now);

        String code = UserActionCodes.generateNumericCode(codeLength);
        codeRepository.save(new UserActionCode(
                user, PURPOSE, code, now.plusMinutes(expireMinutes)));

        emailService.sendPasswordResetCode(user.getEmail(), code, expireMinutes);
        log.info("Đã phát mã đặt lại mật khẩu cho user {}", user.getUsername());

        return sentStatus();
    }

    @Transactional(noRollbackFor = { IllegalArgumentException.class, TooManyRequestsException.class })
    public void resetPassword(String rawEmail, String inputCode, String newPassword) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_CODE_MESSAGE));

        UserActionCode latest = codeRepository
                .findTopByUserId_IdAndPurposeOrderByIdDesc(user.getId(), PURPOSE)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_CODE_MESSAGE));

        if (latest.isUsed()) {
            log.warn("Mã đặt lại mật khẩu #{} của user {} đã dùng lúc {}", latest.getId(),
                    user.getUsername(), latest.getUsedAt());
            throw new IllegalArgumentException(INVALID_CODE_MESSAGE);
        }
        if (latest.isExpired()) {
            log.warn("Mã đặt lại mật khẩu #{} của user {} hết hạn lúc {}", latest.getId(),
                    user.getUsername(), latest.getExpiresAt());
            throw new IllegalArgumentException(INVALID_CODE_MESSAGE);
        }
        if (latest.getAttempts() >= maxAttempts) {
            throw new TooManyRequestsException(
                    "Bạn đã nhập sai quá " + maxAttempts + " lần. Hãy yêu cầu mã mới.");
        }

        if (!latest.getCode().equals(inputCode == null ? null : inputCode.trim())) {
            latest.setAttempts(latest.getAttempts() + 1);
            log.warn("Nhập sai mã đặt lại mật khẩu của user {} lần thứ {}",
                    user.getUsername(), latest.getAttempts());

            int remaining = maxAttempts - latest.getAttempts();
            throw new IllegalArgumentException(remaining > 0
                    ? "Mã không đúng. Bạn còn " + remaining + " lần thử."
                    : INVALID_CODE_MESSAGE);
        }

        LocalDateTime now = LocalDateTime.now();
        latest.setUsedAt(now);

        codeRepository.expireActiveCodes(user.getId(), PURPOSE, now);

        userRepository.updatePassword(user.getId(), passwordEncoder.encode(newPassword));
        sessionRepository.deleteAllByUserId(user.getId());
        sessionAuthenticationCache.evictUserSessionsAfterCommit(user.getId());

        log.info("User {} đã đặt lại mật khẩu qua email", user.getUsername());
    }

    private PasswordResetStatusDTO sentStatus() {
        return new PasswordResetStatusDTO(
                SENT_MESSAGE, (long) expireMinutes * 60, resendCooldownSeconds);
    }

}
