package com.zh.learnhub_api.services.vector;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class CourseVectorEventListener {

    private final CourseVectorIndexer indexer;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCourseVectorUpsert(CourseVectorUpsertEvent event) {
        try {
            indexer.indexIfPublished(event.courseId());
        } catch (Exception ex) {
            log.warn("Không thể đồng bộ vector cho khóa {} sau khi commit: {}",
                    event.courseId(), ex.getMessage(), ex);
        }
    }
}
