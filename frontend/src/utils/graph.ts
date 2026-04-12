import * as d3 from 'd3';

import { DOMAIN_COLORS } from '@/utils/constants';
import type { GraphEdge, GraphLayout, GraphNode } from '@/types';

export interface MutableGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function cloneGraphLayoutForSimulation(layout: GraphLayout): MutableGraphData {
  return {
    nodes: layout.nodes.map((node) => ({ ...node })),
    edges: layout.edges.map((edge) => ({ ...edge })),
  };
}

export function cloneGraphNode(node: GraphNode): GraphNode {
  return { ...node };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getGraphNodeCount(node: GraphNode): number {
  return Math.max(1, node.item_count ?? 1);
}

export function getDomainIslandPalette(domainId: string): { fill: string; stroke: string } {
  return DOMAIN_COLORS[domainId] ?? { fill: '#9B8C79', stroke: '#7A6D5B' };
}

export function getCenteredTransformForBounds(
  bounds: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  options?: { minScale?: number; maxScale?: number; padding?: number },
): { x: number; y: number; k: number } {
  const minScale = options?.minScale ?? 0.2;
  const maxScale = options?.maxScale ?? 2;
  const padding = options?.padding ?? 72;

  const safeWidth = Math.max(bounds.width, 1);
  const safeHeight = Math.max(bounds.height, 1);
  const availableWidth = Math.max(viewport.width - padding * 2, 1);
  const availableHeight = Math.max(viewport.height - padding * 2, 1);
  const scale = clamp(
    Math.min(availableWidth / safeWidth, availableHeight / safeHeight),
    minScale,
    maxScale,
  );

  return {
    k: scale,
    x: viewport.width / 2 - (bounds.x + safeWidth / 2) * scale,
    y: viewport.height / 2 - (bounds.y + safeHeight / 2) * scale,
  };
}

export function getIslandMetrics(node: GraphNode): {
  width: number;
  height: number;
  rotation: number;
  collisionRadius: number;
} {
  const count = getGraphNodeCount(node);
  const hash = hashString(node.id);
  const magnitude = Math.sqrt(count);
  const widthBias = 0.92 + (hash % 7) * 0.05;
  const heightBias = 0.88 + ((hash >> 3) % 5) * 0.05;
  const width = clamp((128 + magnitude * 54) * widthBias, 120, 360);
  const height = clamp((88 + magnitude * 34) * heightBias, 86, 230);
  const rotation = ((hash % 17) - 8) * 1.8;
  return {
    width,
    height,
    rotation,
    collisionRadius: Math.max(width, height) / 2 + 18,
  };
}

export function buildIslandPath(node: GraphNode): string {
  const { width, height } = getIslandMetrics(node);
  const rx = width / 2;
  const ry = height / 2;
  const hash = hashString(node.id);
  const points = Array.from({ length: 12 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 12;
    const radialNoise = 0.95 + (((hash >> (index % 10)) & 0xf) / 15) * 0.1;
    const verticalNoise = 0.96 + (((hash >> ((index + 4) % 10)) & 0xf) / 15) * 0.08;
    return [
      Math.cos(angle) * rx * radialNoise,
      Math.sin(angle) * ry * verticalNoise,
    ] as [number, number];
  });

  const line = d3.line<[number, number]>().curve(d3.curveBasisClosed);
  return line(points) ?? '';
}
