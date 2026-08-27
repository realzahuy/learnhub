package com.zh.learnhub_api.dtos.course;

import java.math.BigDecimal;

public record RecommendationCardDTO(String slug, String title, String thumbnail, BigDecimal price) {}
