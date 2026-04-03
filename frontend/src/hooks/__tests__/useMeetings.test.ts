import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMeetings, useMeeting } from '../useMeetings';
import React from 'react';

describe('useMeetings', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        enabled: false, // Disable automatic fetching for tests
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return initial state', () => {
    const { result } = renderHook(
      () => useMeetings({ filters: {}, page: 1, page_size: 10 }),
      { wrapper }
    );

    // Hook returns a query object with its own state
    expect(result.current).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('should return loading state for single meeting', () => {
    const { result } = renderHook(() => useMeeting('1'), { wrapper });

    // Query should be in pending state initially
    expect(result.current.isPending).toBeTruthy();
  });

  it('should not fetch when id is undefined', () => {
    const { result } = renderHook(() => useMeeting(undefined), { wrapper });

    // When id is undefined, query is disabled
    expect(result.current.isPending || result.current.isLoading).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});
