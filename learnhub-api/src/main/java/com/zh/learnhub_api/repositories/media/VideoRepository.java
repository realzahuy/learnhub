package com.zh.learnhub_api.repositories.media;

import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.projections.learning.VideoPlaybackProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    @Query("SELECT v.id AS videoId, v.storageKey AS storageKey, v.status AS status, "
         + "l.isPreview AS lessonPreview, c.id AS courseId, c.status AS courseStatus, "
         + "c.instructorId.id AS instructorId "
         + "FROM Video v JOIN v.lesson l JOIN l.courseId c WHERE v.id = :videoId")
    Optional<VideoPlaybackProjection> findPlaybackById(@Param("videoId") Long videoId);

    Optional<Video> findByLessonAndPosition(Lesson lesson, Integer position);

    List<Video> findByLesson_IdOrderByPositionAsc(Long lessonId);

    @Query("SELECT v FROM Video v WHERE v.lesson.courseId.id = :courseId "
         + "ORDER BY v.lesson.position ASC, v.position ASC, v.id ASC")
    List<Video> findInstructorByCourseId(@Param("courseId") Long courseId);

    @Query("SELECT v FROM Video v "
         + "JOIN FETCH v.lesson l "
         + "JOIN FETCH l.courseId c "
         + "WHERE c.id = :courseId AND v.id IN :videoIds")
    List<Video> findByCourseIdAndIds(@Param("courseId") Long courseId,
                                     @Param("videoIds") List<Long> videoIds);

    @Query("SELECT v FROM Video v WHERE v.lesson.courseId.id = :courseId "
         + "AND v.status IN ('READY', 'PROCESSING') "
         + "ORDER BY v.lesson.position ASC, v.position ASC")
    List<Video> findPublicByCourseId(@Param("courseId") Long courseId);

    @Query("SELECT v FROM Video v "
         + "JOIN FETCH v.lesson l "
         + "JOIN FETCH l.courseId "
         + "WHERE v.mediaconvertJobId = :jobId")
    Optional<Video> findByMediaconvertJobId(@Param("jobId") String mediaconvertJobId);

    @Query("SELECT v.mediaconvertJobId FROM Video v "
         + "WHERE v.lesson.courseId.id = :courseId "
         + "AND v.status = :status "
         + "AND v.mediaconvertJobId IS NOT NULL")
    List<String> findJobIdsByCourseIdAndStatus(@Param("courseId") Long courseId,
                                              @Param("status") String status);

    @Query("SELECT v.mediaconvertJobId FROM Video v "
         + "WHERE v.lesson.id = :lessonId "
         + "AND v.status = :status "
         + "AND v.mediaconvertJobId IS NOT NULL")
    List<String> findJobIdsByLessonIdAndStatus(@Param("lessonId") Long lessonId,
                                               @Param("status") String status);
}
