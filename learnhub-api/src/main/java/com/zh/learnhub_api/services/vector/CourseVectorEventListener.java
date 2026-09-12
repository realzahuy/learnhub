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
    public void onCourseVectorSync(CourseVectorSyncRequested event) {
        try {
            indexer.indexIfPublished(event.courseId());
        } catch (RuntimeException ex) {
            log.error("Vector sync failed: courseId={}", event.courseId(), ex);
            throw ex;
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCoursePayloadSync(CoursePayloadSyncRequested event) {
        try {
            indexer.syncPayloadIfPublished(event.courseId());
        } catch (RuntimeException ex) {
            log.error("Vector payload sync failed: courseId={}", event.courseId(), ex);
            throw ex;
        }
    }
}

