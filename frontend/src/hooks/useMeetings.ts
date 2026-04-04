import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { meetingApi } from '@/services/meetingApi';
import type { Meeting, MeetingFilters, PaginatedResponse } from '@/types';

const MEETINGS_KEY = 'meetings';
const MEETING_KEY = 'meeting';

interface UseMeetingsOptions {
  filters?: MeetingFilters;
  page?: number;
  page_size?: number;  // Changed from 'pageSize' to match backend
}

// Get meetings list with pagination
export const useMeetings = (options: UseMeetingsOptions = {}) => {
  const { filters, page = 1, page_size = 20 } = options;

  return useQuery<PaginatedResponse<Meeting>>({
    // Serialize filters object to ensure stable cache key
    queryKey: [MEETINGS_KEY, JSON.stringify(filters), page, page_size],
    queryFn: () => meetingApi.list({ ...filters, page, page_size }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get meetings with infinite scroll
export const useInfiniteMeetings = (filters?: MeetingFilters) => {
  return useInfiniteQuery<PaginatedResponse<Meeting>>({
    // Serialize filters object to ensure stable cache key
    queryKey: [MEETINGS_KEY, 'infinite', JSON.stringify(filters)],
    queryFn: ({ pageParam = 1 }) =>
      meetingApi.list({ ...filters, page: pageParam as number, page_size: 20 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

// Get single meeting
export const useMeeting = (id: string | undefined) => {
  return useQuery<Meeting>({
    queryKey: [MEETING_KEY, id],
    queryFn: () => meetingApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Create meeting mutation
export const useCreateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      speaker_identity,
      provider,
      onProgress,
    }: {
      file: File;
      speaker_identity?: string;
      provider?: string;
      onProgress?: (progress: number) => void;
    }) => {
      return meetingApi.create({ file, speaker_identity, provider }, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
    },
  });
};

// Delete meeting mutation
export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => meetingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
    },
  });
};

// Get speeches for a meeting
export const useMeetingSpeeches = (meetingId: string | undefined) => {
  return useQuery({
    queryKey: [MEETING_KEY, meetingId, 'speeches'],
    queryFn: () => meetingApi.getSpeeches(meetingId!),
    enabled: !!meetingId,
  });
};
