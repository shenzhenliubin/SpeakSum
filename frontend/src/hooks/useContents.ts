import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Content, PaginatedResponse, Quote } from '@/types';
import { contentApi } from '@/services/contentApi';
import { invalidateProcessedContentQueries } from '@/utils/queryInvalidation';

const CONTENTS_KEY = 'contents';
const CONTENT_KEY = 'content';

interface UseContentsOptions {
  filters?: {
    q?: string;
    status?: string;
  };
  page?: number;
  page_size?: number;
}

export const useContents = (options: UseContentsOptions = {}) => {
  const { filters, page = 1, page_size = 20 } = options;

  return useQuery<PaginatedResponse<Content>>({
    queryKey: [CONTENTS_KEY, JSON.stringify(filters), page, page_size],
    queryFn: () => contentApi.list({ ...filters, page, page_size }),
    staleTime: 5 * 60 * 1000,
  });
};

export const useContent = (id: string | undefined) => {
  return useQuery<Content>({
    queryKey: [CONTENT_KEY, id],
    queryFn: () => contentApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      source_type,
      provider,
      onProgress,
    }: {
      file: File;
      source_type: 'meeting_minutes' | 'other_text';
      provider?: string;
      onProgress?: (progress: number) => void;
    }) => contentApi.create(file, { source_type, provider }, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONTENTS_KEY] });
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) => contentApi.delete(contentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONTENTS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
};

export const useUpdateContentSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, summaryText }: { contentId: string; summaryText: string }) =>
      contentApi.updateSummary(contentId, summaryText),
    onSuccess: (_, variables) => {
      invalidateProcessedContentQueries(queryClient, variables.contentId);
    },
  });
};

export const useUpdateContentQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      quoteId,
      data,
    }: {
      contentId: string;
      quoteId: string;
      data: { text?: string; domain_ids?: string[] };
    }): Promise<Quote> => contentApi.updateQuote(contentId, quoteId, data),
    onSuccess: (_, variables) => {
      invalidateProcessedContentQueries(queryClient, variables.contentId);
    },
  });
};

export const useDeleteContentQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, quoteId }: { contentId: string; quoteId: string }) =>
      contentApi.deleteQuote(contentId, quoteId),
    onSuccess: (_, variables) => {
      invalidateProcessedContentQueries(queryClient, variables.contentId);
    },
  });
};
