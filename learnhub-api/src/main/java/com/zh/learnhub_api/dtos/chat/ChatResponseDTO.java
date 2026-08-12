package com.zh.learnhub_api.dtos.chat;

import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class ChatResponseDTO {

    private String reply;
    private List<CourseListItemDTO> courses;

    public ChatResponseDTO(String reply, List<CourseListItemDTO> courses) {
        this.reply = reply;
        this.courses = courses == null ? List.of() : List.copyOf(courses);
    }
}
