import { useQuery } from '@tanstack/react-query';
import { graphApi } from '@/services/graphApi';
import type { GraphLayout, Speech, Topic } from '@/types';

// Get graph layout
// GET /api/v1/knowledge-graph
export function useGraphLayout() {
  return useQuery<GraphLayout>({
    queryKey: ['graph', 'layout'],
    queryFn: () => graphApi.getLayout(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get speeches for a topic
// GET /api/v1/knowledge-graph/topics/{topic_id}/speeches
export function useTopicSpeeches(topicId: string | undefined) {
  return useQuery<{ topic: Topic; speeches: Speech[]; total: number }>({
    queryKey: ['graph', 'topic', topicId, 'speeches'],
    queryFn: () => graphApi.getTopicSpeeches(topicId!),
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000,
  });
}
