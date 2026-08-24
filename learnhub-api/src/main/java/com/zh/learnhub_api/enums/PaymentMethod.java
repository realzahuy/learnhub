package com.zh.learnhub_api.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum PaymentMethod {
    MOMO,
    PAYPAL;

    @JsonCreator
    public static PaymentMethod fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return valueOf(value.trim().toUpperCase(Locale.ROOT));
    }

    @JsonValue
    public String value() {
        return name();
    }
}
