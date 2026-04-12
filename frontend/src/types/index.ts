// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export type ContentStatus = 'pending' | 'processing' | 'completed' | 'error' | 'failed' | 'ignored';
export type SourceType = 'meeting_minutes' | 'other_text';

export interface Quote {
  id: string;
  content_id: string;
  sequence_number: number;
  text: string;
  domain_ids: string[];
  created_at: string;
  updated_at?: string;
}

export interface Content {
  id: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  content_date: string | null;
  source_file_name?: string | null;
  source_file_path?: string | null;
  source_file_size?: number | null;
  file_type?: string | null;
  status: ContentStatus;
  ignored_reason?: string | null;
  error_message?: string | null;
  summary_text?: string | null;
  quotes: Quote[];
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface Domain {
  id: string;
  display_name: string;
  description?: string | null;
  is_system_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  x?: number;
  y?: number;
  size?: number | null;
  item_count?: number;
  fx?: number | null;
  fy?: number | null;
}

// Graph types - aligned with backend OpenAPI
export interface GraphEdge {
  source: string;
  target: string;
  type?: string;
  strength?: number;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout_version: string; // Changed from 'version' to match backend
}

export interface GraphDomainDetail {
  domain: Domain;
  quotes: Array<{
    id: string;
    content_id: string;
    text: string;
    domain_ids: string[];
  }>;
  total: number;
}

// Processing task types - aligned with backend OpenAPI (TaskStatus)
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'ignored';

export type TaskStage =
  | 'queued'
  | 'pending'
  | 'parsing'
  | 'identifying_speaker'
  | 'summarizing'
  | 'extracting_quotes'
  | 'building_graph'
  | 'understanding_context'
  | 'extracting_viewpoints'
  | 'extracting'
  | 'cleaning'
  | 'tagging'
  | 'ignored'
  | 'error';

export interface ProcessingTask {
  task_id: string;        // Changed from 'id' to match backend
  content_id?: string;
  meeting_id?: string;
  status: TaskStatus;
  progress: number;       // Changed from 'percent' to match backend
  current_step?: string;  // Changed from 'stage' to match backend
  message?: string | null;
  error_message?: string | null;  // Changed from 'errorMessage' to match backend
  created_at: string;     // Changed from 'createdAt' to match backend
  updated_at: string;     // Changed from 'updatedAt' to match backend
}

export interface ProgressEvent {
  task_id: string;        // Added to match backend
  content_id?: string;
  meeting_id?: string;
  status: TaskStatus;
  progress: number;       // Changed from 'percent' to match backend
  current_step?: string;  // Changed from 'stage' to match backend
  message?: string | null;
  error_message?: string | null;
}

// Model config types - aligned with backend OpenAPI
export type ModelProvider = 'kimi' | 'siliconflow' | 'openai' | 'claude' | 'ollama' | 'custom';

export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  name: string;
  has_api_key: boolean;         // Whether an API key is configured (never exposed)
  base_url: string | null;      // Changed from 'baseUrl' to match backend
  default_model: string;        // Changed from 'defaultModel' to match backend
  is_default: boolean;          // Changed from 'isDefault' to match backend
  is_enabled: boolean;          // Changed from 'isEnabled' to match backend
  created_at: string;           // Added to match backend
}

export interface ModelConfigTestPayload {
  config_id?: string;
  provider: ModelProvider;
  api_key?: string;
  base_url: string | null;
  default_model: string;
}

export interface ModelConfigTestResult {
  success: boolean;
  message: string;
  provider: ModelProvider;
  model: string;
}

// Speaker identity types - aligned with backend
export interface SpeakerIdentity {
  id: string;
  user_id?: string;
  display_name: string;         // Backend field
  aliases?: string[];
  color?: string | null;
  avatar_url?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

// API types - aligned with backend
export interface ApiResponse<T> {
  success?: boolean;  // Made optional as some endpoints don't return this
  data?: T;
  error?: string;
  message?: string;
}

// Paginated response aligned with backend OpenAPI
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;      // Changed from 'pageSize' to match backend
  total_pages: number;    // Changed from 'totalPages' to match backend
}

// UI types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  read?: boolean;
}

export type EmptyStateType = 'noData' | 'noSearchResult' | 'noPermission' | 'error' | 'emptyGraph';
