import { apiClient } from './api';
import type { ModelConfig, ModelProvider } from '@/types';

// Model config aligned with backend OpenAPI
interface ModelConfigRequest {
  provider: ModelProvider;
  name: string;
  api_key?: string;
  base_url?: string;
  default_model: string;
  is_default?: boolean;
  is_enabled?: boolean;
}

// Settings update request aligned with backend
interface SettingsUpdateRequest {
  action: 'create' | 'update' | 'delete';
  config_id?: string;
  config?: ModelConfigRequest;
}

// Settings response aligned with backend
interface SettingsResponse {
  configs: ModelConfig[];
  default_config_id: string | null;
}

export const settingsApi = {
  // Get model configurations
  // GET /api/v1/settings/model
  // Returns: { configs: ModelConfig[], default_config_id: string | null }
  getModelConfigs: (): Promise<SettingsResponse> =>
    apiClient.get('/settings/model'),

  // Update model configuration (create/update/delete)
  // PUT /api/v1/settings/model
  updateModelConfig: (data: SettingsUpdateRequest): Promise<{ success: boolean }> =>
    apiClient.put('/settings/model', data),

  // Note: Speaker identity endpoints are not defined in OpenAPI yet
  // These are placeholders for future implementation
  getIdentities: (): Promise<{ id: string; name: string }[]> =>
    Promise.resolve([]),

  createIdentity: (_data: { name: string }): Promise<{ id: string; name: string }> =>
    Promise.resolve({ id: '', name: '' }),

  deleteIdentity: (_id: string): Promise<void> =>
    Promise.resolve(),
};
