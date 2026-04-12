import { apiClient } from './api';
import type { GraphDomainDetail, GraphLayout } from '@/types';

export const graphApi = {
  // Get graph layout
  // GET /api/v1/knowledge-graph
  // Returns: { nodes: TopicNode[], edges: TopicEdge[], layout_version: string }
  getLayout: (): Promise<GraphLayout> =>
    apiClient.get('/knowledge-graph'),

  // Get domain details with related quotes
  // GET /api/v1/knowledge-graph/domains/{domain_id}
  getDomainDetails: (domainId: string): Promise<GraphDomainDetail> =>
    apiClient.get(`/knowledge-graph/domains/${domainId}`),
};
