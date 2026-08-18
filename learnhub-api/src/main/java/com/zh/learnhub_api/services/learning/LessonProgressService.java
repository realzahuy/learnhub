package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.learning.LessonProgressResponseDTO;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.LessonProgress;
import com.zh.learnhub_api.projections.learning.LessonAccessProjection;
import com.zh.learnhub_api.repositories.learning.LessonProgressRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonProgressService {

    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;

    @Transactional
    public LessonProgressResponseDTO setLessonCompleted(
            Long lessonId, boolean completed, Long userId) {
        LessonAccessProjection access = lessonRepository.findLearningAccess(lessonId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
        requireEnrollment(access.getEnrolled());
        return setLessonCompletedForAuthorizedUser(lessonId, completed, userId);
    }

    @Transactional
    public LessonProgressResponseDTO setLessonCompletedForAuthorizedUser(
            Long lessonId, boolean completed, Long userId) {
        lessonProgressRepository.upsertProgress(userId, lessonId, completed);
        return getProgressForAuthorizedUser(lessonId, userId);
    }

    @Transactional
    public LessonProgressResponseDTO markVideoCompleted(Long lessonId, Long userId) {
        LessonAccessProjection access = lessonRepository.findLearningAccess(lessonId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
        requireEnrollment(access.getEnrolled());
        return markVideoCompletedForAuthorizedUser(lessonId, userId);
    }

    @Transactional
    public LessonProgressResponseDTO markVideoCompletedForAuthorizedUser(
            Long lessonId, Long userId) {
        lessonProgressRepository.upsertVideoCompleted(userId, lessonId);
        lessonProgressRepository.markCompletedWhenRequirementsMet(userId, lessonId);
        return getProgressForAuthorizedUser(lessonId, userId);
    }

    @Transactional
    public LessonProgressResponseDTO markQuizCompletedForAuthorizedUser(
            Long lessonId, Long userId) {
        lessonProgressRepository.upsertQuizCompleted(userId, lessonId);
        lessonProgressRepository.markCompletedWhenRequirementsMet(userId, lessonId);
        return getProgressForAuthorizedUser(lessonId, userId);
    }

    public LessonProgressResponseDTO getProgressForAuthorizedUser(
            Long lessonId, Long userId) {
        return lessonProgressRepository.findByUserId_IdAndLessonId_Id(userId, lessonId)
                .map(this::toResponse)
                .orElseGet(() -> new LessonProgressResponseDTO(false, false, false));
    }

    private LessonProgressResponseDTO toResponse(LessonProgress progress) {
        return new LessonProgressResponseDTO(
                progress.isCompleted(),
                progress.isVideoCompleted(),
                progress.isQuizCompleted());
    }

    public void requireEnrollment(Long enrolled) {
        if (!Long.valueOf(1L).equals(enrolled)) {
            throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
        }
    }
}
