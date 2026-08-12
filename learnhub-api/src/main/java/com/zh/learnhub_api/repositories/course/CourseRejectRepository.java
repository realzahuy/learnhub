package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.pojo.CourseReject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CourseRejectRepository extends JpaRepository<CourseReject, Long> {

    Optional<CourseReject> findTopByCourseId_IdOrderByCreatedAtDescIdDesc(Long courseId);
}
