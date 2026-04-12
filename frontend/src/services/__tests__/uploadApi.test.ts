import { describe, expect, it } from 'vitest';

import { buildProcessStreamUrl } from '../uploadApi';

describe('buildProcessStreamUrl', () => {
  it('forces local stream urls onto IPv4 loopback', () => {
    expect(
      buildProcessStreamUrl('task-123', 'token-abc', 'http://localhost:8000/api/v1', '127.0.0.1')
    ).toBe('http://127.0.0.1:8000/api/v1/process/task-123/stream?token=token-abc');
  });

  it('keeps remote stream urls unchanged', () => {
    expect(
      buildProcessStreamUrl('task-123', 'token-abc', 'https://api.example.com/v1', '127.0.0.1')
    ).toBe('https://api.example.com/v1/process/task-123/stream?token=token-abc');
  });
});
