package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.LessonProgress;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.learning.LessonProgressRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonProgressService {

    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    @Transactional
    public boolean setLessonCompleted(Long lessonId, boolean completed, Long userId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
        checkCanLearn(lesson, userId);

        LessonProgress progress = lessonProgressRepository
                .findByUserId_IdAndLessonId_Id(userId, lessonId)
                .orElseGet(() -> {
                    LessonProgress fresh = new LessonProgress();
                    fresh.setUserId(userRepository.getReferenceById(userId));
                    fresh.setLessonId(lesson);
                    return fresh;
                });
        progress.setCompleted(completed);
        lessonProgressRepository.save(progress);
        return completed;
    }

    public void checkCanLearn(Lesson lesson, Long userId) {
        checkCanLearn(lesson.getCourseId(), userId);
    }

    public void checkCanLearn(Course course, Long userId) {
        boolean owner = course.getInstructorId().getId().equals(userId);
        if (!owner && !enrollmentRepository
                .existsByUserId_IdAndCourseId_Id(userId, course.getId())) {
            throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
        }
    }
}
