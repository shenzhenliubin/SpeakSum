import { apiClient } from './api';
import type { GraphLayout, Speech, Topic } from '@/types';

export const graphApi = {
  // Get graph layout
  // GET /api/v1/knowledge-graph
  // Returns: { nodes: TopicNode[], edges: TopicEdge[], layout_version: string }
  getLayout: (): Promise<GraphLayout> =>
    apiClient.get('/knowledge-graph'),

  // Get speeches for a topic
  // GET /api/v1/knowledge-graph/topics/{topic_id}/speeches
  // Returns: { topic: TopicNode, speeches: Speech[], total: number }
  getTopicSpeeches: (topicId: string): Promise<{ topic: Topic; speeches: Speech[]; total: number }> =>
    apiClient.get(`/knowledge-graph/topics/${topicId}/speeches`),
};
