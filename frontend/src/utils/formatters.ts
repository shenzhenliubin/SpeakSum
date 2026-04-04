import dayjs from 'dayjs';

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date to locale string (YYYY年MM月DD日)
 */
export function formatDate(date: string | Date): string {
  return dayjs(date).format('YYYY年MM月DD日');
}

/**
 * Format datetime to locale string
 */
export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('YYYY年MM月DD日 HH:mm');
}

/**
 * Format time from timestamp string (HH:MM:SS)
 */
export function formatTime(timestamp: string): string {
  // Handle [HH:MM:SS] format from meeting transcripts
  const match = timestamp.match(/\[(\d{2}:\d{2}:\d{2})\]/);
  if (match) {
    return match[1];
  }
  return timestamp;
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分钟`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}小时${minutes > 0 ? ` ${minutes}分钟` : ''}`;
}

/**
 * Format meeting duration from start and end time
 */
export function formatMeetingDuration(startTime: string, endTime?: string): string {
  if (!endTime) return '进行中';

  const start = dayjs(startTime);
  const end = dayjs(endTime);
  const diffMinutes = end.diff(start, 'minute');

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}小时${minutes > 0 ? ` ${minutes}分钟` : ''}`;
}

/**
 * Format relative time (e.g., "3天前")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = dayjs();
  const target = dayjs(date);
  const diffDays = now.diff(target, 'day');

  if (diffDays === 0) {
    const diffHours = now.diff(target, 'hour');
    if (diffHours === 0) {
      const diffMinutes = now.diff(target, 'minute');
      return diffMinutes < 5 ? '刚刚' : `${diffMinutes}分钟前`;
    }
    return `${diffHours}小时前`;
  }
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return formatDate(date);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format number with locale
 */
export function formatNumber(num: number | undefined | null): string {
  if (num == null) return '0';
  return num.toLocaleString('zh-CN');
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * Format task stage to Chinese
 */
export function formatTaskStage(stage: string): string {
  const stageMap: Record<string, string> = {
    parsing: '解析文件',
    extracting: '提取发言',
    cleaning: '清理口语',
    tagging: '提取话题',
    building_graph: '构建图谱',
  };
  return stageMap[stage] || stage;
}

/**
 * Format status to Chinese
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    error: '出错',
  };
  return statusMap[status] || status;
}

/**
 * Get color for sentiment
 */
export function getSentimentColor(sentiment: string): string {
  const colorMap: Record<string, string> = {
    positive: '#6f8465',
    negative: '#c8734f',
    neutral: '#74614f',
    mixed: '#d7b082',
  };
  return colorMap[sentiment] || '#74614f';
}

/**
 * Format sentiment to Chinese
 */
export function formatSentiment(sentiment: string): string {
  const sentimentMap: Record<string, string> = {
    positive: '积极',
    negative: '消极',
    neutral: '中性',
    mixed: '混合',
  };
  return sentimentMap[sentiment] || sentiment;
}
