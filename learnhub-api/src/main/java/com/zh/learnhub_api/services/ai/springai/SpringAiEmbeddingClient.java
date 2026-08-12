package com.zh.learnhub_api.services.ai.springai;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.ai.EmbeddingClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.ai.google.genai.text.GoogleGenAiTextEmbeddingOptions;
import org.springframework.ai.google.genai.text.GoogleGenAiTextEmbeddingOptions.TaskType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SpringAiEmbeddingClient implements EmbeddingClient {

    private final EmbeddingModel embeddingModel;
    private final int dimension;

    public SpringAiEmbeddingClient(
            EmbeddingModel embeddingModel,
            AppProperties.Ai properties) {
        this.embeddingModel = embeddingModel;
        this.dimension = properties.embeddingDimension();
    }

    @Override
    public List<Float> embedDocument(String text, String title) {
        return embed(text, TaskType.RETRIEVAL_DOCUMENT, title);
    }

    @Override
    public List<Float> embedQuery(String text) {
        return embed(text, TaskType.RETRIEVAL_QUERY, null);
    }

    private List<Float> embed(String text, TaskType taskType, String title) {
        if (dimension <= 0) {
            throw new IllegalStateException("Số chiều embedding phải lớn hơn 0");
        }

        GoogleGenAiTextEmbeddingOptions.Builder options = GoogleGenAiTextEmbeddingOptions.builder()
                .taskType(taskType)
                .dimensions(dimension);
        if (title != null && !title.isBlank()) {
            options.title(title.trim());
        }

        EmbeddingResponse response;
        try {
            response = embeddingModel.call(new EmbeddingRequest(
                    List.of(text),
                    options.build()));
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
