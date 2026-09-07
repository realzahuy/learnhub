package com.zh.learnhub_api.services.vector;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class CourseVectorEventListener {

    private final CourseVectorIndexer indexer;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCourseVectorSync(CourseVectorSyncRequested event) {
        indexer.indexIfPublished(event.courseId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCoursePayloadSync(CoursePayloadSyncRequested event) {
        indexer.syncPayloadIfPublished(event.courseId());
    }
}

