package com.zh.learnhub_api.dtos.learning;

import java.util.Set;

public record EnrollmentBatchStatusDTO(Set<Long> enrolledCourseIds) {
}
