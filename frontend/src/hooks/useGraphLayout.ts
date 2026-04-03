import { useQuery } from '@tanstack/react-query';
import { graphApi } from '@/services/graphApi';
import type { GraphLayout } from '@/types';

export function useGraphLayout() {
  return useQuery<GraphLayout>({
    queryKey: ['graph', 'layout'],
    queryFn: () => graphApi.getLayout(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGraphTopics() {
  return useQuery({
    queryKey: ['graph', 'topics'],
    queryFn: () => graphApi.getTopics(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopicDetail(topicId: string) {
  return useQuery({
    queryKey: ['graph', 'topic', topicId],
    queryFn: () => graphApi.getTopicDetail(topicId),
    enabled: !!topicId,
  });
}
