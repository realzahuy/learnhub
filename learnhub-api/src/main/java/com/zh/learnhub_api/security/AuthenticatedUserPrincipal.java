package com.zh.learnhub_api.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serial;
import java.util.Collection;
import java.util.List;

public final class AuthenticatedUserPrincipal implements UserDetails {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long userId;
    private final Long sessionId;
    private final String username;
    private final List<GrantedAuthority> authorities;

    public AuthenticatedUserPrincipal(
            Long userId, Long sessionId, String username, Collection<? extends GrantedAuthority> authorities) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.username = username;
        this.authorities = List.copyOf(authorities);
    }

    public Long getUserId() {
        return userId;
    }

    public Long getSessionId() {
        return sessionId;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }
}
