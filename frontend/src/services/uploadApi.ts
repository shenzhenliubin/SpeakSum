import { apiClient } from './api';
import type { ProcessingTask, ProgressEvent } from '@/types';
import { useAuthStore } from '@/stores/authStore';

// Upload response aligned with backend OpenAPI
interface UploadResponse {
  task_id: string;
  meeting_id: string;
  status: 'pending';
}

// Upload config
interface UploadConfig {
  speaker_identity?: string;  // Changed from 'speakerIdentity' to match backend
}

export const uploadApi = {
  // Upload file and get task ID
  // POST /api/v1/upload
  uploadFile: (
    file: File,
    config?: UploadConfig,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (config?.speaker_identity) {
      formData.append('speaker_identity', config.speaker_identity);
    }

    return apiClient.upload('/upload', file, onProgress);
  },

  // Get task status (polling)
  // GET /api/v1/upload/{task_id}/status
  getTaskStatus: (taskId: string): Promise<ProcessingTask> =>
    apiClient.get(`/upload/${taskId}/status`),

  // Create SSE connection for real-time progress
  // GET /api/v1/upload/{task_id}/stream
  createSSEConnection: (
    taskId: string,
    onProgress: (data: ProgressEvent) => void,
    onError?: (error: Event) => void,
    onComplete?: () => void
  ): EventSource => {
    const token = useAuthStore.getState().token;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const url = `${baseUrl}/upload/${taskId}/stream?token=${token}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent;
        onProgress(data);

        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
          onComplete?.();
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      onError?.(error);
      setTimeout(() => {
        eventSource.close();
      }, 3000);
    };

    return eventSource;
  },
};
