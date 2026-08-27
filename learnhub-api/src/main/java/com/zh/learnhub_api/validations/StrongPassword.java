package com.zh.learnhub_api.validations;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = {})
@Pattern(
        regexp =
                "(?s)^(?:\\p{javaWhitespace}*|(?=.{8,128}$)(?=.*\\p{javaUpperCase})(?=.*\\p{javaLowerCase})(?=.*\\p{javaDigit})(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]).*)$")
@ReportAsSingleViolation
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

    String message() default "Mật khẩu phải ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
