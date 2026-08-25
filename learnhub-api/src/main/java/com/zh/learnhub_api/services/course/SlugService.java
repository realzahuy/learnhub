package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.exceptions.SlugAlreadyExistsException;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.github.slugify.Slugify;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SlugService {

    private final CourseRepository courseRepository;
    private final Slugify slugify = Slugify.builder().build();

    public String processSlug(String requestSlug, String title, Long currentCourseId) {
        boolean isManualSlug = (requestSlug != null && !requestSlug.trim().isEmpty());

        String slug;
        if (isManualSlug) {

            slug = requestSlug.trim().toLowerCase();
            validateSlugFormat(slug);

            ensureSlugUniqueOrThrow(slug, currentCourseId);
        } else {

            slug = slugify.slugify(title.replace('đ', 'd').replace('Đ', 'D'));
            validateSlugFormat(slug);
            ensureSlugUniqueOrThrow(slug, currentCourseId);
        }

        return slug;
    }

    private void validateSlugFormat(String slug) {
        if (!slug.matches("^[a-z0-9-]+$")) {
            throw new IllegalArgumentException(
                "Slug chỉ được chứa chữ thường, số và dấu gạch ngang"
            );
        }
    }

    private void ensureSlugUniqueOrThrow(String slug, Long excludeCourseId) {
        boolean isDuplicate = isSlugTaken(slug, excludeCourseId);

        if (isDuplicate) {

            List<String> suggestions = generateSlugSuggestions(slug, excludeCourseId);
            throw new SlugAlreadyExistsException(
                "Slug '" + slug + "' đã tồn tại",
                suggestions
            );
        }
    }

    private String autoEnsureUnique(String baseSlug, Long excludeCourseId) {
        String slug = baseSlug;
        int count = 1;

        while (isSlugTaken(slug, excludeCourseId)) {
            slug = baseSlug + "-" + count;
            count++;
        }

        return slug;
    }

    private List<String> generateSlugSuggestions(String baseSlug, Long excludeCourseId) {
        List<String> suggestions = new ArrayList<>();

        String suggestion1 = autoEnsureUnique(baseSlug, excludeCourseId);
        suggestions.add(suggestion1);

        String randomStr = UUID.randomUUID().toString().substring(0, 6);
        String suggestion2 = baseSlug + "-" + randomStr;
        if (!isSlugTaken(suggestion2, excludeCourseId)) {
            suggestions.add(suggestion2);
        }

        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String suggestion3 = baseSlug + "-" + timestamp;
        if (!isSlugTaken(suggestion3, excludeCourseId)) {
            suggestions.add(suggestion3);
        }

        return suggestions.stream().limit(3).collect(Collectors.toList());
    }

    private boolean isSlugTaken(String slug, Long excludeCourseId) {
        return (excludeCourseId == null)
            ? courseRepository.existsBySlug(slug)
            : courseRepository.existsBySlugAndIdNot(slug, excludeCourseId);
    }
}
