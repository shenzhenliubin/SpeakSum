import { Button, Card, Statistic, Row, Col } from 'antd';
import {
  UploadOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { useContents } from '@/hooks/useContents';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import {
  formatNumber,
  formatRelativeTime,
  formatSourceType,
  getContentPrimaryCount,
  getContentPrimaryLabel,
  truncateText,
} from '@/utils/formatters';
import type { Content } from '@/types';

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

const ContentCard: React.FC<{ content: Content; onClick: () => void }> = ({ content, onClick }) => (
  <Card
    hoverable
    onClick={onClick}
    className="cursor-pointer transition-all duration-200 hover:translate-y-[-2px]"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-text-primary truncate mb-1">
          {content.title}
        </h4>
        <p className="text-sm text-text-secondary">
          {formatRelativeTime(content.content_date)} · {formatSourceType(content.source_type)}
        </p>
        <p className="text-sm text-text-primary mt-2">
          {truncateText(content.summary_text || '暂无发言总结', 72)}
        </p>
        <div className="flex items-center gap-4 mt-2 text-sm text-text-tertiary">
          <span className="flex items-center gap-1">
            <BulbOutlined />
            {formatNumber(getContentPrimaryCount(content))} 条{getContentPrimaryLabel()}
          </span>
        </div>
      </div>
      <div
        className={`px-2 py-1 rounded-full text-xs ${
          content.status === 'completed'
            ? 'bg-moss/10 text-moss'
            : content.status === 'processing'
              ? 'bg-terracotta/10 text-terracotta'
              : content.status === 'ignored'
                ? 'bg-status-warning/10 text-status-warning'
                : 'bg-red-100 text-red-600'
        }`}
      >
        {content.status === 'completed'
          ? '已完成'
          : content.status === 'processing'
            ? '处理中'
            : content.status === 'ignored'
              ? '已忽略'
              : '待处理'}
      </div>
    </div>
  </Card>
);

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useContents({ page: 1, page_size: 5 });
  const contents = data?.items ?? [];

  const stats = [
    { title: '内容总数', value: data?.total || 0, icon: <FileTextOutlined /> },
    {
      title: '思想金句',
      value: contents.reduce((acc, item) => acc + getContentPrimaryCount(item), 0),
      icon: <BulbOutlined />,
    },
  ];

  if (isLoading) {
    return <LoadingState type="skeleton" rows={5} />;
  }

  const hasContents = contents.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="欢迎来到 SpeakSum" />
      <p className="mb-6 max-w-3xl text-sm text-text-secondary">
        这是刘彬的个人思想沉淀系统，持续整理会议发言、文章和其他文本中的长期价值。
      </p>

      {hasContents && (
        <Row gutter={[16, 16]} className="mb-8">
          {stats.map((stat) => (
            <Col xs={24} sm={12} key={stat.title}>
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

      <h2 className="text-xl font-semibold text-text-primary mb-4">快速入口</h2>
      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} md={8}>
          <QuickActionCard
            title="上传内容"
            description="上传会议纪要或其他文本，生成发言总结与思想金句"
            icon={<UploadOutlined />}
            onClick={() => navigate('/upload')}
          />
        </Col>
        <Col xs={24} md={8}>
          <QuickActionCard
            title="查看思想记录"
            description="按真实内容日期查看所有发言总结与金句沉淀"
            icon={<ClockCircleOutlined />}
            onClick={() => navigate('/timeline')}
          />
        </Col>
        <Col xs={24} md={8}>
          <QuickActionCard
            title="知识图谱"
            description="按领域探索思想金句之间的聚合关系"
            icon={<ApartmentOutlined />}
            onClick={() => navigate('/graph')}
          />
        </Col>
      </Row>

      {hasContents ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">最近内容</h2>
            <Button type="link" onClick={() => navigate('/timeline')}>
              查看全部
            </Button>
          </div>
          <div className="space-y-4">
            {contents.slice(0, 5).map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => navigate(`/timeline/${content.id}`)}
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
