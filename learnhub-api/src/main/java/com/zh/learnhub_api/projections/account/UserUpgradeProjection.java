package com.zh.learnhub_api.projections.account;

public interface UserUpgradeProjection {
    Long getId();

    Boolean getEmailVerified();

    String getRoleNames();
}
