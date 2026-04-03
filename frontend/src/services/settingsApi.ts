import { apiClient } from './api';
import type { ModelConfig, SpeakerIdentity } from '@/types';

interface CreateModelConfigRequest {
  provider: string;
  name: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
}

interface UpdateModelConfigRequest {
  name?: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
}

interface CreateIdentityRequest {
  name: string;
}

export const settingsApi = {
  // Model configuration
  getModelConfigs: (): Promise<ModelConfig[]> =>
    apiClient.get('/settings/model'),

  getModelConfig: (id: string): Promise<ModelConfig> =>
    apiClient.get(`/settings/model/${id}`),

  createModelConfig: (data: CreateModelConfigRequest): Promise<ModelConfig> =>
    apiClient.post('/settings/model', data),

  updateModelConfig: (id: string, data: UpdateModelConfigRequest): Promise<ModelConfig> =>
    apiClient.patch(`/settings/model/${id}`, data),

  deleteModelConfig: (id: string): Promise<void> =>
    apiClient.delete(`/settings/model/${id}`),

  setDefaultModel: (id: string): Promise<void> =>
    apiClient.patch(`/settings/model/${id}/default`, {}),

  // Speaker identities
  getIdentities: (): Promise<SpeakerIdentity[]> =>
    apiClient.get('/identities'),

  createIdentity: (data: CreateIdentityRequest): Promise<SpeakerIdentity> =>
    apiClient.post('/identities', data),

  updateIdentity: (id: string, data: Partial<CreateIdentityRequest>): Promise<SpeakerIdentity> =>
    apiClient.patch(`/identities/${id}`, data),

  deleteIdentity: (id: string): Promise<void> =>
    apiClient.delete(`/identities/${id}`),

  setDefaultIdentity: (id: string): Promise<void> =>
    apiClient.patch(`/identities/${id}/default`, {}),
};
