import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GraphLayout, GraphNode } from '@/types';

interface GraphState {
  // State
  layout: GraphLayout;
  selectedTopic: GraphNode | null;
  zoom: number;
  pan: { x: number; y: number };
  isLoading: boolean;

  // Actions
  setLayout: (layout: GraphLayout) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  selectTopic: (topic: GraphNode | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useGraphStore = create<GraphState>()(
  immer((set) => ({
    // Backend returns: { nodes: TopicNode[], edges: TopicEdge[], layout_version: string }
    layout: { nodes: [], edges: [], layout_version: '1' },
    selectedTopic: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
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
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.max(0.1, Math.min(5, zoom));
      }),

    setPan: (pan) =>
      set((state) => {
        state.pan = pan;
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
