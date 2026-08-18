package com.zh.learnhub_api.dtos.realtime;

import com.zh.learnhub_api.enums.CourseStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseStatusChangedDTO {
    private Long courseId;
    private CourseStatus status;
    private String title;
    private String categoryName;
}
