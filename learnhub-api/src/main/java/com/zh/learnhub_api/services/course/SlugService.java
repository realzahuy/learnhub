package com.zh.learnhub_api.services.course;

import com.github.slugify.Slugify;
import com.zh.learnhub_api.exceptions.SlugAlreadyExistsException;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SlugService {

    private final CourseRepository courseRepository;
    private final Slugify slugify = Slugify.builder().build();

    public String processSlug(String requestSlug, String title, Long currentCourseId) {
        boolean isManualSlug = (requestSlug != null && !requestSlug.trim().isEmpty());

        String slug = isManualSlug
                ? requestSlug.trim().toLowerCase()
                : slugify.slugify(title.replace('đ', 'd').replace('Đ', 'D'));
        validateSlugFormat(slug);
        ensureSlugUniqueOrThrow(slug, currentCourseId);

        return slug;
    }

    private void validateSlugFormat(String slug) {
        if (!slug.matches("^[a-z0-9-]+$")) {
            throw new IllegalArgumentException("Slug không hợp lệ");
        }
    }

    private void ensureSlugUniqueOrThrow(String slug, Long excludeCourseId) {
        boolean isDuplicate = isSlugTaken(slug, excludeCourseId);

        if (isDuplicate) {

            List<String> suggestions = List.of(autoEnsureUnique(slug, excludeCourseId));
            throw new SlugAlreadyExistsException(
                "Slug đã tồn tại",
                suggestions
            );
        }
    }

    private String autoEnsureUnique(String baseSlug, Long excludeCourseId) {
        int count = 1;
        String slug = baseSlug + "-" + count;

        while (isSlugTaken(slug, excludeCourseId)) {
            count++;
            slug = baseSlug + "-" + count;
        }

        return slug;
    }

    private boolean isSlugTaken(String slug, Long excludeCourseId) {
        return (excludeCourseId == null)
            ? courseRepository.existsBySlug(slug)
            : courseRepository.existsBySlugAndIdNot(slug, excludeCourseId);
    }
}
