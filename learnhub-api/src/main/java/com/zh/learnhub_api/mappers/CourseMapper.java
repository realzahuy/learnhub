package com.zh.learnhub_api.mappers;

import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.dtos.course.PublicCourseDetailDTO;
import com.zh.learnhub_api.projections.course.CourseDetailProjection;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.projections.course.PublicCourseDetailProjection;
import com.zh.learnhub_api.projections.course.RatedCourseListProjection;
import com.zh.learnhub_api.services.learning.RatingStats;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;
import java.util.Map;

@Mapper
public interface CourseMapper {

    @Mapping(target = "id", source = "courseId")
    CourseResponseDTO mapDetailProjectionToDTO(CourseDetailProjection projection);

    @Mapping(target = "id", source = "courseId")
    @Mapping(target = "averageRating", constant = "0")
    @Mapping(target = "reviewCount", constant = "0L")
    CourseListItemDTO mapListProjectionToDTO(CourseListProjection projection);

    @Mapping(target = "id", source = "courseId")
    CourseListItemDTO mapRatedListProjectionToDTO(RatedCourseListProjection projection);

    default void applyRatings(List<CourseListItemDTO> courses, Map<Long, RatingStats> statsByCourse) {
        if (statsByCourse.isEmpty()) {
            return;
        }
        for (CourseListItemDTO course : courses) {
            RatingStats stats = statsByCourse.get(course.getId());
            if (stats != null) {
                course.setAverageRating(stats.average());
                course.setReviewCount(stats.reviewCount());
            }
        }
    }

    @Mapping(target = "id", source = "courseId")
    @Mapping(target = "lessons", ignore = true)
    @Mapping(target = "ratingSummary", ignore = true)
    @Mapping(target = "instructorAverageRating", constant = "0")
    @Mapping(target = "instructorReviewCount", constant = "0L")
    PublicCourseDetailDTO mapPublicDetailProjectionToDTO(PublicCourseDetailProjection projection);
}
