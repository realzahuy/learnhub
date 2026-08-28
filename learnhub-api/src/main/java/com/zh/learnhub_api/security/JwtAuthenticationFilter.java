package com.zh.learnhub_api.security;

import com.zh.learnhub_api.enums.AccountStatus;
import com.zh.learnhub_api.projections.account.SessionAuthenticationProjection;
import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserSessionRepository sessionRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);
        JwtUtil.AccessTokenClaims claims;
        try {
            claims = jwtUtil.getAccessTokenClaims(jwt);
        } catch (JwtException | IllegalArgumentException exception) {
            filterChain.doFilter(request, response);
            return;
        }

        if (claims == null || SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }
        SessionAuthenticationProjection session =
                sessionRepository.findAuthenticationById(claims.sessionId()).orElse(null);
        if (session == null
                || !claims.userId().equals(session.getUserId())
                || session.getAccountStatus() != AccountStatus.ACTIVE
                || !session.getExpiresAt().isAfter(LocalDateTime.now())) {
            filterChain.doFilter(request, response);
            return;
        }

        List<SimpleGrantedAuthority> authorities =
                claims.roles().stream().map(SimpleGrantedAuthority::new).toList();
        AuthenticatedUserPrincipal userDetails =
                new AuthenticatedUserPrincipal(claims.userId(), claims.sessionId(), claims.username(), authorities);
        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authToken);

        filterChain.doFilter(request, response);
    }
}
