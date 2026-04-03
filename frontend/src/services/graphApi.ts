import { apiClient } from './api';
import type { GraphLayout, Speech, Topic } from '@/types';

interface UpdateLayoutRequest {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
  }>;
  version: number;
}

export const graphApi = {
  // Get graph layout
  getLayout: (): Promise<GraphLayout> =>
    apiClient.get('/knowledge-graph'),

  // Get all topics
  getTopics: (): Promise<Topic[]> =>
    apiClient.get('/knowledge-graph/topics'),

  // Get topic detail
  getTopicDetail: (topicId: string): Promise<Topic> =>
    apiClient.get(`/knowledge-graph/topics/${topicId}`),

  // Get speeches for a topic
  getTopicSpeeches: (topicId: string): Promise<Speech[]> =>
    apiClient.get(`/knowledge-graph/topics/${topicId}/speeches`),

  // Update node position
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number }
  ): Promise<void> =>
    apiClient.patch(`/knowledge-graph/nodes/${nodeId}/position`, position),

  // Batch update layout
  updateLayout: (data: UpdateLayoutRequest): Promise<GraphLayout> =>
    apiClient.put('/knowledge-graph/layout', data),

  // Reset layout to auto-computed
  resetLayout: (): Promise<GraphLayout> =>
    apiClient.post('/knowledge-graph/layout/reset', {}),
};
