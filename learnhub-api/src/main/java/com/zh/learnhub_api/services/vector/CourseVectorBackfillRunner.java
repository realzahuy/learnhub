package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.repositories.course.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "learnhub.vector.backfill-on-startup", havingValue = "true")
public class CourseVectorBackfillRunner implements ApplicationRunner {

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
