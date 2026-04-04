// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

// Meeting types - aligned with backend OpenAPI
export type MeetingStatus = 'processing' | 'completed' | 'error';

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;  // Changed from 'date' to match backend
  duration?: string;
  participants: string[];
  source_file: string;   // Changed from 'sourceFile' to match backend
  file_size: number;     // Changed from 'fileSize' to match backend
  status: MeetingStatus;
  speech_count: number;  // Changed from 'speechCount' to match backend
  topic_count: number;   // Added to match backend
  created_at: string;    // Changed from 'createdAt' to match backend
}

// Speech types - aligned with backend OpenAPI
export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface Speech {
  id: string;
  meeting_id: string;      // Changed from 'meetingId' to match backend
  timestamp: string;
  speaker: string;
  raw_text: string;        // Changed from 'rawText' to match backend
  cleaned_text: string;    // Changed from 'cleanedText' to match backend
  key_quotes: string[];    // Changed from 'keyQuotes' to match backend
  topics: string[];
  sentiment: Sentiment;
  word_count: number;      // Changed from 'wordCount' to match backend
  created_at: string;      // Added to match backend
}

// Topic types - aligned with backend OpenAPI (TopicNode)
export interface Topic {
  id: string;
  name: string;
  count: number;              // Changed from 'speechCount' to match backend
  meeting_count: number;      // Changed from 'meetingCount' to match backend
  first_appearance: string;   // Changed from 'firstAppearance' to match backend
  last_appearance: string;    // Changed from 'lastAppearance' to match backend
  x?: number;                 // Added: graph layout X coordinate
  y?: number;                 // Added: graph layout Y coordinate
  // D3 simulation properties (frontend only)
  fx?: number | null;
  fy?: number | null;
  // Frontend-only fields for graph visualization (not in backend schema)
  description?: string;
  relevance?: number;
  meeting_ids?: string[];
}

// Graph types - aligned with backend OpenAPI
export interface GraphEdge {
  source: string;        // Source topic ID
  target: string;        // Target topic ID
  strength: number;      // Connection strength 0-1
  co_occurrence: number; // Co-occurrence count
}

export interface GraphLayout {
  nodes: Topic[];        // Backend returns TopicNode array
  edges: GraphEdge[];
  layout_version: string; // Changed from 'version' to match backend
}

// Processing task types - aligned with backend OpenAPI (TaskStatus)
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';  // Changed 'error' to 'failed' to match backend

export type TaskStage = 'parsing' | 'extracting' | 'cleaning' | 'tagging' | 'building_graph';

export interface ProcessingTask {
  task_id: string;        // Changed from 'id' to match backend
  meeting_id: string;     // Changed from 'meetingId' to match backend
  status: TaskStatus;
  progress: number;       // Changed from 'percent' to match backend
  current_step?: string;  // Changed from 'stage' to match backend
  error_message?: string | null;  // Changed from 'errorMessage' to match backend
  created_at: string;     // Changed from 'createdAt' to match backend
  updated_at: string;     // Changed from 'updatedAt' to match backend
}

export interface ProgressEvent {
  task_id: string;        // Added to match backend
  meeting_id: string;     // Added to match backend
  status: TaskStatus;
  progress: number;       // Changed from 'percent' to match backend
  current_step?: string;  // Changed from 'stage' to match backend
  error_message?: string;
}

// Model config types - aligned with backend OpenAPI
export type ModelProvider = 'kimi' | 'openai' | 'claude' | 'ollama';

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

// Filter types - aligned with backend query parameters
export interface MeetingFilters {
  q?: string;             // Changed from 'searchQuery' to match backend
  status?: MeetingStatus;
  sort_by?: 'created_at' | 'meeting_date' | 'title';  // Added to match backend
  sort_order?: 'asc' | 'desc';  // Added to match backend
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
