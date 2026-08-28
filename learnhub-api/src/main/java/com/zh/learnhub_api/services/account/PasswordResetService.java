package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.account.PasswordResetStatusDTO;
import com.zh.learnhub_api.enums.UserActionCodePurpose;
import com.zh.learnhub_api.exceptions.TooManyRequestsException;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.pojo.UserActionCode;
import com.zh.learnhub_api.repositories.account.UserActionCodeRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import com.zh.learnhub_api.services.notification.email.AccountEmailSender;
import com.zh.learnhub_api.utils.UserActionCodes;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final UserActionCodePurpose PURPOSE = UserActionCodePurpose.PASSWORD_RESET;

    private static final String SENT_MESSAGE =
            "Mã đặt lại mật khẩu đã được gửi nếu email tồn tại.";

    private static final String INVALID_CODE_MESSAGE =
            "Mã không hợp lệ";

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final UserActionCodeRepository codeRepository;
    private final AccountEmailSender emailService;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties.PasswordReset properties;

    @Transactional
    public PasswordResetStatusDTO requestCode(String rawEmail) {

        String email = rawEmail.trim().toLowerCase();

        Optional<User> found = userRepository.findByEmail(email);
        if (found.isEmpty()) {
            return sentStatus();
        }

        User user = found.get();
        LocalDateTime now = LocalDateTime.now();

        Optional<UserActionCode> latest = codeRepository
                .findTopByUserId_IdAndPurposeOrderByIdDesc(user.getId(), PURPOSE);
        if (latest.map(code -> UserActionCodes.secondsUntilResend(
                code, now, properties.resendCooldownSeconds())).orElse(0L) > 0) {
            return sentStatus();
        }

        codeRepository.expireActiveCodes(user.getId(), PURPOSE, now);

        String code = UserActionCodes.generateNumericCode(properties.codeLength());
        codeRepository.save(new UserActionCode(
                user, PURPOSE, code, now.plusMinutes(properties.expireMinutes())));

        emailService.sendPasswordResetCode(user.getEmail(), code, properties.expireMinutes());

        return sentStatus();
    }

    @Transactional(noRollbackFor = { IllegalArgumentException.class, TooManyRequestsException.class })
    public void resetPassword(String rawEmail, String inputCode, String newPassword) {
        String email = rawEmail.trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_CODE_MESSAGE));

        UserActionCode latest = codeRepository
                .findTopByUserId_IdAndPurposeOrderByIdDesc(user.getId(), PURPOSE)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_CODE_MESSAGE));

        if (latest.isUsed()) {
            throw new IllegalArgumentException(INVALID_CODE_MESSAGE);
        }
        if (latest.isExpired()) {
            throw new IllegalArgumentException(INVALID_CODE_MESSAGE);
        }
        if (latest.getAttempts() >= properties.maxAttempts()) {
            throw new TooManyRequestsException("Nhập sai quá nhiều lần");
        }

        if (!latest.getCode().equals(inputCode.trim())) {
            latest.setAttempts(latest.getAttempts() + 1);

            int remaining = properties.maxAttempts() - latest.getAttempts();
            throw new IllegalArgumentException(remaining > 0
                    ? "Sai mã, còn %d lần".formatted(remaining)
                    : INVALID_CODE_MESSAGE);
        }

        LocalDateTime now = LocalDateTime.now();
        latest.setUsedAt(now);

        codeRepository.expireActiveCodes(user.getId(), PURPOSE, now);

        userRepository.updatePassword(user.getId(), passwordEncoder.encode(newPassword));
        sessionRepository.deleteAllByUserId(user.getId());
    }

    private PasswordResetStatusDTO sentStatus() {
        return new PasswordResetStatusDTO(
                SENT_MESSAGE,
                (long) properties.expireMinutes() * 60,
                properties.resendCooldownSeconds());
    }

}
