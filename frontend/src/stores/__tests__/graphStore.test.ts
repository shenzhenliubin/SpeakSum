import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../graphStore';
import type { GraphNode, GraphLayout } from '@/types';

describe('graphStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useGraphStore.getState();
    store.resetView();
    store.selectTopic(null);
  });

  it('should have correct initial state', () => {
    const state = useGraphStore.getState();
    expect(state.zoom).toBe(1);
    expect(state.pan).toEqual({ x: 0, y: 0 });
    expect(state.selectedTopic).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('should set layout', () => {
    const store = useGraphStore.getState();
    const mockLayout: GraphLayout = {
      nodes: [
        {
          id: '1',
          type: 'topic',
          label: 'Test Topic',
          x: 100,
          y: 100,
          size: 24,
        },
      ],
      edges: [],
      layout_version: '1',
    };

    store.setLayout(mockLayout);

    expect(useGraphStore.getState().layout).toEqual(mockLayout);
  });

  it('should select topic', () => {
    const store = useGraphStore.getState();
    const mockTopic: GraphNode = {
      id: '1',
      type: 'topic',
      label: 'Test Topic',
    };

    store.selectTopic(mockTopic);

    expect(useGraphStore.getState().selectedTopic).toEqual(mockTopic);
  });

  it('should set zoom within bounds', () => {
    const store = useGraphStore.getState();

    store.setZoom(2);
    expect(useGraphStore.getState().zoom).toBe(2);

    store.setZoom(10); // Exceeds max
    expect(useGraphStore.getState().zoom).toBe(5);

    store.setZoom(0.05); // Below min
    expect(useGraphStore.getState().zoom).toBe(0.1);
  });

  it('should set pan', () => {
    const store = useGraphStore.getState();

    store.setPan({ x: 100, y: 200 });

    expect(useGraphStore.getState().pan).toEqual({ x: 100, y: 200 });
  });

  it('should reset view', () => {
    const store = useGraphStore.getState();

    store.setZoom(2);
    store.setPan({ x: 100, y: 200 });

    store.resetView();

    expect(useGraphStore.getState().zoom).toBe(1);
    expect(useGraphStore.getState().pan).toEqual({ x: 0, y: 0 });
  });

  it('should set loading state', () => {
    const store = useGraphStore.getState();

    store.setIsLoading(true);
    expect(useGraphStore.getState().isLoading).toBe(true);

    store.setIsLoading(false);
    expect(useGraphStore.getState().isLoading).toBe(false);
  });
});
