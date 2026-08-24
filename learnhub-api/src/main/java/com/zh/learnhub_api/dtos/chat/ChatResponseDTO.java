package com.zh.learnhub_api.dtos.chat;

import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class ChatResponseDTO {

    private String reply;
    private List<RecommendationCardDTO> courses;

    public ChatResponseDTO(String reply, List<RecommendationCardDTO> courses) {
        this.reply = reply;
        this.courses = courses == null ? List.of() : List.copyOf(courses);
    }
}
