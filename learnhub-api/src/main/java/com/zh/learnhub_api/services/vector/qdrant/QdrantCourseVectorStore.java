package com.zh.learnhub_api.services.vector.qdrant;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;

@Service
public class QdrantCourseVectorStore implements CourseVectorStore {

    private final RestClient restClient;
    private final String collection;
    private final boolean enabled;

    public QdrantCourseVectorStore(AppProperties.Qdrant properties) {
        this.collection = properties.collection();
        this.enabled = properties.enabled();
        if (!enabled) {
            this.restClient = null;
            return;
        }

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
    public void upsert(Long courseId, List<Float> vector, CourseVectorStore.Payload payload) {
        Map<String, Object> body = Map.of("points", List.of(Map.of(
                "id", courseId, "vector", vector, "payload", toQdrantPayload(payload))));
        restClient.put()
                .uri("/collections/{collection}/points?wait=true", collection)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void updatePayload(Long courseId, CourseVectorStore.Payload payload) {
        Map<String, Object> body = Map.of(
                "payload", toQdrantPayload(payload),
                "points", List.of(courseId));
        restClient.post()
                .uri("/collections/{collection}/points/payload?wait=true", collection)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void delete(Long courseId) {
        restClient.post()
                .uri("/collections/{collection}/points/delete?wait=true", collection)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("points", List.of(courseId)))
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public List<CourseVectorStore.Match> findSimilar(Long courseId, int limit, Set<Long> excludedCourseIds, Double scoreThreshold) {
        return querySimilar(courseId, limit, excludedCourseIds, scoreThreshold);
    }

    @Override
    public List<CourseVectorStore.Match> findSimilar(List<Float> queryVector, int limit, Set<Long> excludedCourseIds, Double scoreThreshold) {
        return querySimilar(queryVector, limit, excludedCourseIds, scoreThreshold);
    }

    private List<CourseVectorStore.Match> querySimilar(Object query, int limit, Set<Long> excludedCourseIds, Double scoreThreshold) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", query);
        body.put("limit", limit);
        body.put("with_payload", List.of("slug", "title", "thumbnail", "price"));
        body.put("with_vector", false);
        if (scoreThreshold != null) {
            body.put("score_threshold", scoreThreshold);
        }
        if (!excludedCourseIds.isEmpty()) {
            body.put("filter", Map.of("must_not", List.of(Map.of("has_id", List.copyOf(excludedCourseIds)))));
        }

        Map<?, ?> response = restClient.post()
                .uri("/collections/{collection}/points/query", collection)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);
        return parseMatches(response);
    }

    private List<CourseVectorStore.Match> parseMatches(Map<?, ?> response) {
        Map<?, ?> result = (Map<?, ?>) response.get("result");
        List<?> points = (List<?>) result.get("points");
        List<CourseVectorStore.Match> matches = new ArrayList<>(points.size());
        for (Object pointValue : points) {
            Map<?, ?> point = (Map<?, ?>) pointValue;
            Number score = (Number) point.get("score");
            CourseVectorStore.Payload payload = parsePayload(point.get("payload"));
            Long id = ((Number) point.get("id")).longValue();
            matches.add(new CourseVectorStore.Match(id, score.doubleValue(), payload));
        }
        return List.copyOf(matches);
    }

    private CourseVectorStore.Payload parsePayload(Object payloadValue) {
        Map<?, ?> payload = (Map<?, ?>) payloadValue;
        return new CourseVectorStore.Payload((String) payload.get("slug"), (String) payload.get("title"), (String) payload.get("thumbnail"), new BigDecimal(payload.get("price").toString()));
    }

    private Map<String, Object> toQdrantPayload(CourseVectorStore.Payload payload) {
        Map<String, Object> result = new HashMap<>();
        result.put("slug", payload.slug());
        result.put("title", payload.title());
        result.put("thumbnail", payload.thumbnail());
        result.put("price", payload.price());
        return result;
    }
}
