import { apiClient } from './api';
import type { ProcessingTask, ProgressEvent } from '@/types';
import { useAuthStore } from '@/stores/authStore';

interface UploadResponse {
  taskId: string;
  meetingId: string;
}

interface UploadConfig {
  speakerIdentity?: string;
  modelConfigId?: string;
}

export const uploadApi = {
  // Upload file and get task ID
  uploadFile: (
    file: File,
    config?: UploadConfig,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (config?.speakerIdentity) {
      formData.append('speaker_identity', config.speakerIdentity);
    }
    if (config?.modelConfigId) {
      formData.append('model_config_id', config.modelConfigId);
    }

    return apiClient.upload('/upload', file, onProgress);
  },

  // Get task status
  getTaskStatus: (taskId: string): Promise<ProcessingTask> =>
    apiClient.get(`/upload/${taskId}/status`),

  // Create SSE connection for real-time progress
  createSSEConnection: (
    taskId: string,
    onProgress: (data: ProgressEvent) => void,
    onError?: (error: Event) => void,
    onComplete?: () => void
  ): EventSource => {
    const token = useAuthStore.getState().token;
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/upload/${taskId}/stream?token=${token}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent;
        onProgress(data);

        if (data.status === 'completed' || data.status === 'error') {
          eventSource.close();
          onComplete?.();
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      onError?.(error);
      // Auto-reconnect on error after 3 seconds
      setTimeout(() => {
        eventSource.close();
      }, 3000);
    };

    return eventSource;
  },

  // Cancel upload/processing
  cancelTask: (taskId: string): Promise<void> =>
    apiClient.post(`/upload/${taskId}/cancel`, {}),
};
