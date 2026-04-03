import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Tag, Tabs, Empty } from 'antd';
import { ArrowLeftOutlined, MessageOutlined, FileTextOutlined, TagOutlined } from '@ant-design/icons';
import { useMeeting, useMeetingSpeeches } from '@/hooks/useMeetings';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate, formatNumber, formatSentiment, getSentimentColor } from '@/utils/formatters';
import type { Speech } from '@/types';

const SpeechItem: React.FC<{ speech: Speech; isFirst: boolean }> = ({ speech, isFirst }) => (
  <div className="mb-6">
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-terracotta" />
        {!isFirst && <div className="w-0.5 h-full bg-line-default absolute mt-3" style={{ height: 'calc(100% + 24px)' }} />}
      </div>
      <Card className="flex-1 ml-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-tertiary font-mono">{speech.timestamp}</span>
          <Tag color={getSentimentColor(speech.sentiment)}>{formatSentiment(speech.sentiment)}</Tag>
        </div>
        <p className="text-text-primary mb-3 leading-relaxed">{speech.cleaned_text}</p>
        {speech.key_quotes.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-text-tertiary mb-2">💡 金句</p>
            {speech.key_quotes.map((quote: string, idx: number) => (
              <div key={idx} className="bg-moss/5 border-l-4 border-moss p-3 rounded-r-lg mb-2">
                <p className="text-text-secondary italic">"{quote}"</p>
              </div>
            ))}
          </div>
        )}
        {speech.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {speech.topics.map((topic) => (
              <Tag key={topic} color="default" className="rounded-full">
                #{topic}
              </Tag>
            ))}
          </div>
        )}
      </Card>
    </div>
  </div>
);

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

  const tabItems = [
    {
      key: 'speeches',
      label: (
        <span>
          <MessageOutlined className="mr-2" />
          发言时间线
        </span>
      ),
      children: isSpeechesLoading ? (
        <LoadingState type="skeleton" rows={5} />
      ) : speeches && speeches.items.length > 0 ? (
        <div className="relative">
          {speeches.items.map((speech: Speech, index: number) => (
            <SpeechItem key={speech.id} speech={speech} isFirst={index === 0} />
          ))}
        </div>
      ) : (
        <Empty description="暂无发言记录" />
      ),
    },
    {
      key: 'info',
      label: (
        <span>
          <FileTextOutlined className="mr-2" />
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
              <h4 className="text-text-tertiary mb-1">源文件</h4>
              <p className="text-text-primary">{meeting.source_file}</p>
            </div>
            <div>
              <h4 className="text-text-tertiary mb-1">参与者</h4>
              <div className="flex flex-wrap gap-2">
                {meeting.participants.map((p) => (
                  <Tag key={p} color="default">
                    {p}
                  </Tag>
                ))}
              </div>
            </div>
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
    {
      key: 'topics',
      label: (
        <span>
          <TagOutlined className="mr-2" />
          话题分布
        </span>
      ),
      children: (
        <Card>
          {speeches && speeches.items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(speeches.items.flatMap((s: Speech) => s.topics))).map((topic: string) => (
                <Tag key={topic} color="default" className="text-base px-4 py-1">
                  #{topic}
                </Tag>
              ))}
            </div>
          ) : (
            <Empty description="暂无话题数据" />
          )}
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
            {formatDate(meeting.meeting_date)} · {formatNumber(meeting.speech_count)} 条发言
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs items={tabItems} defaultActiveKey="speeches" />
    </div>
  );
};

export default MeetingDetail;
