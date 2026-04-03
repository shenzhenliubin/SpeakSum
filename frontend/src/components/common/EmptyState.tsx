import { Button } from 'antd';
import type { EmptyStateType } from '@/types';
import { EMPTY_STATE_CONFIG } from '@/utils/constants';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = '',
}) => {
  const config = EMPTY_STATE_CONFIG[type];

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="text-6xl mb-4">{icon || config.icon}</div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title || config.title}
      </h3>
      <p className="text-text-secondary mb-6 max-w-md">
        {description || config.description}
      </p>
      <div className="flex gap-3">
        {action && (
          <Button type="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {!action && config.actionLabel && type === 'noData' && (
          <Button type="primary" onClick={() => window.location.href = '/upload'}>
            {config.actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
