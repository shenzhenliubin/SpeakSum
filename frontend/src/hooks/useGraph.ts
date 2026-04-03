import { useQuery } from '@tanstack/react-query';
import { graphApi } from '@/services/graphApi';
import { useGraphStore } from '@/stores/graphStore';
import type { GraphLayout, Topic, Speech } from '@/types';

const GRAPH_KEY = 'graph';
const TOPIC_SPEECHES_KEY = 'topicSpeeches';

// Get graph layout
// GET /api/v1/knowledge-graph
export const useGraphLayout = () => {
  const setLayout = useGraphStore((state) => state.setLayout);

  return useQuery<GraphLayout>({
    queryKey: [GRAPH_KEY, 'layout'],
    queryFn: async () => {
      const layout = await graphApi.getLayout();
      setLayout(layout);
      return layout;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get speeches for a topic
// GET /api/v1/knowledge-graph/topics/{topic_id}/speeches
export const useTopicSpeeches = (topicId: string | undefined) => {
  return useQuery<{ topic: Topic; speeches: Speech[]; total: number }>({
    queryKey: [TOPIC_SPEECHES_KEY, topicId],
    queryFn: () => graphApi.getTopicSpeeches(topicId!),
    enabled: !!topicId,
  });
};

// Get connected nodes (computed from store)
export const useConnectedNodes = (topicId: string | undefined) => {
  const layout = useGraphStore((state) => state.layout);

  return {
    connectedTopics: layout.edges
      .filter((edge) => edge.source === topicId || edge.target === topicId)
      .map((edge) => {
        const connectedId = edge.source === topicId ? edge.target : edge.source;
        return layout.nodes.find((node) => node.id === connectedId);
      })
      .filter((node): node is Topic => node !== undefined),
    edges: layout.edges.filter(
      (edge) => edge.source === topicId || edge.target === topicId
    ),
  };
};
