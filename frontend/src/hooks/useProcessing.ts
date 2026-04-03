import { useQuery } from '@tanstack/react-query';
import { uploadApi } from '@/services/uploadApi';
import type { ProcessingTask, ProgressEvent } from '@/types';
import { useEffect, useRef, useCallback, useState } from 'react';

const PROCESSING_KEY = 'processing';

// Poll processing task status
export const useProcessingTask = (taskId: string | undefined) => {
  return useQuery<ProcessingTask>({
    queryKey: [PROCESSING_KEY, taskId],
    queryFn: () => uploadApi.getTaskStatus(taskId!),
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when completed or error
      if (data?.status === 'completed' || data?.status === 'error') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    enabled: !!taskId,
  });
};

// SSE for real-time progress updates
export const useProcessingSSE = (
  taskId: string | undefined,
  onProgress: (data: ProgressEvent) => void
) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    if (!taskId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = uploadApi.createSSEConnection(
        taskId,
        (data) => {
          onProgress(data);
          if (data.status === 'completed' || data.status === 'error') {
            setIsConnected(false);
            eventSourceRef.current?.close();
          }
        },
        () => {
          setError(new Error('SSE connection error'));
          setIsConnected(false);
        },
        () => {
          setIsConnected(false);
        }
      );

      eventSourceRef.current = eventSource;
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setIsConnected(false);
    }
  }, [taskId, onProgress]);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState during render
    const timeoutId = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected,
    error,
    reconnect: connect,
  };
};

// Combined hook for processing with fallback
export const useProcessing = (
  taskId: string | undefined,
  onProgress?: (data: ProgressEvent) => void
) => {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);

  // Try SSE first
  const { isConnected, error: sseError } = useProcessingSSE(taskId, (data) => {
    setProgress(data);
    onProgress?.(data);
  });

  // Fallback to polling if SSE fails
  const { data: pollData } = useProcessingTask(
    !isConnected && sseError ? taskId : undefined
  );

  useEffect(() => {
    if (pollData && !isConnected) {
      const progressData: ProgressEvent = {
        status: pollData.status,
        stage: pollData.stage,
        percent: pollData.percent,
        message: pollData.errorMessage,
      };
      // Use setTimeout to avoid synchronous setState during render
      const timeoutId = setTimeout(() => {
        setProgress(progressData);
        onProgress?.(progressData);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [pollData, isConnected, onProgress]);

  return {
    progress,
    isConnected,
    isLoading: progress?.status === 'processing' || progress?.status === 'pending',
    isComplete: progress?.status === 'completed',
    isError: progress?.status === 'error',
    errorMessage: progress?.message,
  };
};
