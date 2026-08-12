package com.zh.learnhub_api.services.ai;

import com.zh.learnhub_api.dtos.chat.ChatRequestDTO;

public interface ChatModelClient {

    ChatPlan generatePlan(ChatRequestDTO request);
}
