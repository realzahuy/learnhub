
package com.zh.learnhub_api.validations;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.ArrayList;
import java.util.List;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    private int minLength;
    private int maxLength;
    private boolean requireUppercase;
    private boolean requireLowercase;
    private boolean requireDigit;
    private boolean requireSpecialChar;

    private static final String SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";

    @Override
    public void initialize(StrongPassword constraintAnnotation) {
        this.minLength = constraintAnnotation.minLength();
        this.maxLength = constraintAnnotation.maxLength();
        this.requireUppercase = constraintAnnotation.requireUppercase();
        this.requireLowercase = constraintAnnotation.requireLowercase();
        this.requireDigit = constraintAnnotation.requireDigit();
        this.requireSpecialChar = constraintAnnotation.requireSpecialChar();
    }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {

        if (password == null || password.isBlank()) {
            return true;
        }

        List<String> violations = new ArrayList<>();

        if (password.length() < minLength) {
            violations.add("ít nhất " + minLength + " ký tự");
        }

        if (password.length() > maxLength) {
            violations.add("không quá " + maxLength + " ký tự");
        }

        boolean hasUppercase = false;
        boolean hasLowercase = false;
        boolean hasDigit = false;
        boolean hasSpecialChar = false;

        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) {
                hasUppercase = true;
            } else if (Character.isLowerCase(c)) {
                hasLowercase = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            } else if (SPECIAL_CHARS.indexOf(c) >= 0) {
                hasSpecialChar = true;
            }

            if ((!requireUppercase || hasUppercase)
                    && (!requireLowercase || hasLowercase)
                    && (!requireDigit || hasDigit)
                    && (!requireSpecialChar || hasSpecialChar)) {
                break;
            }
        }

        if (requireUppercase && !hasUppercase) {
            violations.add("ít nhất 1 chữ hoa");
        }

        if (requireLowercase && !hasLowercase) {
            violations.add("ít nhất 1 chữ thường");
        }

        if (requireDigit && !hasDigit) {
            violations.add("ít nhất 1 chữ số");
        }

        if (requireSpecialChar && !hasSpecialChar) {
            violations.add("ít nhất 1 ký tự đặc biệt");
        }

        if (!violations.isEmpty()) {
            context.disableDefaultConstraintViolation();
            String customMessage = "Mật khẩu phải có: " + String.join(", ", violations);
            context.buildConstraintViolationWithTemplate(customMessage)
                   .addConstraintViolation();
            return false;
        }

        return true;
    }
}
