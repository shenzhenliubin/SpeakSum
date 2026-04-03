import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Progress, Steps, Alert, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useProcessing } from '@/hooks/useProcessing';
import { LoadingState } from '@/components/common/LoadingState';
import { formatTaskStage } from '@/utils/formatters';
import type { TaskStage } from '@/types';

const stages: TaskStage[] = ['parsing', 'extracting', 'cleaning', 'tagging', 'building_graph'];

const stageDescriptions: Record<TaskStage, string> = {
  parsing: '读取并解析会议文件内容',
  extracting: '识别并提取你的发言',
  cleaning: '使用 AI 清理口语表达和重复内容',
  tagging: '提取话题标签和金句',
  building_graph: '构建知识图谱关联关系',
};

export const ProcessingProgress: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState(0);

  const { progress, isLoading, isComplete, isError, errorMessage } = useProcessing(
    taskId,
    (data) => {
      console.log('Progress update:', data);
    }
  );

  // Timer for elapsed time
  useEffect(() => {
    if (!isComplete && !isError) {
      const timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isComplete, isError]);

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentStep = () => {
    if (!progress) return 0;
    const stageIndex = stages.indexOf(progress.current_step as TaskStage);
    return stageIndex >= 0 ? stageIndex : 0;
  };

  if (!progress && isLoading) {
    return <LoadingState type="spinner" />;
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <CloseCircleOutlined className="text-6xl text-status-error mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">处理出错</h2>
            <p className="text-text-secondary mb-6">{errorMessage || '处理过程中发生错误，请重试'}</p>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
                重试
              </Button>
              <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
                返回首页
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <CheckCircleOutlined className="text-6xl text-status-success mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">处理完成！</h2>
            <p className="text-text-secondary mb-6">
              会议已成功处理，你的发言已添加到知识图谱中
            </p>
            <Space>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => navigate('/timeline')}
              >
                查看会议
              </Button>
              <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
                返回首页
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button icon={<ArrowLeftOutlined />} className="mb-4" onClick={() => navigate('/upload')}>
        返回上传
      </Button>

      <Card title="处理进度">
        {/* Overall Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-primary font-medium">总体进度</span>
            <span className="text-text-secondary">
              {progress?.progress || 0}% · 已用时 {formatElapsedTime(elapsedTime)}
            </span>
          </div>
          <Progress
            percent={progress?.progress || 0}
            status={isError ? 'exception' : 'active'}
            strokeColor="#c8734f"
          />
        </div>

        {/* Processing Steps */}
        <Steps
          direction="vertical"
          current={getCurrentStep()}
          items={stages.map((stage) => ({
            title: formatTaskStage(stage),
            description: stageDescriptions[stage],
          }))}
        />

        {/* Status Alert */}
        <Alert
          message={
            progress?.current_step
              ? `正在${formatTaskStage(progress.current_step as TaskStage)}...`
              : '等待开始处理...'
          }
          description="请保持页面打开，处理完成后会自动跳转"
          type="info"
          showIcon
          className="mt-6"
        />
      </Card>
    </div>
  );
};

export default ProcessingProgress;
