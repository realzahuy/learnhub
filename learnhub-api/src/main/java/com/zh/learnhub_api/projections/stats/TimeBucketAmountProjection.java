package com.zh.learnhub_api.projections.stats;

import java.math.BigDecimal;

public interface TimeBucketAmountProjection {
    String getBucket();
    BigDecimal getAmount();
}
