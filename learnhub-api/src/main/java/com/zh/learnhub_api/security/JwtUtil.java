package com.zh.learnhub_api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import com.zh.learnhub_api.configs.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    private final AppProperties.Jwt properties;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    public List<String> getRolesFromToken(String token) {
        Claims claims = getAllClaimsFromToken(token);
        @SuppressWarnings("unchecked")
        List<String> roles = claims.get("roles", List.class);
        return roles != null ? roles : Collections.emptyList();
    }

    public Long getUserIdFromToken(String token) {
        Number userId = getAllClaimsFromToken(token).get("userId", Number.class);
        return userId == null ? null : userId.longValue();
    }

    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getSessionIdFromToken(String token) {
        Number sessionId = getAllClaimsFromToken(token).get("sessionId", Number.class);
        return sessionId == null ? null : sessionId.longValue();
    }

    public String generateAccessToken(
            Long userId, String username, Collection<String> roles, Long sessionId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "access");
        claims.put("userId", userId);
        claims.put("sessionId", sessionId);
        claims.put("roles", new ArrayList<>(roles));
        return doGenerateToken(claims, username, properties.accessTokenExpiration());
    }

    private String doGenerateToken(Map<String, Object> claims, String subject, Long expiration) {
        final Date createdDate = new Date();
        final Date expirationDate = new Date(createdDate.getTime() + expiration);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(createdDate)
                .expiration(expirationDate)
                .signWith(getSigningKey())
                .compact();
    }

    public AccessTokenClaims getAccessTokenClaims(String token) {
        Claims claims = getAllClaimsFromToken(token);
        if (!"access".equals(claims.get("type", String.class))) {
            return null;
        }
        String username = claims.getSubject();
        Number userId = claims.get("userId", Number.class);
        Number sessionId = claims.get("sessionId", Number.class);
        if (username == null || userId == null || sessionId == null) {
            return null;
        }
        @SuppressWarnings("unchecked")
        List<String> roles = claims.get("roles", List.class);
        return new AccessTokenClaims(userId.longValue(), sessionId.longValue(), username, roles == null ? List.of() : List.copyOf(roles));
    }

    public Optional<AccessTokenIdentity> getAccessTokenIdentityAllowExpired(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        Claims claims;
        try {
            claims = getAllClaimsFromToken(token);
        } catch (ExpiredJwtException exception) {
            claims = exception.getClaims();
        } catch (JwtException | IllegalArgumentException exception) {
            return Optional.empty();
        }

        if (!"access".equals(claims.get("type", String.class))) {
            return Optional.empty();
        }
        Number userId = claims.get("userId", Number.class);
        Number sessionId = claims.get("sessionId", Number.class);
        if (userId == null || sessionId == null) {
            return Optional.empty();
        }
        return Optional.of(new AccessTokenIdentity(
                userId.longValue(), sessionId.longValue()));
    }

    public record AccessTokenIdentity(Long userId, Long sessionId) {
    }

    public record AccessTokenClaims(Long userId, Long sessionId, String username, List<String> roles) {
    }

}
