package com.zh.learnhub_api.projections.account;

import java.util.Arrays;
import java.util.List;

public interface UserAuthProjection {
    Long getId();
    String getUsername();
    String getPassword();
    String getRoleNames();

    default List<String> getRoles() {
        String roleNames = getRoleNames();
        if (roleNames == null || roleNames.isBlank()) {
            return List.of();
        }
        return Arrays.stream(roleNames.split(","))
                .map(String::trim)
                .toList();
    }
}
