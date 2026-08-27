package com.zh.learnhub_api.dtos.learning;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingSummaryDTO {
    private double average;
    private long totalReviews;
    private Map<Integer, Long> distribution;
}
