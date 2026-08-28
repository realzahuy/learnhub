package com.zh.learnhub_api.services.ai;

import java.util.List;

public record ChatPlan(String reply, boolean recommendCourses, List<String> searchKeywords) {

    public ChatPlan {
        reply = reply == null ? "" : reply.trim();
        searchKeywords = searchKeywords == null
                ? List.of()
                : searchKeywords.stream()
                        .filter(keyword -> keyword != null && !keyword.isBlank())
                        .map(String::trim)
                        .filter(keyword -> keyword.length() <= 100)
                        .distinct()
                        .limit(8)
                        .toList();
        if (!recommendCourses) {
            searchKeywords = List.of();
        }
    }

    public boolean shouldSearchCourses() {
        return recommendCourses && !searchKeywords.isEmpty();
    }
}
