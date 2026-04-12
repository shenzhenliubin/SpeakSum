import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/settingsApi';
import type { ModelConfig, ModelConfigTestPayload } from '@/types';

const MODEL_CONFIGS_KEY = 'modelConfigs';

export const useModelConfigs = () => {
  return useQuery<ModelConfig[]>({
    queryKey: [MODEL_CONFIGS_KEY],
    queryFn: () => settingsApi.getModelConfigs(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateModelConfigs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configs: ModelConfig[]) => settingsApi.updateModelConfigs(configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODEL_CONFIGS_KEY] });
    },
  });
};

export const useTestModelConfig = () => {
  return useMutation({
    mutationFn: (payload: ModelConfigTestPayload) => settingsApi.testModelConfig(payload),
  });
};
