import axios from 'axios';
import { buildApiUrl } from '../../config/runtimeConfig';
import apiClient, { authenticatedFetch } from './config';
import {
  Video,
  VideoReorderPayload,
  VideoUploadPayload,
  VideoUploadSession,
} from '../../types/lesson.types';
import { consumeJsonSseEvents } from './sse';

export interface VideoProgressEvent {
  videoId: number;
  status: 'PROCESSING' | 'READY' | 'FAILED';

  progress: number;
}

export const videoService = {
  requestUploadUrl: async (
    lessonId: number,
    payload: VideoUploadPayload
  ): Promise<VideoUploadSession> => {
    const response = await apiClient.post<VideoUploadSession>(
      `/instructor/lessons/${lessonId}/videos/upload-url`,
      payload
    );
    return response.data;
  },

  uploadToStorage: async (
    uploadUrl: string,
    uploadFields: Record<string, string>,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<void> => {
    const formData = new FormData();
    Object.entries(uploadFields).forEach(([name, value]) => {
      formData.append(name, value);
    });
    formData.append('file', file);

    await axios.post(uploadUrl, formData, {
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },

  getVideo: async (videoId: number): Promise<Video> => {
    const response = await apiClient.get<Video>(`/instructor/videos/${videoId}`);
    return response.data;
  },

  getStatuses: async (courseId: number, videoIds: number[]): Promise<Video[]> => {
    if (videoIds.length === 0) return [];
    const response = await apiClient.get<Video[]>(
      `/instructor/courses/${courseId}/videos/status`,
      {
        params: { ids: videoIds.join(',') },
        showTopProgress: false,
      }
    );
    return response.data;
  },

  streamProgress: async (
    courseId: number,
    onProgress: (event: VideoProgressEvent) => void,
    signal: AbortSignal
  ): Promise<void> => {
    const response = await authenticatedFetch(
      buildApiUrl(`instructor/courses/${courseId}/videos/progress-stream`),
      {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        cache: 'no-store',
        signal,
      }
    );
    await consumeJsonSseEvents(response, {
      'video-progress': (data) => onProgress(data as VideoProgressEvent),
    });
  },

  reorder: async (lessonId: number, payloads: VideoReorderPayload[]): Promise<Video[]> => {
    const response = await apiClient.put<Video[]>(
      `/instructor/lessons/${lessonId}/videos/reorder`,
      payloads
    );
    return response.data;
  },

  updateTitle: async (videoId: number, title: string): Promise<Video> => {
    const response = await apiClient.put<Video>(`/instructor/videos/${videoId}`, { title });
    return response.data;
  },

  remove: async (videoId: number): Promise<void> => {
    await apiClient.delete(`/instructor/videos/${videoId}`);
  },
};
