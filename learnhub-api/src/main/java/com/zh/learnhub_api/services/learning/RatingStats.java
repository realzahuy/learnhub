package com.zh.learnhub_api.services.learning;

public record RatingStats(double average, long reviewCount) {

    public static RatingStats empty() {
        return new RatingStats(0d, 0L);
    }
}
