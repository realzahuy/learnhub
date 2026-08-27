package com.zh.learnhub_api.services.ai.springai;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.chat.ChatRequestDTO;
import com.zh.learnhub_api.dtos.chat.ChatRequestDTO.ChatMessageDTO;
import com.zh.learnhub_api.services.ai.ChatModelClient;
import com.zh.learnhub_api.services.ai.ChatPlan;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SpringAiChatModelClient implements ChatModelClient {

    private final ChatClient chatClient;
    private final String systemInstruction;

    public SpringAiChatModelClient(ChatClient.Builder chatClientBuilder, AppProperties.Ai properties) {
        this.chatClient = chatClientBuilder.build();
        this.systemInstruction = properties.chatSystemPrompt();
    }

    @Override
    public ChatPlan generatePlan(ChatRequestDTO request) {
        ChatPlan plan = chatClient
                .prompt()
                .system(systemInstruction)
                .messages(buildMessages(request))
                .call()
                .entity(
                        ChatPlan.class,
                        schema -> schema.useProviderStructuredOutput().validateSchema());

        if (plan == null) {
            throw new IllegalStateException("Spring AI không trả về kế hoạch trò chuyện");
        }
        if (plan.reply().isBlank()) {
            throw new IllegalStateException("Spring AI trả về câu trả lời trống");
        }
        return plan;
    }

    private List<Message> buildMessages(ChatRequestDTO request) {
        List<Message> messages = new ArrayList<>();
        List<ChatMessageDTO> history = request.getHistory();
        if (history != null && !history.isEmpty()) {
            for (ChatMessageDTO message : history) {
                if ("assistant".equalsIgnoreCase(message.getRole())) {
                    messages.add(new AssistantMessage(message.getContent()));
                } else {
                    messages.add(new UserMessage(message.getContent()));
                }
            }
        }
        messages.add(new UserMessage(request.getMessage().trim()));
        return List.copyOf(messages);
    }
}
