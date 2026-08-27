package com.zh.learnhub_api.security;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Component
public class RefreshTokenCodec {

    private static final int SECRET_BYTES = 32;
    private final SecureRandom secureRandom = new SecureRandom();

    public String newSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String encode(Long sessionId, String secret) {
        return sessionId + "." + secret;
    }

    public Optional<ParsedRefreshToken> parse(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        int separator = token.indexOf('.');
        if (separator <= 0 || separator == token.length() - 1) {
            return Optional.empty();
        }

        try {
            long sessionId = Long.parseLong(token.substring(0, separator));
            if (sessionId <= 0) {
                return Optional.empty();
            }
            return Optional.of(new ParsedRefreshToken(sessionId, token.substring(separator + 1)));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    public String hash(String secret) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Thuật toán SHA-256 không khả dụng", exception);
        }
    }

    public boolean matches(String secret, String expectedHash) {
        byte[] actual = hash(secret).getBytes(StandardCharsets.US_ASCII);
        byte[] expected = expectedHash.getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(actual, expected);
    }

    public record ParsedRefreshToken(Long sessionId, String secret) {}
}
