import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Progress, Steps, Alert, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import { useProcessing } from '@/hooks/useProcessing';
import { LoadingState } from '@/components/common/LoadingState';
import { formatTaskStage } from '@/utils/formatters';
import type { TaskStage } from '@/types';

const stages: TaskStage[] = ['parsing', 'identifying_speaker', 'summarizing', 'extracting_quotes', 'building_graph'];

const stageDescriptions: Record<TaskStage, string> = {
  queued: '前序文件处理中，当前文件排队等待中',
  pending: '任务已创建，等待工作进程开始处理',
  parsing: '读取并解析源文件内容',
  identifying_speaker: '会议纪要中提取刘彬发言',
  summarizing: '生成客观的发言总结',
  extracting_quotes: '提炼思想金句并归类领域',
  building_graph: '更新领域知识图谱',
  ignored: '未检测到刘彬发言，因此未生成记录',
  error: '处理失败',
  understanding_context: '理解背景信息',
  extracting_viewpoints: '提炼观点',
  extracting: '提取发言',
  cleaning: '清理口语',
  tagging: '提取话题',
};

export const ProcessingProgress: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState(0);

  const { progress, isLoading, isComplete, isIgnored, isError, isStuck, errorMessage } = useProcessing(taskId);

  useEffect(() => {
    if (!isComplete && !isIgnored && !isError) {
      const timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isComplete, isIgnored, isError]);

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
              内容已成功处理，发言总结、思想金句和领域图谱都已生成
            </p>
            <Space>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => navigate(progress?.content_id ? `/timeline/${progress.content_id}` : '/timeline')}
              >
                查看内容
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

  if (isIgnored) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <InfoCircleOutlined className="text-6xl text-text-secondary mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">已忽略</h2>
            <p className="text-text-secondary mb-6">
              {progress?.message || '未检测到刘彬发言，因此未生成记录'}
            </p>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/upload')}>
                返回上传
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

        <Steps
          direction="vertical"
          current={getCurrentStep()}
          items={stages.map((stage) => ({
            title: formatTaskStage(stage),
            description: stageDescriptions[stage],
          }))}
        />

        {isStuck && (
          <Alert
            message="处理时间较长"
            description="任务处理时间超过预期。请确认 Celery 工作进程是否正常运行。"
            type="warning"
            showIcon
            className="mt-4"
            action={
              <Button size="small" onClick={() => window.location.reload()}>
                刷新
              </Button>
            }
          />
        )}

        <Alert
          message={
            progress?.current_step
              ? `正在${formatTaskStage(progress.current_step as TaskStage)}...`
              : '等待开始处理...'
          }
          description={progress?.message || '请保持页面打开，处理完成后会自动更新'}
          type="info"
          showIcon
          className="mt-6"
        />
      </Card>
    </div>
  );
};

export default ProcessingProgress;
