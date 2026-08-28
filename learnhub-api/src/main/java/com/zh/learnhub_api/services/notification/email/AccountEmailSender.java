package com.zh.learnhub_api.services.notification.email;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.exceptions.ExternalServiceException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class AccountEmailSender {

    private final JavaMailSender mailSender;
    private final AppProperties.SpringMail springMailProperties;
    private final AppProperties.Mail mailProperties;

    public void sendVerificationCode(String toEmail, String code, int expireMinutes) {
        sendCodeEmail(
                toEmail,
                "Mã xác thực email learnhub: " + code,
                buildVerificationHtml(code, expireMinutes),
                "Không gửi được email xác thực. Vui lòng thử lại sau.");
    }

    public void sendPasswordResetCode(String toEmail, String code, int expireMinutes) {
        sendCodeEmail(
                toEmail,
                "Mã đặt lại mật khẩu learnhub: " + code,
                buildPasswordResetHtml(code, expireMinutes),
                "Không gửi được email đặt lại mật khẩu. Vui lòng thử lại sau.");
    }

    public void sendAccountLocked(String toEmail, String fullName, String adminEmail) {
        sendCodeEmail(
                toEmail,
                "Tài khoản learnhub của bạn đã bị khóa",
                buildAccountLockedHtml(fullName, adminEmail),
                "Không gửi được email thông báo khóa tài khoản. Vui lòng thử lại sau.");
    }

    public void sendAccountUnlocked(String toEmail, String fullName) {
        sendCodeEmail(
                toEmail,
                "Tài khoản learnhub của bạn đã được mở khóa",
                buildAccountUnlockedHtml(fullName),
                "Không gửi được email thông báo mở khóa tài khoản. Vui lòng thử lại sau.");
    }

    private void sendCodeEmail(String toEmail, String subject, String html, String failureMessage) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

            helper.setFrom(springMailProperties.username(), mailProperties.fromName());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (UnsupportedEncodingException
                | jakarta.mail.MessagingException
                | org.springframework.mail.MailException ex) {
            throw new ExternalServiceException(failureMessage, ex);
        }
    }

    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "";

        int at = email.indexOf('@');
        if (at <= 0) return "***";

        String name = email.substring(0, at);
        String domain = email.substring(at);
        if (name.length() <= 3) return name.charAt(0) + "***" + domain;
        return name.substring(0, 3) + "***" + domain;
    }

    private String buildVerificationHtml(String code, int expireMinutes) {
        return """
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101828">
              <h2 style="margin:0 0 8px">Xác thực địa chỉ email</h2>
              <p style="margin:0 0 20px;color:#667085">
                Nhập mã dưới đây vào trang learnhub để hoàn tất xác thực.
              </p>
              <div style="padding:16px;border:1px solid #e4e7ec;border-radius:12px;text-align:center">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px">%s</span>
              </div>
              <p style="margin:20px 0 0;color:#667085;font-size:14px">
                Mã có hiệu lực trong %d phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.
              </p>
            </div>
            """.formatted(code, expireMinutes);
    }

    private String buildPasswordResetHtml(String code, int expireMinutes) {
        return """
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101828">
              <h2 style="margin:0 0 8px">Đặt lại mật khẩu</h2>
              <p style="margin:0 0 20px;color:#667085">
                Nhập mã dưới đây vào trang learnhub để đặt mật khẩu mới.
              </p>
              <div style="padding:16px;border:1px solid #e4e7ec;border-radius:12px;text-align:center">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px">%s</span>
              </div>
              <p style="margin:20px 0 0;color:#667085;font-size:14px">
                Mã có hiệu lực trong %d phút và chỉ dùng được một lần.
              </p>
              <p style="margin:8px 0 0;color:#667085;font-size:14px">
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy đăng nhập và đổi mật khẩu ngay -
                có thể ai đó đang cố truy cập tài khoản của bạn.
              </p>
            </div>
            """.formatted(code, expireMinutes);
    }

    static String buildAccountLockedHtml(String fullName, String adminEmail) {
        String safeName = HtmlUtils.htmlEscape(fullName == null || fullName.isBlank() ? "bạn" : fullName);
        String safeAdminEmail = HtmlUtils.htmlEscape(adminEmail);
        return """
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101828">
              <h2 style="margin:0 0 8px">Tài khoản đã bị khóa</h2>
              <p style="margin:0 0 16px;color:#475467">Xin chào %s,</p>
              <p style="margin:0;color:#475467;line-height:1.6">
                Tài khoản learnhub của bạn đã bị quản trị viên khóa. Nếu có thắc mắc, vui lòng
                liên hệ quản trị viên qua email
                <a href="mailto:%s" style="color:#175cd3;font-weight:700">%s</a>.
              </p>
            </div>
            """.formatted(safeName, safeAdminEmail, safeAdminEmail);
    }

    static String buildAccountUnlockedHtml(String fullName) {
        String safeName = HtmlUtils.htmlEscape(fullName == null || fullName.isBlank() ? "bạn" : fullName);
        return """
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101828">
              <h2 style="margin:0 0 8px">Tài khoản đã được mở khóa</h2>
              <p style="margin:0 0 16px;color:#475467">Xin chào %s,</p>
              <p style="margin:0;color:#475467;line-height:1.6">
                Tài khoản learnhub của bạn đã được mở khóa.
              </p>
            </div>
            """.formatted(safeName);
    }
}
