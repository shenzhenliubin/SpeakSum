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
  provider?: string;
}

export const uploadApi = {
  // Upload file and get task ID
  // POST /api/v1/upload
  uploadFile: (
    file: File,
    config?: UploadConfig,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const extraFields: Record<string, string> = {};
    if (config?.speaker_identity) {
      extraFields.speaker_identity = config.speaker_identity;
    }
    if (config?.provider) {
      extraFields.provider = config.provider;
    }

    return apiClient.upload(
      '/upload',
      file,
      onProgress,
      Object.keys(extraFields).length > 0 ? extraFields : undefined
    );
  },

  // Get task status (polling)
  // GET /api/v1/upload/{task_id}/status
  getTaskStatus: async (taskId: string): Promise<ProcessingTask> => {
    const data = await apiClient.get<Record<string, unknown>>(`/upload/${taskId}/status`);
    // Map backend fields (percent/stage/status) to frontend ProcessingTask fields
    const stateToStatus = (state: string): ProcessingTask['status'] => {
      if (state === 'SUCCESS') return 'completed';
      if (state === 'FAILED') return 'failed';
      if (state === 'PENDING') return 'pending';
      return 'processing';
    };
    return {
      task_id: data.task_id as string,
      meeting_id: (data.meeting_id as string) || '',
      status: stateToStatus(data.status as string),
      progress: (data.percent as number) || 0,
      current_step: (data.stage as string) || (data.status as string)?.toLowerCase(),
      error_message: (data.error_message as string) || null,
      created_at: '',
      updated_at: '',
    };
  },

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
