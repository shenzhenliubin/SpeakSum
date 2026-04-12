import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatDate,
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  formatNumber,
  formatStatus,
  formatTaskStage,
} from '../formatters';

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should handle decimal places', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2048)).toBe('2 KB');
  });
});

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-04-01');
    expect(formatDate(date)).toMatch(/2024/);
    expect(formatDate(date)).toMatch(/4/);
  });

  it('should handle string dates', () => {
    expect(formatDate('2024-04-01T10:30:00')).toMatch(/2024/);
  });

  it('should handle missing dates', () => {
    expect(formatDate(undefined)).toBe('未识别日期');
    expect(formatDate(null)).toBe('未识别日期');
  });
});

describe('formatDateTime', () => {
  it('should format date and time correctly', () => {
    const date = new Date('2024-04-01T10:30:00');
    const result = formatDateTime(date);
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/10/);
  });
});

describe('formatDuration', () => {
  it('should format seconds correctly', () => {
    expect(formatDuration(30)).toBe('30秒');
    expect(formatDuration(90)).toBe('1分钟');
    expect(formatDuration(3600)).toBe('1小时');
    expect(formatDuration(3660)).toBe('1小时 1分钟');
  });

  it('should handle edge cases', () => {
    expect(formatDuration(0)).toBe('0秒');
  });
});

describe('formatRelativeTime', () => {
  it('should format relative time for past dates', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(yesterday)).toBe('昨天');
  });

  it('should format relative time for recent dates', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    expect(formatRelativeTime(oneHourAgo)).toContain('小时前');
  });

  it('should handle string dates', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(yesterday.toISOString())).toBe('昨天');
  });

  it('should handle missing dates', () => {
    expect(formatRelativeTime(undefined)).toBe('日期未知');
    expect(formatRelativeTime(null)).toBe('日期未知');
  });
});

describe('formatNumber', () => {
  it('should format numbers correctly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});

describe('formatStatus', () => {
  it('should format status correctly', () => {
    expect(formatStatus('pending')).toBe('待处理');
    expect(formatStatus('processing')).toBe('处理中');
    expect(formatStatus('completed')).toBe('已完成');
    expect(formatStatus('error')).toBe('出错');
  });
});

describe('formatTaskStage', () => {
  it('should format queued stages correctly', () => {
    expect(formatTaskStage('queued')).toBe('排队等待');
    expect(formatTaskStage('pending')).toBe('等待处理');
  });
});
