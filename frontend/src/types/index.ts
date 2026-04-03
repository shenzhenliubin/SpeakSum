// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

// Meeting types
export type MeetingStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration?: string;
  participants: string[];
  sourceFile: string;
  fileSize: number;
  status: MeetingStatus;
  speechCount: number;
  mySpeechCount: number;
  createdAt: string;
}

// Speech types
export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface Speech {
  id: string;
  meetingId: string;
  timestamp: string;
  speaker: string;
  rawText: string;
  cleanedText: string;
  keyQuotes: string[];
  topics: string[];
  sentiment: Sentiment;
  wordCount: number;
}

// Topic types
export interface Topic {
  id: string;
  name: string;
  description?: string;
  relevance?: number;
  meetingIds?: string[];
  speechCount: number;
  meetingCount: number;
  firstAppearance: string;
  lastAppearance: string;
  relatedTopics: string[];
}

// Graph types
export interface GraphNode {
  id: string;
  type: 'topic' | 'speech';
  label: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  size: number;
  data: Topic | Speech;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  type: 'association' | 'temporal';
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: number;
  updatedAt: string;
}

// Processing task types
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'error';
export type TaskStage = 'parsing' | 'extracting' | 'cleaning' | 'tagging' | 'building_graph';

export interface ProcessingTask {
  id: string;
  meetingId: string;
  status: TaskStatus;
  stage: TaskStage;
  percent: number;
  currentChunk?: number;
  totalChunks?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEvent {
  status: TaskStatus;
  stage: TaskStage;
  percent: number;
  message?: string;
}

// Model config types
export type ModelProvider = 'kimi' | 'openai' | 'claude' | 'ollama' | 'custom';

export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  name: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  isDefault: boolean;
  isEnabled: boolean;
}

// Speaker identity types
export interface SpeakerIdentity {
  id: string;
  name: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
}

// API types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface MeetingFilters {
  searchQuery?: string;
  dateRange?: [Date, Date] | null;
  topics?: string[];
  status?: MeetingStatus;
}

export interface GraphFilters {
  timeRange?: [Date, Date] | null;
  topics?: string[];
  minAssociationStrength?: number;
}

// UI types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  read?: boolean;
}

export type ViewMode = 'timeline' | 'detail';

export type EmptyStateType = 'noData' | 'noSearchResult' | 'noPermission' | 'error' | 'emptyGraph';
