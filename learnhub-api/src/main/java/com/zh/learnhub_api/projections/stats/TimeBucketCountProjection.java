package com.zh.learnhub_api.projections.stats;

public interface TimeBucketCountProjection {
    String getBucket();

    Long getTotal();
}
