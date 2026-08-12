package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.services.ai.EmbeddingClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseVectorIndexer {

    private final CourseEmbeddingTextBuilder textBuilder;
    private final EmbeddingClient embeddingClient;
    private final CourseVectorStore vectorStore;

    public void indexIfPublished(Long courseId) {
        if (!vectorStore.isEnabled()) {
            log.debug("Bỏ qua index khóa {} vì vector store đang tắt", courseId);
            return;
        }

        Optional<CourseEmbeddingDocument> document = textBuilder.buildPublishedCourse(courseId);
        if (document.isEmpty()) {

            vectorStore.delete(courseId);
            log.info("Đã xóa vector của khóa {} vì không còn PUBLISHED", courseId);
            return;
        }

        CourseEmbeddingDocument value = document.get();
        vectorStore.upsert(courseId, embeddingClient.embedDocument(value.text(), value.title()));
        log.info("Đã upsert vector cho khóa {}", courseId);
    }
}
