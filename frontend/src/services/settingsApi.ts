import { apiClient } from './api';
import type {
  ModelConfig,
  ModelConfigTestPayload,
  ModelConfigTestResult,
  SpeakerIdentity,
} from '@/types';

// Backend envelope for speaker identities
interface Envelope<T> {
  success: boolean;
  data: T;
  meta: unknown;
  error: unknown;
}

export const settingsApi = {
  // Get model configurations
  // GET /api/v1/settings/model
  getModelConfigs: (): Promise<ModelConfig[]> =>
    apiClient.get('/settings/model'),

  // Update model configurations (full replacement)
  // PUT /api/v1/settings/model
  // Note: api_key is only sent for creation/update, never received back
  updateModelConfigs: (configs: ModelConfig[]): Promise<ModelConfig[]> => {
    const body = configs.map((c) => ({
      provider: c.provider,
      name: c.name,
      api_key: (c as unknown as { api_key?: string }).api_key,
      base_url: c.base_url,
      default_model: c.default_model,
      is_default: c.is_default,
      is_enabled: c.is_enabled,
    }));
    return apiClient.put('/settings/model', body);
  },

  testModelConfig: (payload: ModelConfigTestPayload): Promise<ModelConfigTestResult> =>
    apiClient.post('/settings/model/test', payload),

  // Speaker identities
  getIdentities: (): Promise<SpeakerIdentity[]> =>
    apiClient.get<Envelope<SpeakerIdentity[]>>('/speaker-identities').then((res) => res.data),

  createIdentity: (data: Omit<SpeakerIdentity, 'id' | 'created_at' | 'updated_at'>): Promise<SpeakerIdentity> =>
    apiClient.post<Envelope<SpeakerIdentity>>('/speaker-identities', data).then((res) => res.data),

  updateIdentity: (id: string, data: Omit<SpeakerIdentity, 'id' | 'created_at' | 'updated_at'>): Promise<SpeakerIdentity> =>
    apiClient.put<Envelope<SpeakerIdentity>>(`/speaker-identities/${id}`, data).then((res) => res.data),

  deleteIdentity: (id: string): Promise<void> =>
    apiClient.delete(`/speaker-identities/${id}`),
};
