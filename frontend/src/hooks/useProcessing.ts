import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { uploadApi } from '@/services/uploadApi';
import type { ProgressEvent } from '@/types';
import { invalidateProcessedContentQueries } from '@/utils/queryInvalidation';

const STUCK_TIMEOUT_MS = 60_000;
const ERROR_TIMEOUT_MS = 120_000;
const CONNECTION_ERROR_MESSAGE = '进度连接已断开，请刷新后重试';

export const useProcessing = (taskId: string | undefined) => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(taskId));
  const [now, setNow] = useState(Date.now());
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!taskId) {
      setProgress(null);
      setIsInitializing(false);
      return;
    }

    setProgress(null);
    setIsInitializing(true);
    lastUpdateRef.current = Date.now();

    const eventSource = uploadApi.createSSEConnection(
      taskId,
      (event) => {
        lastUpdateRef.current = Date.now();
        setProgress(event);
        setIsInitializing(false);
        if (event.status === 'completed' || event.status === 'ignored' || event.status === 'failed') {
          invalidateProcessedContentQueries(queryClient, event.content_id || undefined);
        }
      },
      () => {
        setIsInitializing(false);
        setProgress((current) => {
          if (current?.status === 'completed' || current?.status === 'failed' || current?.status === 'ignored') {
            return current;
          }
          return {
            task_id: taskId,
            content_id: current?.content_id || '',
            status: 'failed',
            progress: current?.progress || 0,
            current_step: current?.current_step || 'error',
            message: current?.message || null,
            error_message: current?.error_message || CONNECTION_ERROR_MESSAGE,
          };
        });
      },
    );

    return () => eventSource.close();
  }, [queryClient, taskId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = now - lastUpdateRef.current;
  const isStuck = !progress?.error_message
    && progress?.status === 'pending'
    && elapsed > STUCK_TIMEOUT_MS;
  const isTimedOut = !progress?.error_message
    && (progress?.status === 'pending' || progress?.status === 'processing')
    && elapsed > ERROR_TIMEOUT_MS;

  return {
    progress,
    isLoading: !!taskId && (isInitializing || progress?.status === 'processing' || progress?.status === 'pending'),
    isComplete: progress?.status === 'completed',
    isIgnored: progress?.status === 'ignored',
    isError: progress?.status === 'failed' || isTimedOut,
    isStuck,
    errorMessage: isTimedOut
      ? '处理超时，请检查 Celery 工作进程是否正常运行，然后重试'
      : progress?.error_message,
  };
};
