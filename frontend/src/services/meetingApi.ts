import { apiClient } from './api';
import type { Meeting, Speech, PaginatedResponse } from '@/types';

// List meetings params aligned with backend OpenAPI
interface ListMeetingsParams {
  q?: string;              // Search query (was 'searchQuery')
  page?: number;
  page_size?: number;      // Changed from 'pageSize' to match backend
  status?: 'processing' | 'completed' | 'error';
  sort_by?: 'created_at' | 'meeting_date' | 'title';
  sort_order?: 'asc' | 'desc';
}

// Create meeting request aligned with backend
interface CreateMeetingRequest {
  file: File;
  speaker_identity?: string;  // Changed from 'speakerIdentity' to match backend
}

export const meetingApi = {
  // List meetings with pagination and filters
  // GET /api/v1/meetings
  list: (params?: ListMeetingsParams): Promise<PaginatedResponse<Meeting>> =>
    apiClient.get('/meetings', params),

  // Get single meeting
  // GET /api/v1/meetings/{meeting_id}
  getById: (id: string): Promise<Meeting> =>
    apiClient.get(`/meetings/${id}`),

  // Create meeting (with file upload)
  // POST /api/v1/upload
  create: async (
    data: CreateMeetingRequest,
    onProgress?: (progress: number) => void
  ): Promise<{ task_id: string; meeting_id: string }> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.speaker_identity) {
      formData.append('speaker_identity', data.speaker_identity);
    }

    // Upload returns { task_id, meeting_id, status }
    return apiClient.upload(
      '/upload',
      data.file,
      onProgress,
      data.speaker_identity ? { speaker_identity: data.speaker_identity } : undefined
    );
  },

  // Delete meeting
  // DELETE /api/v1/meetings/{meeting_id}
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/meetings/${id}`),

  // Get speeches for a meeting
  // GET /api/v1/meetings/{meeting_id}/speeches
  getSpeeches: (meetingId: string): Promise<{ items: Speech[]; total: number }> =>
    apiClient.get(`/meetings/${meetingId}/speeches`),

  // Get speech detail
  // GET /api/v1/speeches/{speech_id}
  getSpeech: (speechId: string): Promise<Speech> =>
    apiClient.get(`/speeches/${speechId}`),

  // Update speech
  // PATCH /api/v1/speeches/{speech_id}
  updateSpeech: (
    speechId: string,
    data: {
      cleaned_text?: string;
      topics?: string[];
      key_quotes?: string[];
    }
  ): Promise<Speech> =>
    apiClient.patch(`/speeches/${speechId}`, data),
};
