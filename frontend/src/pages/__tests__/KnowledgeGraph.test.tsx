import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGraphStore } from '@/stores/graphStore';

import KnowledgeGraph from '../KnowledgeGraph';

const mockUseGraphLayout = vi.fn();
const mockUseDomainDetails = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useGraphLayout', () => ({
  useGraphLayout: () => mockUseGraphLayout(),
  useDomainDetails: () => mockUseDomainDetails(),
}));

describe('KnowledgeGraph', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseDomainDetails.mockReset();
    mockUseGraphLayout.mockReset();
    Object.defineProperty(SVGSVGElement.prototype, 'width', {
      configurable: true,
      value: { baseVal: { value: 800 } },
    });
    Object.defineProperty(SVGSVGElement.prototype, 'height', {
      configurable: true,
      value: { baseVal: { value: 600 } },
    });
    useGraphStore.getState().resetView();
    useGraphStore.getState().setLayout({ nodes: [], edges: [], layout_version: '1' });
    useGraphStore.getState().selectTopic(null);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders frozen domain graph data without throwing when D3 initializes', () => {
    mockUseGraphLayout.mockReturnValue({
      data: Object.freeze({
        nodes: [
          Object.freeze({
            id: 'technology_architecture',
            type: 'domain',
            label: '技术与架构',
            x: 120,
            y: 140,
            size: 24,
            item_count: 3,
          }),
        ],
        edges: [] as const,
        layout_version: '1',
      }),
      isLoading: false,
    });
    mockUseDomainDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { container } = render(<KnowledgeGraph />);
    expect(screen.getByText('知识图谱')).toBeInTheDocument();
    expect(screen.getByText('3 条金句')).toBeInTheDocument();
    expect(container.querySelectorAll('path.graph-island').length).toBeGreaterThan(0);
    expect(screen.queryByText('图例')).toBeNull();
    expect(screen.getByTestId('graph-viewport')).toHaveClass('h-[560px]');
  });

  it('shows selected domain details and related quotes', () => {
    mockUseGraphLayout.mockReturnValue({
      data: {
        nodes: [
          {
            id: 'decision_method',
            type: 'domain',
            label: '方法论与决策',
            item_count: 1,
          },
        ],
        edges: [],
        layout_version: '1',
      },
      isLoading: false,
    });
    mockUseDomainDetails.mockReturnValue({
      data: {
        domain: {
          id: 'decision_method',
          display_name: '方法论与决策',
          description: '决策与方法论相关思考',
          is_system_default: true,
          sort_order: 6,
          created_at: '2026-04-06T00:00:00.000Z',
        },
        quotes: [
          {
            id: 'quote-1',
            content_id: 'content-1',
            text: '先明确约束条件，再做资源投入判断。',
            domain_ids: ['decision_method'],
          },
        ],
        total: 1,
      },
      isLoading: false,
    });

    useGraphStore.getState().selectTopic({
      id: 'decision_method',
      type: 'domain',
      label: '方法论与决策',
    });

    render(<KnowledgeGraph />);

    expect(screen.getAllByText('方法论与决策').length).toBeGreaterThan(0);
    expect(screen.getByText('相关思想金句')).toBeInTheDocument();
    expect(screen.getByText('先明确约束条件，再做资源投入判断。')).toBeInTheDocument();
  });

  it('uses the Fullscreen API for the graph canvas container', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    mockUseGraphLayout.mockReturnValue({
      data: {
        nodes: [
          {
            id: 'decision_method',
            type: 'domain',
            label: '方法论与决策',
            item_count: 2,
          },
        ],
        edges: [],
        layout_version: '1',
      },
      isLoading: false,
    });
    mockUseDomainDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<KnowledgeGraph />);

    screen.getByRole('button', { name: '进入全屏' }).click();

    expect(requestFullscreen).toHaveBeenCalled();
  });
});
