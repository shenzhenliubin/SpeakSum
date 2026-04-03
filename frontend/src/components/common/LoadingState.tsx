import { Skeleton, Spin } from 'antd';

interface LoadingStateProps {
  type?: 'skeleton' | 'spinner' | 'card';
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  rows = 3,
  className = '',
}) => {
  if (type === 'skeleton') {
    return (
      <div className={`p-6 ${className}`}>
        <Skeleton active paragraph={{ rows }} />
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`p-6 ${className}`}>
        <Skeleton active paragraph={{ rows }} title={{ width: '40%' }} />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <Spin size="large" />
    </div>
  );
};
