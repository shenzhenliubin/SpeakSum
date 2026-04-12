import { useState } from 'react';
import { Input, Select, Button, Card, Tag, Space, Pagination, Modal, message } from 'antd';
import { SearchOutlined, CalendarOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { useContents, useDeleteContent } from '@/hooks/useContents';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import {
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatSourceType,
  formatStatus,
  getContentPrimaryCount,
  getContentPrimaryLabel,
  truncateText,
} from '@/utils/formatters';
import type { Content, ContentStatus } from '@/types';

const statusColors: Record<ContentStatus, string> = {
  processing: 'processing',
  completed: 'success',
  error: 'error',
  failed: 'error',
  ignored: 'warning',
  pending: 'default',
};

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Content | null>(null);
  const pageSize = 10;
  const deleteMutation = useDeleteContent();

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const { data, isLoading } = useContents({
    filters: {
      q: debouncedSearch,
      status: statusFilter,
    },
    page: currentPage,
    page_size: pageSize,
  });

  const contents = data?.items ?? [];
  const hasActiveFilters = Boolean(searchQuery || statusFilter);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      message.success('删除成功');
      setDeleteTarget(null);
    } catch {
      message.error('删除失败，请重试');
    }
  };

  if (isLoading) {
    return <LoadingState type="skeleton" rows={5} />;
  }

  if (!contents.length && !hasActiveFilters) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="思想记录" />
        <Card>
          <EmptyState
            type="noData"
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
      <PageHeader title="思想记录" />

      <Card className="mb-6">
        <Space wrap className="w-full">
          <Input
            placeholder="搜索标题、发言总结或思想金句..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{ width: 320 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 120 }}
            options={[
              { label: '已完成', value: 'completed' },
              { label: '处理中', value: 'processing' },
              { label: '已忽略', value: 'ignored' },
              { label: '已失败', value: 'failed' },
            ]}
          />
          {hasActiveFilters && (
            <Button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter(undefined);
                setCurrentPage(1);
              }}
            >
              清除筛选
            </Button>
          )}
        </Space>
      </Card>

      {!contents.length ? (
        <Card>
          <EmptyState
            type="noSearchResult"
            secondaryAction={{
              label: '清除筛选',
              onClick: () => {
                setSearchQuery('');
                setStatusFilter(undefined);
              },
            }}
          />
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {contents.map((content) => (
              <Card
                key={content.id}
                hoverable
                className="cursor-pointer transition-all hover:shadow-float"
                onClick={() => navigate(`/timeline/${content.id}`)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text-primary text-lg">{content.title}</h3>
                      <Tag color={statusColors[content.status]}>{formatStatus(content.status)}</Tag>
                    </div>
                    <p className="text-text-secondary text-sm mb-3">
                      <CalendarOutlined className="mr-1" />
                      {formatDate(content.content_date)} · {formatRelativeTime(content.content_date)} ·{' '}
                      {formatSourceType(content.source_type)}
                    </p>
                    <p className="text-text-primary leading-relaxed mb-3">
                      {truncateText(
                        content.summary_text || content.ignored_reason || content.error_message || '暂无发言总结',
                        120,
                      )}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-text-tertiary">
                      <span>
                        {formatNumber(getContentPrimaryCount(content))} 条{getContentPrimaryLabel()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setDeleteTarget(content)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                current={currentPage}
                total={data.total}
                pageSize={pageSize}
                onChange={setCurrentPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={!!deleteTarget}
        title="确认删除"
        okText="删除"
        okType="danger"
        cancelText="取消"
        onOk={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLoading={deleteMutation.isPending}
      >
        <p>确定要删除内容「{deleteTarget?.title}」吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
};

export default Timeline;
