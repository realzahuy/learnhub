package com.zh.learnhub_api.controllers.chat;

import com.zh.learnhub_api.dtos.chat.ChatRequestDTO;
import com.zh.learnhub_api.dtos.chat.ChatResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.chat.ChatAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chatbot")
public class ChatController {

    private final ChatAssistantService chatAssistantService;

    @PostMapping
    public ChatResponseDTO chat(
            @Valid @RequestBody ChatRequestDTO request, @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return chatAssistantService.respond(request, principal == null ? null : principal.getUserId());
    }
}
