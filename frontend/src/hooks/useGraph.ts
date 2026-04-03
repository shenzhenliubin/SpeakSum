import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphApi } from '@/services/graphApi';
import { useGraphStore } from '@/stores/graphStore';
import type { GraphLayout, GraphNode, Speech } from '@/types';

const GRAPH_KEY = 'graph';
const TOPIC_SPEECHES_KEY = 'topicSpeeches';

// Get graph layout
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

// Update node position
export const useUpdateNodePosition = () => {
  return useMutation({
    mutationFn: ({
      nodeId,
      position,
    }: {
      nodeId: string;
      position: { x: number; y: number };
    }) => graphApi.updateNodePosition(nodeId, position),
  });
};

// Reset layout
export const useResetLayout = () => {
  const queryClient = useQueryClient();
  const setLayout = useGraphStore((state) => state.setLayout);

  return useMutation({
    mutationFn: () => graphApi.resetLayout(),
    onSuccess: (layout) => {
      setLayout(layout);
      queryClient.setQueryData([GRAPH_KEY, 'layout'], layout);
    },
  });
};

// Get speeches for a topic
export const useTopicSpeeches = (topicId: string | undefined) => {
  return useQuery<Speech[]>({
    queryKey: [TOPIC_SPEECHES_KEY, topicId],
    queryFn: () => graphApi.getTopicSpeeches(topicId!),
    enabled: !!topicId,
  });
};

// Get connected nodes
export const useConnectedNodes = (nodeId: string | undefined) => {
  const layout = useGraphStore((state) => state.layout);

  return {
    connectedNodes: layout.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => {
        const connectedId = edge.source === nodeId ? edge.target : edge.source;
        return layout.nodes.find((node) => node.id === connectedId);
      })
      .filter((node): node is GraphNode => node !== undefined),
    edges: layout.edges.filter(
      (edge) => edge.source === nodeId || edge.target === nodeId
    ),
  };
};
