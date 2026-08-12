package com.zh.learnhub_api.services.vector.qdrant;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.vector.CourseVectorMatch;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@ConditionalOnProperty(name = "vector.store.provider", havingValue = "qdrant")
public class QdrantCourseVectorStore implements CourseVectorStore {

    private final RestClient restClient;
    private final String collection;
    private final boolean enabled;

    public QdrantCourseVectorStore(AppProperties.Qdrant properties) {
        this.collection = properties.collection();
        this.enabled = properties.enabled();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(properties.timeout()));
        requestFactory.setReadTimeout(Duration.ofSeconds(properties.timeout()));
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.url())
                .requestFactory(requestFactory);
        if (properties.apiKey() != null && !properties.apiKey().isBlank()) {
            builder.defaultHeader("api-key", properties.apiKey());
        }
        this.restClient = builder.build();
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public void upsert(Long courseId, List<Float> vector) {
        requireEnabled();
        Map<String, Object> body = Map.of(
                "points", List.of(Map.of("id", courseId, "vector", vector)));
        try {
            restClient.put()
                    .uri("/collections/{collection}/points?wait=true", collection)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw qdrantError("upsert point " + courseId, ex);
        }
    }

    @Override
    public void delete(Long courseId) {
        requireEnabled();
        try {
            restClient.post()
                    .uri("/collections/{collection}/points/delete?wait=true", collection)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("points", List.of(courseId)))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw qdrantError("xóa point " + courseId, ex);
        }
    }

    @Override
    public List<CourseVectorMatch> findSimilar(
            Long courseId,
            int limit,
            Set<Long> excludedCourseIds,
            Double scoreThreshold) {
        return querySimilar(courseId, limit, excludedCourseIds, scoreThreshold);
    }

    @Override
    public List<CourseVectorMatch> findSimilar(
            List<Float> queryVector,
            int limit,
            Set<Long> excludedCourseIds,
            Double scoreThreshold) {
        if (queryVector == null || queryVector.isEmpty()) {
            throw new IllegalArgumentException("Vector truy vấn không được để trống");
        }
        return querySimilar(queryVector, limit, excludedCourseIds, scoreThreshold);
    }

    private List<CourseVectorMatch> querySimilar(
            Object query, int limit, Set<Long> excludedCourseIds, Double scoreThreshold) {
        requireEnabled();
        if (limit <= 0) {
            return List.of();
        }

        Map<String, Object> body = new HashMap<>();
        body.put("query", query);
        body.put("limit", limit);
        body.put("with_payload", false);
        body.put("with_vector", false);
        if (scoreThreshold != null) {
            body.put("score_threshold", scoreThreshold);
        }
        if (excludedCourseIds != null && !excludedCourseIds.isEmpty()) {
            body.put("filter", Map.of(
                    "must_not", List.of(Map.of("has_id", List.copyOf(excludedCourseIds)))));
        }

        try {
            Map<?, ?> response = restClient.post()
                    .uri("/collections/{collection}/points/query", collection)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            return parseMatches(response);
        } catch (RestClientResponseException ex) {
            throw qdrantError("tìm khóa tương tự", ex);
        }
    }

    private List<CourseVectorMatch> parseMatches(Map<?, ?> response) {
        if (response == null) {
            throw new IllegalStateException("Qdrant không trả về nội dung");
        }
        Object resultValue = response.get("result");
        Object pointsValue = resultValue instanceof Map<?, ?> result
                ? result.get("points")
                : resultValue;
        if (!(pointsValue instanceof List<?> points)) {
            throw new IllegalStateException("Qdrant trả về danh sách point không hợp lệ");
        }

        List<CourseVectorMatch> matches = new ArrayList<>(points.size());
        for (Object pointValue : points) {
            if (!(pointValue instanceof Map<?, ?> point) || !(point.get("score") instanceof Number score)) {
                throw new IllegalStateException("Qdrant trả về point không hợp lệ");
            }
            Long id = numericId(point.get("id"));
            matches.add(new CourseVectorMatch(id, score.doubleValue()));
        }
        return List.copyOf(matches);
    }

    private Long numericId(Object idValue) {
        if (idValue instanceof Number number) {
            return number.longValue();
        }
        if (idValue instanceof Map<?, ?> idMap && idMap.get("num") instanceof Number number) {
            return number.longValue();
        }
        throw new IllegalStateException("Qdrant trả về point id không phải số");
    }

    private void requireEnabled() {
        if (!enabled) {
            throw new IllegalStateException("Qdrant đang bị tắt bởi qdrant.enabled=false");
        }
    }

    private IllegalStateException qdrantError(String operation, RestClientResponseException ex) {
        return new IllegalStateException(
                "Qdrant lỗi HTTP " + ex.getStatusCode().value() + " khi " + operation, ex);
    }
}
