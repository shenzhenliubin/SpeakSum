import { useEffect, useRef, useCallback } from 'react';
import { Card, Button, Space, Empty } from 'antd';
import { ReloadOutlined, ZoomInOutlined, ZoomOutOutlined, FullscreenOutlined } from '@ant-design/icons';
import { useGraphStore } from '@/stores/graphStore';
import { useGraphLayout } from '@/hooks/useGraphLayout';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import * as d3 from 'd3';
import type { GraphEdge, Speech, Topic } from '@/types';

// D3.js Knowledge Graph Visualization
export const KnowledgeGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Topic, GraphEdge> | null>(null);

  const {
    layout,
    zoom,
    pan,
    selectedTopic,
    selectedSpeech,
    setLayout,
    setZoom,
    setPan,
    selectTopic,
    selectSpeech,
    resetView,
  } = useGraphStore();

  const { data, isLoading } = useGraphLayout();

  useEffect(() => {
    if (data) {
      setLayout(data);
    }
  }, [data, setLayout]);

  // Initialize D3 simulation
  useEffect(() => {
    if (!svgRef.current || !layout.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        setZoom(event.transform.k);
        setPan({ x: event.transform.x, y: event.transform.y });
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Initialize transform from state
    const initialTransform = d3.zoomIdentity.translate(pan.x, pan.y).scale(zoom);
    svg.call(zoomBehavior.transform, initialTransform);

    // Use all nodes (no filter for now - can be added back with proper state)
    const filteredNodes = layout.nodes;

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = layout.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    // Create force simulation
    const simulation = d3
      .forceSimulation<Topic>(filteredNodes)
      .force(
        'link',
        d3
          .forceLink<Topic, GraphEdge>(filteredEdges)
          .id((d) => d.id)
          .distance((d) => 100 / (d.strength || 0.5))
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    // Draw edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(filteredEdges)
      .enter()
      .append('line')
      .attr('stroke', '#d7b082')
      .attr('stroke-width', (d) => Math.max(1, d.strength * 5))
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('class', 'cursor-pointer')
      .call(
        d3
          .drag<SVGGElement, Topic>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add circles for nodes
    node
      .append('circle')
      .attr('r', (d) => Math.max(15, Math.min(40, d.count * 3)))
      .attr('fill', '#6f8465')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (_event, d) => {
        selectTopic(d);
      });

    // Add labels
    node
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 45)
      .attr('fill', '#31291f')
      .attr('font-size', '12px')
      .attr('font-weight', '500');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: GraphEdge) => (d.source as unknown as Topic).x!)
        .attr('y1', (d: GraphEdge) => (d.source as unknown as Topic).y!)
        .attr('x2', (d: GraphEdge) => (d.target as unknown as Topic).x!)
        .attr('y2', (d: GraphEdge) => (d.target as unknown as Topic).y!);

      node.attr('transform', (d: Topic) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [layout, zoom, pan, setZoom, setPan, selectTopic, selectSpeech]);

  const handleZoomIn = useCallback(() => {
    setZoom(zoom * 1.2);
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(zoom / 1.2);
  }, [zoom, setZoom]);

  if (isLoading) {
    return <LoadingState type="skeleton" rows={3} />;
  }

  if (!layout.nodes.length) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-display text-text-primary mb-6">知识图谱</h1>
        <Card>
          <EmptyState
            type="emptyGraph"
            action={{
              label: '上传会议',
              onClick: () => {},
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display text-text-primary">知识图谱</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={resetView}>
            重置视图
          </Button>
        </Space>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Canvas */}
        <Card className="lg:col-span-3 h-[600px] relative">
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ minHeight: '500px' }}
          />

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            <Button icon={<FullscreenOutlined />} onClick={resetView} />
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-xl shadow-sm">
            <div className="text-sm font-medium text-text-primary mb-2">图例</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded-full bg-moss" />
              <span className="text-sm text-text-secondary">话题</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-terracotta" />
              <span className="text-sm text-text-secondary">发言</span>
            </div>
          </div>
        </Card>

        {/* Detail Panel */}
        <Card className="h-[600px] overflow-auto">
          {selectedTopic ? (
            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                {selectedTopic.name}
              </h3>
              <div className="mb-4">
                <div className="text-sm text-text-tertiary mb-1">出现次数</div>
                <div className="text-lg font-semibold text-terracotta">
                  {selectedTopic.count} 次
                </div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-text-tertiary mb-1">相关会议数</div>
                <div className="text-lg font-semibold text-moss">
                  {selectedTopic.meeting_count} 个
                </div>
              </div>
              <div>
                <div className="text-sm text-text-tertiary mb-2">时间范围</div>
                <div className="text-sm text-text-secondary">
                  {selectedTopic.first_appearance?.slice(0, 10)} ~ {selectedTopic.last_appearance?.slice(0, 10)}
                </div>
              </div>
            </div>
          ) : selectedSpeech ? (
            <div>
              <h3 className="font-semibold text-text-primary mb-2">发言详情</h3>
              <p className="text-sm text-text-secondary mb-2">
                {(selectedSpeech as Speech).timestamp}
              </p>
              <p className="text-sm text-text-primary">
                {(selectedSpeech as Speech).cleaned_text}
              </p>
            </div>
          ) : (
            <Empty description="点击节点查看详情" />
          )}
        </Card>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
