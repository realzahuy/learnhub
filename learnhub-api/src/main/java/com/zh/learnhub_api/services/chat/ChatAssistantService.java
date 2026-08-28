package com.zh.learnhub_api.services.chat;

import com.zh.learnhub_api.dtos.chat.ChatRequestDTO;
import com.zh.learnhub_api.dtos.chat.ChatResponseDTO;
import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.services.ai.ChatModelClient;
import com.zh.learnhub_api.services.ai.ChatPlan;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatAssistantService {

    private static final String NO_MATCH_MESSAGE =
            "Không tìm thấy khóa học phù hợp.";

    private final ChatModelClient chatModelClient;
    private final ChatCourseRecommendationService recommendationService;

    public ChatResponseDTO respond(ChatRequestDTO request, Long userId) {
        ChatPlan plan = chatModelClient.generatePlan(request);
        List<RecommendationCardDTO> courses = plan.shouldSearchCourses()
                ? recommendationService.recommend(
                        plan.searchKeywords(), userId)
                : List.of();

        String reply = plan.reply();
        if (plan.shouldSearchCourses() && courses.isEmpty()) {
            reply = "%s\n\n%s".formatted(reply, NO_MATCH_MESSAGE);
        }
        return new ChatResponseDTO(reply, courses);
    }
}
