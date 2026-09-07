package com.zh.learnhub_api.services.ai.springai;

import com.google.genai.Models;
import com.google.genai.types.ContentEmbedding;
import com.google.genai.types.EmbedContentConfig;
import com.google.genai.types.EmbedContentResponse;
import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.ai.EmbeddingClient;
import org.springframework.ai.google.genai.embedding.GoogleGenAiEmbeddingConnectionDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpringAiEmbeddingClient implements EmbeddingClient {

    private final Models models;
    private final int dimension;
    private final String modelEndpointName;

    @Autowired
    public SpringAiEmbeddingClient(
            GoogleGenAiEmbeddingConnectionDetails connectionDetails,
            AppProperties.Ai properties,
            @Value("${spring.ai.google.genai.embedding.text.options.model}") String modelName) {
        this(connectionDetails.getGenAiClient().models, properties, connectionDetails.getModelEndpointName(modelName));
    }

    SpringAiEmbeddingClient(Models models, AppProperties.Ai properties, String modelEndpointName) {
        this.models = models;
        this.dimension = properties.embeddingDimension();
        this.modelEndpointName = modelEndpointName;
    }

    @Override
    public List<Float> embedDocument(String text, String title) {
        String normalizedTitle = normalizeInput(title);
        String input = "title: " + (normalizedTitle.isEmpty() ? "none" : normalizedTitle)
                + " | text: " + normalizeInput(text);
        EmbedContentConfig config = EmbedContentConfig.builder()
                .outputDimensionality(dimension)
                .build();
        EmbedContentResponse response = models.embedContent(modelEndpointName, input, config);
        List<ContentEmbedding> embeddings = response.embeddings().orElse(List.of());
        if (embeddings.isEmpty()) {
            throw new IllegalStateException("Thiếu embedding");
        }

        return embeddings.getFirst().values().orElse(List.of());
    }

    @Override
    public List<List<Float>> embedQueries(List<String> texts) {
        EmbedContentConfig config = EmbedContentConfig.builder()
                .outputDimensionality(dimension)
                .build();
        EmbedContentResponse response = models.embedContent(
                modelEndpointName,
                texts.stream()
                        .map(text -> "task: search result | query: " + normalizeInput(text))
                        .toList(),
                config);
        List<ContentEmbedding> embeddings = response.embeddings().orElse(List.of());
        if (embeddings.isEmpty()) {
            throw new IllegalStateException("Thiếu embedding");
        }

        return embeddings.stream()
                .map(embedding -> embedding.values().orElse(List.of()))
                .toList();
    }

    private String normalizeInput(String value) {
        return value == null ? "" : value.trim();
    }
}
