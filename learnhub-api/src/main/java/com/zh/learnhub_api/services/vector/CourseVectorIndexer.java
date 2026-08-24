package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.services.ai.EmbeddingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CourseVectorIndexer {

    private final CourseEmbeddingTextBuilder textBuilder;
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
        vectorStore.upsert(courseId, embeddingClient.embedDocument(value.text(), value.title()), value.payload());
    }

    public record SyncEvent(Long courseId) {
    }
}

@Component
@RequiredArgsConstructor
class CourseVectorEventListener {

    private final CourseVectorIndexer indexer;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCourseVectorSync(CourseVectorIndexer.SyncEvent event) {
        indexer.indexIfPublished(event.courseId());
    }
}

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "learnhub.vector.backfill-on-startup", havingValue = "true")
class CourseVectorBackfillRunner implements ApplicationRunner {

    private final CourseRepository courseRepository;
    private final CourseVectorIndexer indexer;

    @Override
    public void run(ApplicationArguments args) {
        List<Long> courseIds = courseRepository.findPublishedCourseIds();
        for (Long courseId : courseIds) {
            indexer.indexIfPublished(courseId);
        }
    }
}
