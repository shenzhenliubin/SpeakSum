import { useEffect } from 'react';
import { Button, Card, Statistic, Row, Col } from 'antd';
import {
  UploadOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  MessageOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '@/hooks/useMeetings';
import { useMeetingStore } from '@/stores/meetingStore';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { formatNumber, formatRelativeTime } from '@/utils/formatters';
import type { Meeting } from '@/types';

const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <Card
    hoverable
    onClick={onClick}
    className="h-full cursor-pointer transition-all duration-200 hover:translate-y-[-4px] hover:shadow-float"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-terracotta/10 flex items-center justify-center shrink-0">
        <span className="text-terracotta text-xl">{icon}</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
        <p className="text-text-secondary text-sm">{description}</p>
      </div>
    </div>
  </Card>
);

const MeetingCard: React.FC<{ meeting: Meeting; onClick: () => void }> = ({
  meeting,
  onClick,
}) => (
  <Card
    hoverable
    onClick={onClick}
    className="cursor-pointer transition-all duration-200 hover:translate-y-[-2px]"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-text-primary truncate mb-1">
          {meeting.title}
        </h4>
        <p className="text-sm text-text-secondary">
          {formatRelativeTime(meeting.date)} · {meeting.duration || '未知时长'}
        </p>
        <div className="flex items-center gap-4 mt-2 text-sm text-text-tertiary">
          <span className="flex items-center gap-1">
            <MessageOutlined />
            {formatNumber(meeting.mySpeechCount)} 条发言
          </span>
          <span className="flex items-center gap-1">
            <TagOutlined />
            {meeting.participants.length} 人参与
          </span>
        </div>
      </div>
      <div
        className={`px-2 py-1 rounded-full text-xs ${
          meeting.status === 'completed'
            ? 'bg-moss/10 text-moss'
            : meeting.status === 'processing'
            ? 'bg-terracotta/10 text-terracotta'
            : 'bg-status-warning/10 text-status-warning'
        }`}
      >
        {meeting.status === 'completed'
          ? '已完成'
          : meeting.status === 'processing'
          ? '处理中'
          : '待处理'}
      </div>
    </div>
  </Card>
);

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useMeetings({ page: 1, pageSize: 5 });
  const { meetings, setMeetings } = useMeetingStore();

  useEffect(() => {
    if (data?.items) {
      setMeetings(data.items);
    }
  }, [data, setMeetings]);

  const stats = [
    { title: '会议总数', value: data?.total || 0, icon: <FileTextOutlined /> },
    { title: '我的发言', value: meetings.reduce((acc, m) => acc + m.mySpeechCount, 0), icon: <MessageOutlined /> },
    { title: '参与人数', value: new Set(meetings.flatMap((m) => m.participants)).size, icon: <TagOutlined /> },
  ];

  if (isLoading) {
    return <LoadingState type="skeleton" rows={5} />;
  }

  const hasMeetings = meetings.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-display text-text-primary mb-2">
          欢迎来到 SpeakSum
        </h1>
        <p className="text-text-secondary">
          智能分析会议记录，构建你的个人知识图谱
        </p>
      </div>

      {/* Stats */}
      {hasMeetings && (
        <Row gutter={[16, 16]} className="mb-8">
          {stats.map((stat) => (
            <Col xs={24} sm={8} key={stat.title}>
              <Card>
                <Statistic
                  title={<span className="text-text-secondary">{stat.title}</span>}
                  value={stat.value}
                  prefix={<span className="text-terracotta mr-2">{stat.icon}</span>}
                  valueStyle={{ color: '#31291f', fontSize: '28px' }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-text-primary mb-4">快速入口</h2>
      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} md={8}>
          <QuickActionCard
            title="上传会议"
            description="上传新的会议纪要文件，开始智能分析"
            icon={<UploadOutlined />}
            onClick={() => navigate('/upload')}
          />
        </Col>
        <Col xs={24} md={8}>
          <QuickActionCard
            title="查看时间线"
            description="按时间查看所有会议发言记录"
            icon={<ClockCircleOutlined />}
            onClick={() => navigate('/timeline')}
          />
        </Col>
        <Col xs={24} md={8}>
          <QuickActionCard
            title="知识图谱"
            description="可视化探索话题之间的关联关系"
            icon={<ApartmentOutlined />}
            onClick={() => navigate('/graph')}
          />
        </Col>
      </Row>

      {/* Recent Meetings */}
      {hasMeetings ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">最近会议</h2>
            <Button type="link" onClick={() => navigate('/timeline')}>
              查看全部
            </Button>
          </div>
          <div className="space-y-4">
            {meetings.slice(0, 5).map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={() => navigate(`/timeline/${meeting.id}`)}
              />
            ))}
          </div>
        </>
      ) : (
        <Card className="mt-8">
          <EmptyState
            type="noData"
            action={{
              label: '立即上传',
              onClick: () => navigate('/upload'),
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default Home;
