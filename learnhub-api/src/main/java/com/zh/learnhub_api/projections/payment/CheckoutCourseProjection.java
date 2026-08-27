package com.zh.learnhub_api.projections.payment;

import java.math.BigDecimal;

public interface CheckoutCourseProjection {
    Long getCourseId();

    BigDecimal getPrice();
}
