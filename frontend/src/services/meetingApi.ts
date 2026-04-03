import { apiClient } from './api';
import type { Meeting, Speech, MeetingFilters, PaginatedResponse } from '@/types';

interface CreateMeetingRequest {
  title: string;
  date: string;
  file: File;
  speakerIdentity?: string;
}

interface UpdateMeetingRequest {
  title?: string;
  date?: string;
}

interface ListMeetingsParams extends MeetingFilters {
  page?: number;
  pageSize?: number;
}

export const meetingApi = {
  // List meetings with pagination and filters
  list: (params?: ListMeetingsParams): Promise<PaginatedResponse<Meeting>> =>
    apiClient.get('/meetings', params),

  // Get single meeting
  getById: (id: string): Promise<Meeting> =>
    apiClient.get(`/meetings/${id}`),

  // Create meeting (with file upload)
  create: async (data: CreateMeetingRequest, onProgress?: (progress: number) => void): Promise<Meeting> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('title', data.title);
    formData.append('date', data.date);
    if (data.speakerIdentity) {
      formData.append('speaker_identity', data.speakerIdentity);
    }

    return apiClient.upload('/upload', data.file, onProgress);
  },

  // Update meeting
  update: (id: string, data: UpdateMeetingRequest): Promise<Meeting> =>
    apiClient.patch(`/meetings/${id}`, data),

  // Delete meeting
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/meetings/${id}`),

  // Get speeches for a meeting
  getSpeeches: (meetingId: string): Promise<Speech[]> =>
    apiClient.get(`/meetings/${meetingId}/speeches`),
};
