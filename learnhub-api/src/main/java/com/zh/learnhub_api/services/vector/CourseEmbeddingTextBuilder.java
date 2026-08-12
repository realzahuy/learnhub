package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CourseEmbeddingTextBuilder {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final AppProperties.EmbeddingText embeddingProperties;

    @Transactional(readOnly = true)
    public Optional<CourseEmbeddingDocument> buildPublishedCourse(Long courseId) {
        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null || !CourseStatus.PUBLISHED.name().equals(course.getStatus())) {
            return Optional.empty();
        }

        return Optional.of(buildCourse(course));
    }

    @Transactional(readOnly = true)
    public CourseEmbeddingDocument buildCourse(Course course) {
        Long courseId = course.getId();

        List<Lesson> lessons = lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId);
        StringBuilder text = new StringBuilder();
        text.append("Biểu diễn khóa học để tìm các khóa học có nội dung tương tự.\n\n");
        append(text, "Tiêu đề", course.getTitle());
        if (course.getCategoryId() != null) {
            append(text, "Danh mục", course.getCategoryId().getName());
        }
        append(text, "Mô tả ngắn", course.getShortDescription());
        append(text, "Mô tả chi tiết", course.getDescription());

        if (!lessons.isEmpty()) {
            text.append("Nội dung bài học:\n");
            for (Lesson lesson : lessons) {
                String title = normalize(lesson.getTitle());
                if (!title.isEmpty()) {
                    text.append("- ").append(title).append('\n');
                }
            }
        }

        String document = text.toString().trim();
        int safeLimit = Math.max(1000, embeddingProperties.embeddingMaxChars());
        if (document.length() > safeLimit) {
            document = document.substring(0, safeLimit);
        }
        return new CourseEmbeddingDocument(courseId, normalize(course.getTitle()), document);
    }

    private void append(StringBuilder target, String label, String value) {
        String normalized = normalize(value);
        if (!normalized.isEmpty()) {
            target.append(label).append(": ").append(normalized).append('\n');
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String withoutTags = HTML_TAG.matcher(value).replaceAll(" ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'");
        return WHITESPACE.matcher(withoutTags).replaceAll(" ").trim();
    }
}
