import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GraphLayout, GraphNode, Topic, Speech, GraphFilters } from '@/types';

interface GraphState {
  // State
  layout: GraphLayout;
  selectedTopic: Topic | null;
  selectedSpeech: Speech | null;
  zoom: number;
  pan: { x: number; y: number };
  filter: GraphFilters;
  isLoading: boolean;

  // Actions
  setLayout: (layout: GraphLayout) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  selectTopic: (topic: Topic | null) => void;
  selectSpeech: (speech: Speech | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setFilter: (filter: Partial<GraphFilters>) => void;
  resetView: () => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useGraphStore = create<GraphState>()(
  immer((set) => ({
    layout: { nodes: [], edges: [], version: 1, updatedAt: new Date().toISOString() },
    selectedTopic: null,
    selectedSpeech: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    filter: {
      timeRange: null,
      topics: [],
      minAssociationStrength: 0.2,
    },
    isLoading: false,

    setLayout: (layout) =>
      set((state) => {
        state.layout = layout;
      }),

    updateNodePosition: (nodeId, position) =>
      set((state) => {
        const node = state.layout.nodes.find((n: GraphNode) => n.id === nodeId);
        if (node) {
          node.x = position.x;
          node.y = position.y;
        }
      }),

    selectTopic: (topic) =>
      set((state) => {
        state.selectedTopic = topic;
        if (topic) {
          state.selectedSpeech = null;
        }
      }),

    selectSpeech: (speech) =>
      set((state) => {
        state.selectedSpeech = speech;
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.max(0.1, Math.min(5, zoom));
      }),

    setPan: (pan) =>
      set((state) => {
        state.pan = pan;
      }),

    setFilter: (filter) =>
      set((state) => {
        state.filter = { ...state.filter, ...filter };
      }),

    resetView: () =>
      set((state) => {
        state.zoom = 1;
        state.pan = { x: 0, y: 0 };
      }),

    setIsLoading: (isLoading) =>
      set((state) => {
        state.isLoading = isLoading;
      }),
  }))
);
