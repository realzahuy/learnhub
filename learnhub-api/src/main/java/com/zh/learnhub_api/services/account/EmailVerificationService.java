package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.notification.email.AccountEmailSender;

import com.zh.learnhub_api.dtos.account.EmailVerificationStatusDTO;
import com.zh.learnhub_api.enums.UserActionCodePurpose;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.exceptions.TooManyRequestsException;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.pojo.UserActionCode;
import com.zh.learnhub_api.repositories.account.UserActionCodeRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.utils.UserActionCodes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Slf4j
public class EmailVerificationService {

    private static final UserActionCodePurpose PURPOSE =
            UserActionCodePurpose.EMAIL_VERIFICATION;

    private final UserRepository userRepository;
    private final UserActionCodeRepository codeRepository;
    private final AccountEmailSender emailService;

    private final int codeLength;
    private final int expireMinutes;
    private final int resendCooldownSeconds;
    private final int maxAttempts;

    public EmailVerificationService(
            UserRepository userRepository,
            UserActionCodeRepository codeRepository,
            AccountEmailSender emailService,
            AppProperties.Verification properties) {
        this.userRepository = userRepository;
        this.codeRepository = codeRepository;
        this.emailService = emailService;
        this.codeLength = properties.codeLength();
        this.expireMinutes = properties.expireMinutes();
        this.resendCooldownSeconds = properties.resendCooldownSeconds();
        this.maxAttempts = properties.maxAttempts();
    }

    @Transactional
    public EmailVerificationStatusDTO sendCode(String username) {
        User user = loadUser(username);

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Email của bạn đã được xác thực");
        }

        LocalDateTime now = LocalDateTime.now();

        Optional<UserActionCode> latest = codeRepository
                .findTopByUserId_IdAndPurposeOrderByIdDesc(user.getId(), PURPOSE);
        long waitSeconds = latest
                .map(code -> UserActionCodes.secondsUntilResend(
                        code, now, resendCooldownSeconds))
                .orElse(0L);
        if (waitSeconds > 0) {
            throw new TooManyRequestsException(
                    "Vui lòng đợi " + waitSeconds + " giây nữa rồi hãy yêu cầu mã mới");
        }

        codeRepository.expireActiveCodes(user.getId(), PURPOSE, now);

        String code = UserActionCodes.generateNumericCode(codeLength);
        UserActionCode saved = codeRepository.save(new UserActionCode(
                user, PURPOSE, code, now.plusMinutes(expireMinutes)));

        emailService.sendVerificationCode(user.getEmail(), code, expireMinutes);

        return EmailVerificationStatusDTO.pending(
                AccountEmailSender.maskEmail(user.getEmail()),
                Duration.between(now, saved.getExpiresAt()).toSeconds(),
                resendCooldownSeconds);
    }

    @Transactional(noRollbackFor = { IllegalArgumentException.class, TooManyRequestsException.class })
    public void verifyCode(String username, String inputCode) {
        User user = loadUser(username);

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Email của bạn đã được xác thực");
        }

        UserActionCode latest = codeRepository
                .findTopByUserId_IdAndPurposeOrderByIdDesc(user.getId(), PURPOSE)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Bạn chưa yêu cầu mã xác thực nào. Hãy bấm gửi mã trước."));

        if (latest.isUsed()) {
            log.warn("Mã xác thực #{} của user {} đã dùng lúc {}", latest.getId(), username,
                    latest.getUsedAt());
            throw new IllegalArgumentException("Mã xác thực đã được sử dụng");
        }
        if (latest.isExpired()) {
            log.warn("Mã xác thực #{} của user {} hết hạn lúc {}", latest.getId(), username,
                    latest.getExpiresAt());
            throw new IllegalArgumentException("Mã xác thực đã hết hạn. Hãy yêu cầu mã mới.");
        }
        if (latest.getAttempts() >= maxAttempts) {
            throw new TooManyRequestsException(
                    "Bạn đã nhập sai quá " + maxAttempts + " lần. Hãy yêu cầu mã mới.");
        }

        if (!latest.getCode().equals(inputCode == null ? null : inputCode.trim())) {
            latest.setAttempts(latest.getAttempts() + 1);
            log.warn("User {} nhập sai mã xác thực lần thứ {}", username, latest.getAttempts());

            int remaining = maxAttempts - latest.getAttempts();
            throw new IllegalArgumentException(remaining > 0
                    ? "Mã xác thực không đúng. Bạn còn " + remaining + " lần thử."
                    : "Mã xác thực không đúng. Hãy yêu cầu mã mới.");
        }

        latest.setUsedAt(LocalDateTime.now());

        userRepository.markEmailVerified(user.getId());
        log.info("User {} đã xác thực email {}", username, AccountEmailSender.maskEmail(user.getEmail()));
    }

    private User loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
    }
}
