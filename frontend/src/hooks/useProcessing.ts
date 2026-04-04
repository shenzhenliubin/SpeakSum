import { useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { uploadApi } from '@/services/uploadApi';
import type { ProgressEvent } from '@/types';

const PROCESSING_KEY = 'processing';
const STUCK_TIMEOUT_MS = 60_000; // 60s - show warning
const ERROR_TIMEOUT_MS = 120_000; // 120s - treat as error

// Polling hook - polls every 2s until task is done, derives state from query data
export const useProcessing = (taskId: string | undefined) => {
  const pollingStartRef = useRef<number>(Date.now());
  const lastProgressRef = useRef<number>(0);
  const stuckNotifiedRef = useRef<boolean>(false);

  // Reset tracking when taskId changes
  useEffect(() => {
    if (taskId) {
      pollingStartRef.current = Date.now();
      lastProgressRef.current = 0;
      stuckNotifiedRef.current = false;
    }
  }, [taskId]);

  const { data: pollData, isLoading } = useQuery({
    queryKey: [PROCESSING_KEY, taskId],
    queryFn: () => uploadApi.getTaskStatus(taskId!),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000;
    },
    enabled: !!taskId,
  });

  const progress = useMemo<ProgressEvent | null>(() => {
    if (!pollData) return null;
    // Track progress changes to detect stuck tasks
    if (pollData.progress > lastProgressRef.current) {
      lastProgressRef.current = pollData.progress;
      pollingStartRef.current = Date.now(); // Reset timer on progress
    }
    return {
      task_id: pollData.task_id,
      meeting_id: pollData.meeting_id,
      status: pollData.status,
      progress: pollData.progress,
      current_step: pollData.current_step,
      error_message: pollData.error_message || undefined,
    };
  }, [pollData]);

  // Detect stuck tasks
  const elapsed = Date.now() - pollingStartRef.current;
  const isStuck = !progress?.error_message
    && progress?.status === 'pending'
    && elapsed > STUCK_TIMEOUT_MS
    && !stuckNotifiedRef.current;
  const isTimedOut = !progress?.error_message
    && (progress?.status === 'pending' || progress?.status === 'processing')
    && elapsed > ERROR_TIMEOUT_MS
    && progress.progress === lastProgressRef.current;

  return {
    progress,
    isLoading: isLoading || progress?.status === 'processing' || progress?.status === 'pending',
    isComplete: progress?.status === 'completed',
    isError: progress?.status === 'failed' || isTimedOut,
    isStuck,
    errorMessage: isTimedOut
      ? '处理超时，请检查 Celery 工作进程是否正常运行，然后重试'
      : progress?.error_message,
  };
};
