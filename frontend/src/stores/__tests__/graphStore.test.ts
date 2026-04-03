import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../graphStore';
import type { Topic, Speech, GraphLayout } from '@/types';

describe('graphStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useGraphStore.getState();
    store.resetView();
    store.selectTopic(null);
    store.selectSpeech(null);
    store.setFilter({
      timeRange: null,
      topics: [],
      minAssociationStrength: 0.2,
    });
  });

  it('should have correct initial state', () => {
    const state = useGraphStore.getState();
    expect(state.zoom).toBe(1);
    expect(state.pan).toEqual({ x: 0, y: 0 });
    expect(state.selectedTopic).toBeNull();
    expect(state.selectedSpeech).toBeNull();
    expect(state.filter.topics).toEqual([]);
    expect(state.filter.minAssociationStrength).toBe(0.2);
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
          size: 30,
          data: {
            id: '1',
            name: 'Test Topic',
            speechCount: 5,
            meetingCount: 2,
            firstAppearance: new Date().toISOString(),
            lastAppearance: new Date().toISOString(),
            relatedTopics: [],
          },
        },
      ],
      edges: [],
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    store.setLayout(mockLayout);

    expect(useGraphStore.getState().layout).toEqual(mockLayout);
  });

  it('should select topic', () => {
    const store = useGraphStore.getState();
    const mockTopic: Topic = {
      id: '1',
      name: 'Test Topic',
      speechCount: 5,
      meetingCount: 2,
      firstAppearance: new Date().toISOString(),
      lastAppearance: new Date().toISOString(),
      relatedTopics: [],
    };

    store.selectTopic(mockTopic);

    expect(useGraphStore.getState().selectedTopic).toEqual(mockTopic);
    expect(useGraphStore.getState().selectedSpeech).toBeNull();
  });

  it('should select speech', () => {
    const store = useGraphStore.getState();
    const mockSpeech: Speech = {
      id: '1',
      meetingId: 'm1',
      timestamp: '10:30:00',
      speaker: 'Test User',
      rawText: 'Raw text',
      cleanedText: 'Cleaned text',
      keyQuotes: [],
      topics: ['topic1'],
      sentiment: 'neutral',
      wordCount: 10,
    };

    store.selectSpeech(mockSpeech);

    expect(useGraphStore.getState().selectedSpeech).toEqual(mockSpeech);
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

  it('should update filter', () => {
    const store = useGraphStore.getState();

    store.setFilter({ topics: ['topic1', 'topic2'] });

    expect(useGraphStore.getState().filter.topics).toEqual(['topic1', 'topic2']);
  });

  it('should set loading state', () => {
    const store = useGraphStore.getState();

    store.setIsLoading(true);
    expect(useGraphStore.getState().isLoading).toBe(true);

    store.setIsLoading(false);
    expect(useGraphStore.getState().isLoading).toBe(false);
  });
});
