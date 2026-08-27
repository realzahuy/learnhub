import apiClient from './config';
import { RecommendationCard } from '../../types/course.types';

type ChatHistoryMessage = {
  role: 'assistant' | 'user';
  content: string;
};

type ChatResponse = {
  reply: string;
  courses: RecommendationCard[];
};

export const chatService = {
  async sendMessage(message: string, history: ChatHistoryMessage[]): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>('/chatbot', {
      message,
      history,
    });
    return response.data;
  },
};
