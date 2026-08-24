package com.zh.learnhub_api.services.chat;

import com.zh.learnhub_api.dtos.chat.ChatRequestDTO;
import com.zh.learnhub_api.dtos.chat.ChatResponseDTO;
import com.zh.learnhub_api.services.ai.ChatPlan;
import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.services.ai.ChatModelClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatAssistantService {

    private static final String NO_MATCH_MESSAGE =
            "Hiện tại LearnHub chưa tìm thấy khóa học phù hợp để đề xuất.";

    private final ChatModelClient chatModelClient;
    private final ChatCourseRecommendationService recommendationService;

    public ChatResponseDTO respond(ChatRequestDTO request, String username) {
        ChatPlan plan = chatModelClient.generatePlan(request);
        List<RecommendationCardDTO> courses = plan.shouldSearchCourses()
                ? recommendationService.recommend(
                        plan.searchKeywords(), username)
                : List.of();

        String reply = plan.reply();
        if (plan.shouldSearchCourses() && courses.isEmpty()) {
            reply = reply + "\n\n" + NO_MATCH_MESSAGE;
        }
        return new ChatResponseDTO(reply, courses);
    }
}
