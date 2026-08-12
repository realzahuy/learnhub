package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.repositories.course.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "learnhub.vector.backfill-on-startup", havingValue = "true")
public class CourseVectorBackfillRunner implements ApplicationRunner {

    private final CourseRepository courseRepository;
    private final CourseVectorIndexer indexer;

    @Override
    public void run(ApplicationArguments args) {
        List<Long> courseIds = courseRepository.findPublishedCourseIds();
        int indexed = 0;
        int failed = 0;
        log.info("Bắt đầu backfill Qdrant cho {} khóa PUBLISHED", courseIds.size());

        for (Long courseId : courseIds) {
            try {
                indexer.indexIfPublished(courseId);
                indexed++;
            } catch (Exception ex) {
                failed++;
                log.error("Backfill Qdrant thất bại cho khóa {}: {}", courseId, ex.getMessage(), ex);
            }
        }

        log.info("Hoàn tất backfill Qdrant: thành công={}, thất bại={}", indexed, failed);
    }
}
