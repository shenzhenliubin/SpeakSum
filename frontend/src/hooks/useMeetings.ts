import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { meetingApi } from '@/services/meetingApi';
import { useMeetingStore } from '@/stores/meetingStore';
import type { Meeting, MeetingFilters, PaginatedResponse } from '@/types';

const MEETINGS_KEY = 'meetings';
const MEETING_KEY = 'meeting';

interface UseMeetingsOptions {
  filters?: MeetingFilters;
  page?: number;
  pageSize?: number;
}

// Get meetings list with pagination
export const useMeetings = (options: UseMeetingsOptions = {}) => {
  const { filters, page = 1, pageSize = 20 } = options;

  return useQuery<PaginatedResponse<Meeting>>({
    // Serialize filters object to ensure stable cache key
    queryKey: [MEETINGS_KEY, JSON.stringify(filters), page, pageSize],
    queryFn: () => meetingApi.list({ ...filters, page, pageSize }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get meetings with infinite scroll
export const useInfiniteMeetings = (filters?: MeetingFilters) => {
  return useInfiniteQuery<PaginatedResponse<Meeting>>({
    // Serialize filters object to ensure stable cache key
    queryKey: [MEETINGS_KEY, 'infinite', JSON.stringify(filters)],
    queryFn: ({ pageParam = 1 }) =>
      meetingApi.list({ ...filters, page: pageParam as number, pageSize: 20 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
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
  const addMeeting = useMeetingStore((state) => state.addMeeting);

  return useMutation({
    mutationFn: async ({
      file,
      title,
      date,
      speakerIdentity,
      onProgress,
    }: {
      file: File;
      title: string;
      date: string;
      speakerIdentity?: string;
      onProgress?: (progress: number) => void;
    }) => {
      return meetingApi.create({ file, title, date, speakerIdentity }, onProgress);
    },
    onSuccess: (data) => {
      addMeeting(data);
      queryClient.invalidateQueries({ queryKey: [MEETINGS_KEY] });
    },
  });
};

// Delete meeting mutation
export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();
  const removeMeeting = useMeetingStore((state) => state.removeMeeting);

  return useMutation({
    mutationFn: (id: string) => meetingApi.delete(id),
    onSuccess: (_, id) => {
      removeMeeting(id);
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
