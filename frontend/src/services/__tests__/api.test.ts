import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from '../api';

describe('resolveApiBaseUrl', () => {
  it('forces local development API urls onto IPv4 loopback', () => {
    expect(
      resolveApiBaseUrl('http://localhost:8000/api/v1', '127.0.0.1')
    ).toBe('http://127.0.0.1:8000/api/v1');

    expect(
      resolveApiBaseUrl('http://localhost:8000/api/v1/', 'localhost')
    ).toBe('http://127.0.0.1:8000/api/v1');
  });

  it('keeps non-local api urls unchanged', () => {
    expect(
      resolveApiBaseUrl('https://api.example.com/v1', '127.0.0.1')
    ).toBe('https://api.example.com/v1');
  });
});
