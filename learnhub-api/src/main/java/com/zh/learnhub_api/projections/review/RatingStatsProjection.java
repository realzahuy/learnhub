package com.zh.learnhub_api.projections.review;

public interface RatingStatsProjection {
    Double getAverageRating();
    Long getReviewCount();
}
