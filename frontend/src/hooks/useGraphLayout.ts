import { useQuery } from '@tanstack/react-query';
import { graphApi } from '@/services/graphApi';
import type { GraphDomainDetail, GraphLayout } from '@/types';

// Get graph layout
// GET /api/v1/knowledge-graph
export function useGraphLayout() {
  return useQuery<GraphLayout>({
    queryKey: ['graph', 'layout'],
    queryFn: () => graphApi.getLayout(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get domain details for a selected graph domain
export function useDomainDetails(domainId: string | undefined) {
  return useQuery<GraphDomainDetail>({
    queryKey: ['graph', 'domain', domainId, 'details'],
    queryFn: () => graphApi.getDomainDetails(domainId!),
    enabled: !!domainId,
    staleTime: 5 * 60 * 1000,
  });
}
