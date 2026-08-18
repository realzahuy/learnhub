package com.zh.learnhub_api.services.ai.springai;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.services.ai.EmbeddingClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.ai.google.genai.text.GoogleGenAiTextEmbeddingOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class SpringAiEmbeddingClient implements EmbeddingClient {

    private final EmbeddingModel embeddingModel;
    private final int dimension;
    private final String modelName;

    public SpringAiEmbeddingClient(
            EmbeddingModel embeddingModel,
            AppProperties.Ai properties,
            @Value("${spring.ai.google.genai.embedding.text.options.model}") String modelName) {
        this.embeddingModel = embeddingModel;
        this.dimension = properties.embeddingDimension();
        this.modelName = modelName.trim();
    }

    @Override
    public List<Float> embedDocument(String text, String title) {
        String documentInput = "title: " + normalizeInput(title) + " | text: " + normalizeInput(text);
        return embed(documentInput);
    }

    @Override
    @Cacheable(
            cacheNames = CacheNames.QUERY_EMBEDDINGS,
            key = "#root.target.queryCacheKey(#text)",
            sync = true)
    public List<Float> embedQuery(String text) {
        return embed("task: search result | query: " + normalizeInput(text));
    }

    public String queryCacheKey(String text) {
        String normalized = text == null
                ? ""
                : text.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        return modelName + ":" + dimension + ":" + normalized;
    }

    private String normalizeInput(String value) {
        return value == null ? "" : value.trim();
    }

    private List<Float> embed(String text) {
        if (dimension <= 0) {
            throw new IllegalStateException("Số chiều embedding phải lớn hơn 0");
        }

        GoogleGenAiTextEmbeddingOptions options = GoogleGenAiTextEmbeddingOptions.builder()
                .dimensions(dimension)
                .build();

        EmbeddingResponse response;
        try {
            response = embeddingModel.call(new EmbeddingRequest(
                    List.of(text),
                    options));
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Không thể tạo embedding bằng Spring AI", ex);
        }

        if (response == null || response.getResult() == null
                || response.getResult().getOutput() == null) {
            throw new IllegalStateException("Spring AI không trả về embedding");
        }

        float[] rawVector = response.getResult().getOutput();
        if (rawVector.length != dimension) {
            throw new IllegalStateException(
                    "Spring AI trả vector " + rawVector.length + " chiều, cần đúng " + dimension);
        }

        List<Float> vector = new ArrayList<>(dimension);
        for (float value : rawVector) {
            if (!Float.isFinite(value)) {
                throw new IllegalStateException("Spring AI trả phần tử vector không hữu hạn");
            }
            vector.add(value);
        }
        return List.copyOf(vector);
    }
}
