import { apiClient } from './api';
import type { Content, PaginatedResponse, Quote } from '@/types';

interface ListContentsParams {
  q?: string;
  page?: number;
  page_size?: number;
  status?: string;
}

export const contentApi = {
  list: (params?: ListContentsParams): Promise<PaginatedResponse<Content>> =>
    apiClient.get('/contents', params),

  getById: (id: string): Promise<Content> =>
    apiClient.get(`/contents/${id}`),

  create: async (
    file: File,
    data: {
      source_type: 'meeting_minutes' | 'other_text';
      provider?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<{ task_id: string; content_id: string }> => {
    const extraFields: Record<string, string> = {
      source_type: data.source_type,
    };
    if (data.provider) {
      extraFields.provider = data.provider;
    }

    return apiClient.upload('/upload', file, onProgress, extraFields);
  },

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/contents/${id}`),

  updateSummary: (contentId: string, summary_text: string): Promise<Content> =>
    apiClient.patch(`/contents/${contentId}/summary`, { summary_text }),

  updateQuote: (
    contentId: string,
    quoteId: string,
    data: { text?: string; domain_ids?: string[] }
  ): Promise<Quote> =>
    apiClient.patch(`/contents/${contentId}/quotes/${quoteId}`, data),

  deleteQuote: (contentId: string, quoteId: string): Promise<void> =>
    apiClient.delete(`/contents/${contentId}/quotes/${quoteId}`),
};
