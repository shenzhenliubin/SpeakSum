import { useState, useEffect } from 'react';
import { Input, DatePicker, Select, Button, Card, Tag, Space, Pagination } from 'antd';
import { SearchOutlined, CalendarOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '@/hooks/useMeetings';
import { useMeetingStore } from '@/stores/meetingStore';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { formatDate, formatRelativeTime, formatNumber, formatStatus } from '@/utils/formatters';
import type { Meeting, MeetingFilters, MeetingStatus } from '@/types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const statusColors: Record<MeetingStatus, string> = {
  processing: 'processing',
  completed: 'success',
  error: 'error',
};

const MeetingCard: React.FC<{ meeting: Meeting; onClick: () => void }> = ({ meeting, onClick }) => (
  <Card hoverable onClick={onClick} className="cursor-pointer transition-all hover:shadow-float">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold text-text-primary text-lg">{meeting.title}</h3>
          <Tag color={statusColors[meeting.status]}>{formatStatus(meeting.status)}</Tag>
        </div>
        <p className="text-text-secondary text-sm mb-2">
          <CalendarOutlined className="mr-1" />
          {formatDate(meeting.meeting_date)} · {formatRelativeTime(meeting.meeting_date)}
        </p>
        <div className="flex items-center gap-4 text-sm text-text-tertiary">
          <span>{formatNumber(meeting.speech_count)} 条发言</span>
          <span>·</span>
          <span>{meeting.participants.length} 位参与者</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="primary" ghost>查看详情</Button>
      </div>
    </div>
  </Card>
);

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const filters: MeetingFilters = {
    q: debouncedSearch,
    status: statusFilter,
  };

  const { data, isLoading } = useMeetings({
    filters,
    page: currentPage,
    page_size: pageSize,
  });

  const { setMeetings, meetings } = useMeetingStore();

  useEffect(() => {
    if (data?.items) {
      setMeetings(data.items);
    }
  }, [data, setMeetings]);

  const hasActiveFilters = searchQuery || dateRange || statusFilter;

  if (isLoading) {
    return <LoadingState type="skeleton" rows={5} />;
  }

  if (!meetings.length && !hasActiveFilters) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display text-text-primary mb-6">会议时间线</h1>
        <Card>
          <EmptyState
            type="noData"
            action={{
              label: '上传会议',
              onClick: () => navigate('/upload'),
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display text-text-primary">会议时间线</h1>
        <Button icon={<ExportOutlined />}>导出</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Space wrap className="w-full">
          <Input
            placeholder="搜索会议标题、发言人或话题..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
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
              { label: '出错', value: 'error' },
            ]}
          />
          {hasActiveFilters && (
            <Button
              onClick={() => {
                setSearchQuery('');
                setDateRange(null);
                setStatusFilter(undefined);
                setCurrentPage(1);
              }}
            >
              清除筛选
            </Button>
          )}
        </Space>
      </Card>

      {/* Meeting List */}
      {!meetings.length ? (
        <Card>
          <EmptyState
            type="noSearchResult"
            secondaryAction={{
              label: '清除筛选',
              onClick: () => {
                setSearchQuery('');
                setDateRange(null);
                setStatusFilter(undefined);
              },
            }}
          />
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={() => navigate(`/timeline/${meeting.id}`)}
              />
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
    </div>
  );
};

export default Timeline;
