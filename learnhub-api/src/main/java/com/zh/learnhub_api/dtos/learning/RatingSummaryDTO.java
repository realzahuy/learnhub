package com.zh.learnhub_api.dtos.learning;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingSummaryDTO {
    private double average;
    private long totalReviews;
    private Map<Integer, Long> distribution;
}
