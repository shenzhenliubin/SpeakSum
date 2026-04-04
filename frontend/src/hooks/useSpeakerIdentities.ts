import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/settingsApi';
import type { SpeakerIdentity } from '@/types';

const SPEAKER_IDENTITIES_KEY = 'speakerIdentities';

export const useSpeakerIdentities = () => {
  return useQuery<SpeakerIdentity[]>({
    queryKey: [SPEAKER_IDENTITIES_KEY],
    queryFn: () => settingsApi.getIdentities(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSpeakerIdentity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<SpeakerIdentity, 'id' | 'created_at' | 'updated_at'>) =>
      settingsApi.createIdentity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPEAKER_IDENTITIES_KEY] });
    },
  });
};

export const useUpdateSpeakerIdentity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<SpeakerIdentity, 'id' | 'created_at' | 'updated_at'> }) =>
      settingsApi.updateIdentity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPEAKER_IDENTITIES_KEY] });
    },
  });
};

export const useDeleteSpeakerIdentity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteIdentity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPEAKER_IDENTITIES_KEY] });
    },
  });
};
