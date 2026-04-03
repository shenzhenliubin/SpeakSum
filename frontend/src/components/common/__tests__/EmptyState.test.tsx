import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render noData type correctly', () => {
    render(<EmptyState type="noData" />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('还没有任何会议记录，上传第一份会议纪要开始吧')).toBeInTheDocument();
  });

  it('should render noSearchResult type correctly', () => {
    render(<EmptyState type="noSearchResult" />);
    expect(screen.getByText('未找到结果')).toBeInTheDocument();
    expect(screen.getByText('换个关键词试试看？')).toBeInTheDocument();
  });

  it('should render noPermission type correctly', () => {
    render(<EmptyState type="noPermission" />);
    expect(screen.getByText('无权访问')).toBeInTheDocument();
    expect(screen.getByText('你需要登录后才能查看此内容')).toBeInTheDocument();
  });

  it('should render error type correctly', () => {
    render(<EmptyState type="error" />);
    expect(screen.getByText('出错了')).toBeInTheDocument();
    expect(screen.getByText('加载数据时遇到问题，请重试')).toBeInTheDocument();
  });

  it('should render emptyGraph type correctly', () => {
    render(<EmptyState type="emptyGraph" />);
    expect(screen.getByText('知识图谱为空')).toBeInTheDocument();
    expect(screen.getByText('上传会议并处理后，你的知识岛屿将在这里呈现')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        type="noData"
        action={{
          label: '上传会议',
          onClick: handleClick,
        }}
      />
    );
    const button = screen.getByText('上传会议');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render secondary action when provided', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        type="noSearchResult"
        secondaryAction={{
          label: '清除筛选',
          onClick: handleClick,
        }}
      />
    );
    const button = screen.getByText('清除筛选');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render with className', () => {
    render(<EmptyState type="noData" className="custom-class" />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });
});
