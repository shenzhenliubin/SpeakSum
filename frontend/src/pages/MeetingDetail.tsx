import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Tag, Tabs, Empty, Divider } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, BulbOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useMeeting, useMeetingSpeeches } from '@/hooks/useMeetings';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate, formatNumber, formatSentiment, getSentimentColor } from '@/utils/formatters';
import type { Speech } from '@/types';

export const MeetingDetail: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const { data: meeting, isLoading: isMeetingLoading } = useMeeting(meetingId);
  const { data: speeches, isLoading: isSpeechesLoading } = useMeetingSpeeches(meetingId);

  if (isMeetingLoading) {
    return <LoadingState type="skeleton" rows={5} />;
  }

  if (!meeting) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          type="error"
          title="会议未找到"
          description="该会议不存在或已被删除"
          action={{
            label: '返回时间线',
            onClick: () => navigate('/timeline'),
          }}
        />
      </div>
    );
  }

  const speechItems = speeches?.items ?? [];
  const allKeyQuotes = speechItems.flatMap((s: Speech) => s.key_quotes || []);
  const allTopics = Array.from(new Set(speechItems.flatMap((s: Speech) => s.topics || [])));

  const tabItems = [
    {
      key: 'summary',
      label: (
        <span>
          <FileTextOutlined className="mr-2" />
          发言总结
        </span>
      ),
      children: isSpeechesLoading ? (
        <LoadingState type="skeleton" rows={5} />
      ) : speechItems.length > 0 ? (
        <div className="space-y-4">
          {speechItems.map((speech: Speech) => (
            <Card key={speech.id} size="small" className="border-l-4 border-l-terracotta">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-text-tertiary font-mono bg-bg-secondary px-2 py-0.5 rounded">
                  {speech.timestamp}
                </span>
                <Tag color={getSentimentColor(speech.sentiment)} className="text-xs">
                  {formatSentiment(speech.sentiment)}
                </Tag>
              </div>
              <p className="text-text-primary leading-relaxed">
                {speech.cleaned_text || speech.raw_text}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Empty description="暂无发言记录" />
      ),
    },
    {
      key: 'quotes',
      label: (
        <span>
          <BulbOutlined className="mr-2" />
          金句摘录
        </span>
      ),
      children: allKeyQuotes.length > 0 ? (
        <div className="space-y-3">
          {allKeyQuotes.map((quote: string, idx: number) => (
            <div key={idx} className="bg-moss/5 border-l-4 border-moss p-4 rounded-r-lg">
              <p className="text-text-primary text-base italic leading-relaxed">"{quote}"</p>
            </div>
          ))}
        </div>
      ) : (
        <Empty description="暂无金句摘录" />
      ),
    },
    {
      key: 'info',
      label: (
        <span>
          <InfoCircleOutlined className="mr-2" />
          会议信息
        </span>
      ),
      children: (
        <Card>
          <div className="space-y-4">
            <div>
              <h4 className="text-text-tertiary mb-1">会议标题</h4>
              <p className="text-text-primary text-lg">{meeting.title}</p>
            </div>
            <div>
              <h4 className="text-text-tertiary mb-1">会议日期</h4>
              <p className="text-text-primary">{formatDate(meeting.meeting_date)}</p>
            </div>
            <div>
              <h4 className="text-text-tertiary mb-1">发言数量</h4>
              <p className="text-text-primary">{formatNumber(speechItems.length)} 条</p>
            </div>
            {allTopics.length > 0 && (
              <div>
                <h4 className="text-text-tertiary mb-1">关联话题</h4>
                <div className="flex flex-wrap gap-2">
                  {allTopics.map((topic: string) => (
                    <Tag key={topic} color="default" className="rounded-full">
                      #{topic}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h4 className="text-text-tertiary mb-1">处理状态</h4>
              <Tag
                color={
                  meeting.status === 'completed'
                    ? 'success'
                    : meeting.status === 'processing'
                    ? 'processing'
                    : meeting.status === 'error'
                    ? 'error'
                    : 'default'
                }
              >
                {meeting.status === 'completed'
                  ? '已完成'
                  : meeting.status === 'processing'
                  ? '处理中'
                  : meeting.status === 'error'
                  ? '出错'
                  : '待处理'}
              </Tag>
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/timeline')}>
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display text-text-primary">{meeting.title}</h1>
          <p className="text-text-secondary">
            {formatDate(meeting.meeting_date)} · {formatNumber(speechItems.length)} 条发言
            {allKeyQuotes.length > 0 && ` · ${allKeyQuotes.length} 条金句`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs items={tabItems} defaultActiveKey="summary" />
    </div>
  );
};

export default MeetingDetail;
