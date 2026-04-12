import { apiClient, resolveApiBaseUrl } from './api';
import type { ProcessingTask, ProgressEvent } from '@/types';
import { useAuthStore } from '@/stores/authStore';

// Upload response aligned with backend OpenAPI
interface UploadResponse {
  task_id: string;
  content_id: string;
  status: 'pending';
}

// Upload config
interface UploadConfig {
  source_type: 'meeting_minutes' | 'other_text';
  provider?: string;
}

const normalizeStage = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value) return undefined;
  return value.toLowerCase().replace(/[\s-]+/g, '_');
};

const mapTaskState = (state: unknown): ProcessingTask['status'] => {
  if (typeof state !== 'string') return 'processing';
  if (state === 'SUCCESS' || state === 'completed') return 'completed';
  if (state === 'IGNORED' || state === 'ignored') return 'ignored';
  if (state === 'FAILED' || state === 'failed') return 'failed';
  if (state === 'RETRY' || state === 'retry') return 'processing';
  if (state === 'PENDING' || state === 'pending') return 'pending';
  return 'processing';
};

const mapTaskPayload = (data: Record<string, unknown>): ProcessingTask => ({
  task_id: data.task_id as string,
  content_id: (data.content_id as string) || '',
  meeting_id: (data.meeting_id as string) || undefined,
  status: mapTaskState(data.status),
  progress: Number(data.percent ?? data.progress ?? 0),
  current_step: normalizeStage(data.stage ?? data.current_step) || mapTaskState(data.status),
  message: (data.message as string) || null,
  error_message: (data.error_message as string) || null,
  created_at: '',
  updated_at: '',
});

export const buildProcessStreamUrl = (
  taskId: string,
  token: string | null | undefined,
  configuredBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
  currentHost?: string
) => {
  const baseUrl = resolveApiBaseUrl(configuredBaseUrl, currentHost);
  const url = new URL(`${baseUrl}/process/${taskId}/stream`);

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.toString();
};

export const uploadApi = {
  // Upload file and get task ID
  // POST /api/v1/upload
  uploadFile: (
    file: File,
    config?: UploadConfig,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const extraFields: Record<string, string> = {};
    extraFields.source_type = config?.source_type ?? 'meeting_minutes';
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
    return mapTaskPayload(data);
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
    const url = buildProcessStreamUrl(taskId, token);

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        const data = mapTaskPayload(payload);
        onProgress(data);

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'ignored') {
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
