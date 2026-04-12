import { describe, expect, it } from 'vitest';

import type { GraphLayout } from '@/types';

import {
  buildIslandPath,
  cloneGraphLayoutForSimulation,
  cloneGraphNode,
  getCenteredTransformForBounds,
  getDomainIslandPalette,
  getIslandMetrics,
} from '../graph';

describe('graph utils', () => {
  it('creates mutable copies for D3 simulation from frozen layout data', () => {
    const layout: GraphLayout = {
      nodes: [
        Object.freeze({
          id: 'topic-1',
          type: 'topic',
          label: '数字化',
          x: 100,
          y: 120,
          size: 24,
        }),
      ],
      edges: [
        Object.freeze({
          source: 'topic-1',
          target: 'topic-2',
          type: 'related',
          strength: 0.8,
        }),
      ],
      layout_version: '1',
    };

    const { nodes, edges } = cloneGraphLayoutForSimulation(layout);

    expect(nodes[0]).not.toBe(layout.nodes[0]);
    expect(edges[0]).not.toBe(layout.edges[0]);

    expect(() => {
      nodes[0].fx = 10;
      edges[0].strength = 0.5;
    }).not.toThrow();
  });

  it('clones a selected graph node before storing it in state', () => {
    const node = Object.freeze({
      id: 'topic-1',
      type: 'topic',
      label: '试点',
      x: 1,
      y: 2,
    });

    const copy = cloneGraphNode(node);

    expect(copy).not.toBe(node);
    expect(copy).toEqual(node);
    expect(() => {
      copy.fx = 99;
    }).not.toThrow();
  });

  it('builds deterministic island geometry and palette for domain nodes', () => {
    const node = {
      id: 'technology_architecture',
      type: 'domain',
      label: '技术与架构',
      item_count: 5,
    };

    const metrics = getIslandMetrics(node);
    const path = buildIslandPath(node);
    const palette = getDomainIslandPalette(node.id);

    expect(metrics.width).toBeGreaterThan(metrics.height);
    expect(metrics.collisionRadius).toBeGreaterThan(0);
    expect(path.startsWith('M')).toBe(true);
    expect(palette.fill).toMatch(/^#/);
    expect(palette.stroke).toMatch(/^#/);
  });

  it('calculates a centered transform that keeps graph content in the middle of the viewport', () => {
    const transform = getCenteredTransformForBounds(
      { x: 120, y: 80, width: 360, height: 200 },
      { width: 1400, height: 900 },
      { minScale: 0.4, maxScale: 1.8, padding: 96 },
    );

    expect(transform.k).toBeGreaterThan(0.4);
    expect(transform.k).toBeLessThanOrEqual(1.8);
    expect(transform.x).toBeGreaterThan(0);
    expect(transform.y).toBeGreaterThan(0);
  });
});
