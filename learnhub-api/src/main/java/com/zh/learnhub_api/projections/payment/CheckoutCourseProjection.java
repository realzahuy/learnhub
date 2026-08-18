package com.zh.learnhub_api.projections.payment;

import java.math.BigDecimal;

public interface CheckoutCourseProjection {
    Long getCourseId();
    String getTitle();
    String getSlug();
    BigDecimal getPrice();
    String getStatus();
}
