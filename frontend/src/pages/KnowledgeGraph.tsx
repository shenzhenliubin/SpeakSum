import { useEffect, useRef, useCallback, useState } from 'react';
import { Card, Button, Space, Empty } from 'antd';
import {
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';

import { useGraphStore } from '@/stores/graphStore';
import { useGraphLayout, useDomainDetails } from '@/hooks/useGraphLayout';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { formatNumber } from '@/utils/formatters';
import { DOMAIN_LABELS } from '@/utils/constants';
import {
  buildIslandPath,
  cloneGraphLayoutForSimulation,
  cloneGraphNode,
  getCenteredTransformForBounds,
  getDomainIslandPalette,
  getGraphNodeCount,
  getIslandMetrics,
} from '@/utils/graph';
import type { GraphEdge, GraphNode } from '@/types';

const ZOOM_DURATION_MS = 260;

export const KnowledgeGraph: React.FC = () => {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const graphLayerNodeRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const previousViewRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const zoomStateRef = useRef({
    zoom: useGraphStore.getState().zoom,
    pan: useGraphStore.getState().pan,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const layout = useGraphStore((state) => state.layout);
  const selectedTopic = useGraphStore((state) => state.selectedTopic);
  const setLayout = useGraphStore((state) => state.setLayout);
  const setZoom = useGraphStore((state) => state.setZoom);
  const setPan = useGraphStore((state) => state.setPan);
  const selectTopic = useGraphStore((state) => state.selectTopic);
  const resetView = useGraphStore((state) => state.resetView);

  const { data, isLoading } = useGraphLayout();
  const { data: domainDetails, isLoading: isDomainDetailsLoading } = useDomainDetails(selectedTopic?.id);

  useEffect(() => {
    if (data) {
      setLayout(data);
    }
  }, [data, setLayout]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextIsFullscreen = document.fullscreenElement === graphViewportRef.current;
      setIsFullscreen(nextIsFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const applyTransform = useCallback(
    (
      transform: { x: number; y: number; k: number },
      options?: { animate?: boolean },
    ) => {
      if (!svgRef.current || !zoomBehaviorRef.current) return;

      const target = d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k);
      if (options?.animate === false) {
        d3.select(svgRef.current).call(zoomBehaviorRef.current.transform, target);
        return;
      }

      d3.select(svgRef.current)
        .transition()
        .duration(ZOOM_DURATION_MS)
        .ease(d3.easeCubicOut)
        .call(zoomBehaviorRef.current.transform, target);
    },
    [],
  );

  const centerGraphInViewport = useCallback(
    (options?: { animate?: boolean }) => {
      if (!svgRef.current || !graphLayerNodeRef.current) return;

      const bounds = graphLayerNodeRef.current.getBBox();
      const viewportWidth = svgRef.current.clientWidth || 960;
      const viewportHeight = svgRef.current.clientHeight || 620;
      const transform = getCenteredTransformForBounds(
        bounds,
        { width: viewportWidth, height: viewportHeight },
        { minScale: 0.4, maxScale: 1.8, padding: 96 },
      );

      applyTransform(transform, options);
    },
    [applyTransform],
  );

  useEffect(() => {
    if (!graphViewportRef.current) return;

    if (isFullscreen) {
      requestAnimationFrame(() => {
        centerGraphInViewport();
      });
      return;
    }

    if (previousViewRef.current) {
      const { zoom, pan } = previousViewRef.current;
      previousViewRef.current = null;
      requestAnimationFrame(() => {
        applyTransform({ k: zoom, x: pan.x, y: pan.y });
      });
    }
  }, [applyTransform, centerGraphInViewport, isFullscreen]);

  useEffect(() => {
    if (!svgRef.current || !layout.nodes.length) return;

    const svgElement = svgRef.current;
    const svg = d3.select(svgElement);
    const width = svgElement.clientWidth || 960;
    const height = svgElement.clientHeight || 620;

    simulationRef.current?.stop();
    svg.selectAll('*').remove();

    const graphLayer = svg.append('g');
    graphLayerNodeRef.current = graphLayer.node();
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        const { k, x, y } = event.transform;
        zoomStateRef.current = {
          zoom: k,
          pan: { x, y },
        };
        setZoom(k);
        setPan({ x, y });
        graphLayer.attr('transform', event.transform.toString());
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    const initialTransform = d3.zoomIdentity
      .translate(zoomStateRef.current.pan.x, zoomStateRef.current.pan.y)
      .scale(zoomStateRef.current.zoom);
    svg.call(zoomBehavior.transform, initialTransform);

    const { nodes: clonedNodes, edges: clonedEdges } = cloneGraphLayoutForSimulation(layout);
    const nodeIds = new Set(clonedNodes.map((node) => node.id));
    const filteredEdges = clonedEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

    const simulation = d3
      .forceSimulation<GraphNode>(clonedNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(filteredEdges)
          .id((node) => node.id)
          .distance((edge) => 110 / (edge.strength || 0.5)),
      )
      .force('charge', d3.forceManyBody().strength(-340))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<GraphNode>().radius((node) => getIslandMetrics(node).collisionRadius),
      );

    simulationRef.current = simulation;

    const link = graphLayer
      .append('g')
      .selectAll('line')
      .data(filteredEdges)
      .enter()
      .append('line')
      .attr('stroke', '#d7b082')
      .attr('stroke-width', (edge) => Math.max(1, (edge.strength ?? 0.5) * 5))
      .attr('stroke-opacity', 0.42)
      .attr('stroke-linecap', 'round');

    const node = graphLayer
      .append('g')
      .selectAll('g')
      .data(clonedNodes)
      .enter()
      .append('g')
      .attr('class', 'cursor-pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, datum) => {
            if (!event.active) simulation.alphaTarget(0.22).restart();
            datum.fx = datum.x;
            datum.fy = datum.y;
          })
          .on('drag', (event, datum) => {
            datum.fx = event.x;
            datum.fy = event.y;
          })
          .on('end', (event, datum) => {
            if (!event.active) simulation.alphaTarget(0);
            datum.fx = null;
            datum.fy = null;
          }),
      );

    node
      .append('path')
      .attr('class', 'graph-island')
      .attr('d', (datum) => buildIslandPath(datum))
      .attr('fill', (datum) => getDomainIslandPalette(datum.id).fill)
      .attr('stroke', (datum) => getDomainIslandPalette(datum.id).stroke)
      .attr('stroke-width', 2.5)
      .attr('fill-opacity', 0.92)
      .style('filter', 'drop-shadow(0 14px 28px rgba(111, 88, 57, 0.12))')
      .attr('transform', (datum) => `rotate(${getIslandMetrics(datum).rotation})`)
      .on('click', (_event, datum) => {
        selectTopic(cloneGraphNode(datum));
      });

    node
      .append('text')
      .text((datum) => `${formatNumber(getGraphNodeCount(datum))} 条金句`)
      .attr('class', 'graph-island-count')
      .attr('text-anchor', 'middle')
      .attr('dy', -12)
      .attr('fill', '#fffdf8')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .style('pointer-events', 'none');

    node
      .append('text')
      .text((datum) => datum.label)
      .attr('class', 'graph-island-label')
      .attr('text-anchor', 'middle')
      .attr('dy', 18)
      .attr('fill', '#fffdf8')
      .attr('font-size', (datum) => (String(datum.label).length > 8 ? '18px' : '22px'))
      .attr('font-weight', '700')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (edge: GraphEdge) => (edge.source as unknown as GraphNode).x!)
        .attr('y1', (edge: GraphEdge) => (edge.source as unknown as GraphNode).y!)
        .attr('x2', (edge: GraphEdge) => (edge.target as unknown as GraphNode).x!)
        .attr('y2', (edge: GraphEdge) => (edge.target as unknown as GraphNode).y!);

      node.attr('transform', (datum: GraphNode) => `translate(${datum.x || 0},${datum.y || 0})`);
    });

    return () => {
      simulation.stop();
      simulationRef.current = null;
      graphLayerNodeRef.current = null;
    };
  }, [layout, selectTopic, setPan, setZoom]);

  const runZoomTransition = useCallback(
    (action: (transition: d3.Transition<SVGSVGElement, unknown, null, undefined>) => void) => {
      if (!svgRef.current || !zoomBehaviorRef.current) return;

      const transition = d3
        .select(svgRef.current)
        .transition()
        .duration(ZOOM_DURATION_MS)
        .ease(d3.easeCubicOut);

      action(transition);
    },
    [],
  );

  const handleZoomIn = useCallback(() => {
    const zoomBehavior = zoomBehaviorRef.current;
    if (!zoomBehavior) return;

    runZoomTransition((transition) => {
      transition.call(zoomBehavior.scaleBy, 1.16);
    });
  }, [runZoomTransition]);

  const handleZoomOut = useCallback(() => {
    const zoomBehavior = zoomBehaviorRef.current;
    if (!zoomBehavior) return;

    runZoomTransition((transition) => {
      transition.call(zoomBehavior.scaleBy, 1 / 1.16);
    });
  }, [runZoomTransition]);

  const handleResetView = useCallback(() => {
    resetView();
    zoomStateRef.current = {
      zoom: 1,
      pan: { x: 0, y: 0 },
    };
    previousViewRef.current = null;
    centerGraphInViewport();
  }, [centerGraphInViewport, resetView]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!graphViewportRef.current) return;

    if (document.fullscreenElement === graphViewportRef.current) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      return;
    }

    if (graphViewportRef.current.requestFullscreen) {
      previousViewRef.current = { ...zoomStateRef.current, pan: { ...zoomStateRef.current.pan } };
      await graphViewportRef.current.requestFullscreen();
    }
  }, []);

  if (isLoading) {
    return <LoadingState type="skeleton" rows={3} />;
  }

  if (!layout.nodes.length) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="知识图谱" />
        <Card>
          <EmptyState
            type="emptyGraph"
            action={{
              label: '上传内容',
              onClick: () => navigate('/upload'),
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="知识图谱"
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleResetView}>
              重置视图
            </Button>
          </Space>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <div
            ref={graphViewportRef}
            data-testid="graph-viewport"
            className={[
              'relative w-full overflow-hidden bg-bg-panel',
              isFullscreen ? 'h-screen rounded-none p-4' : 'h-[560px] rounded-2xl',
            ].join(' ')}
          >
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{ minHeight: isFullscreen ? '100%' : '500px' }}
            />

            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <Button aria-label="放大图谱" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
              <Button aria-label="缩小图谱" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
              <Button
                aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={handleToggleFullscreen}
              />
            </div>
          </div>
        </Card>

        <Card className="h-[560px] overflow-auto">
          {selectedTopic ? (
            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                {domainDetails?.domain.display_name ?? selectedTopic.label}
              </h3>
              {isDomainDetailsLoading ? (
                <LoadingState type="skeleton" rows={4} />
              ) : domainDetails ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-bg-secondary px-3 py-2">
                      <div className="text-sm text-text-tertiary mb-1">关联金句</div>
                      <div className="text-lg font-semibold text-terracotta">
                        {formatNumber(domainDetails.total)} 条
                      </div>
                    </div>
                    <div className="rounded-xl bg-bg-secondary px-3 py-2">
                      <div className="text-sm text-text-tertiary mb-1">领域类型</div>
                      <div className="text-lg font-semibold text-moss">系统预设</div>
                    </div>
                  </div>

                  {domainDetails.domain.description && (
                    <div className="mb-5">
                      <div className="text-sm text-text-tertiary mb-2">领域说明</div>
                      <div className="text-sm text-text-secondary">{domainDetails.domain.description}</div>
                    </div>
                  )}

                  {domainDetails.quotes.length > 0 ? (
                    <div>
                      <div className="text-sm text-text-tertiary mb-3">相关思想金句</div>
                      <div className="space-y-3">
                        {domainDetails.quotes.map((quote) => (
                          <div key={quote.id} className="rounded-xl border border-border-light px-3 py-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-xs text-text-tertiary">金句</div>
                              <Button
                                size="small"
                                type="link"
                                onClick={() => navigate(`/timeline/${quote.content_id}`)}
                              >
                                查看内容
                              </Button>
                            </div>
                            <p className="text-sm text-text-primary leading-relaxed">{quote.text}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {quote.domain_ids.map((domainId) => (
                                <span
                                  key={`${quote.id}-${domainId}`}
                                  className="rounded-full bg-bg-secondary px-2 py-1 text-xs text-text-secondary"
                                >
                                  #{DOMAIN_LABELS[domainId] ?? domainId}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Empty description="暂无关联金句" />
                  )}
                </>
              ) : (
                <Empty description="暂无领域详情" />
              )}
            </div>
          ) : (
            <Empty description="点击领域节点查看详情" />
          )}
        </Card>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
