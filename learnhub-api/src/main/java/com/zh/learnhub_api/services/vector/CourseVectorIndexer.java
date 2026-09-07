package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.services.ai.EmbeddingClient;
import com.zh.learnhub_api.services.ai.springai.SpringAiCourseKeywordExtractor;
import com.zh.learnhub_api.services.ai.springai.SpringAiCourseKeywordExtractor.CourseKeywords;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class CourseVectorIndexer {

    private final CourseEmbeddingTextBuilder textBuilder;
    private final SpringAiCourseKeywordExtractor keywordExtractor;
    private final EmbeddingClient embeddingClient;
    private final CourseVectorStore vectorStore;

    public void indexIfPublished(Long courseId) {
        if (!vectorStore.isEnabled()) {
            return;
        }

        Optional<CourseEmbeddingTextBuilder.EmbeddingDocument> document = textBuilder.buildPublishedCourse(courseId);
        if (document.isEmpty()) {
            vectorStore.delete(courseId);
            return;
        }

        CourseEmbeddingTextBuilder.EmbeddingDocument value = document.get();
        CourseKeywords extracted = keywordExtractor.extract(value.text());
        String keywords = Stream.concat(Stream.of(extracted.subject()), extracted.keywords().stream())
                .distinct()
                .collect(Collectors.joining("; "));
        String embeddingText = value.category() + "; " + keywords;
        vectorStore.upsert(courseId,
                embeddingClient.embedDocument(embeddingText, extracted.subject()), value.payload());
    }

    public void syncPayloadIfPublished(Long courseId) {
        if (!vectorStore.isEnabled()) {
            return;
        }

        Optional<CourseVectorStore.Payload> payload = textBuilder.buildPublishedPayload(courseId);
        if (payload.isEmpty()) {
            vectorStore.delete(courseId);
            return;
        }
        vectorStore.updatePayload(courseId, payload.get());
    }

}
