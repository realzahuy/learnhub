package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.dtos.course.PublicCourseDetailDTO;
import com.zh.learnhub_api.dtos.course.PublicLessonDTO;
import com.zh.learnhub_api.dtos.course.PublicLessonDTO.PublicVideoDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.CourseMapper;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.projections.course.PublicCourseDetailProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.media.VideoPlaybackUrls;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicCourseDetailCacheService {

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    private final QuestionRepository questionRepository;
    private final CourseMapper courseMapper;

    @Cacheable(cacheNames = CacheConfiguration.PUBLIC_COURSE_DETAILS, key = "#slug", sync = true)
    public PublicCourseDetailDTO getStaticDetail(String slug) {
        PublicCourseDetailProjection projection = courseRepository
                .findPublishedBySlugForPublic(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        PublicCourseDetailDTO detail = courseMapper.mapPublicDetailProjectionToDTO(projection);
        detail.setLessons(getPublicLessons(detail.getId()));
        return detail;
    }

    private List<PublicLessonDTO> getPublicLessons(Long courseId) {
        Map<Long, List<Video>> videosByLesson = videoRepository.findPublicByCourseId(courseId).stream()
                .collect(Collectors.groupingBy(
                        video -> video.getLesson().getId(), LinkedHashMap::new, Collectors.toList()));

        Map<Long, Integer> questionCountByLesson = questionRepository.countByCourseGroupedByLesson(courseId).stream()
                .collect(Collectors.toMap(
                        row -> row.getLessonId(), row -> row.getQuestionCount().intValue()));

        return lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId).stream()
                .map(lesson -> new PublicLessonDTO(
                        lesson.getId(),
                        lesson.getTitle(),
                        lesson.getPosition(),
                        lesson.isPreview(),
                        videosByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                .map(video -> toPublicVideo(video, lesson.isPreview()))
                                .toList(),
                        questionCountByLesson.getOrDefault(lesson.getId(), 0)))
                .toList();
    }

    private PublicVideoDTO toPublicVideo(Video video, boolean lessonIsPreview) {
        String previewUrl = lessonIsPreview ? VideoPlaybackUrls.preview(video) : null;
        return new PublicVideoDTO(video.getId(), video.getTitle(), video.getDurationSeconds(), previewUrl);
    }
}
