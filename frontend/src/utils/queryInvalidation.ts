import type { QueryClient } from '@tanstack/react-query';

export const invalidateProcessedMeetingQueries = (queryClient: QueryClient, meetingId?: string) => {
  void queryClient.invalidateQueries({ queryKey: ['meetings'] });
  void queryClient.invalidateQueries({ queryKey: ['graph'] });

  if (meetingId) {
    void queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
  }
};

export const invalidateProcessedContentQueries = (queryClient: QueryClient, contentId?: string) => {
  void queryClient.invalidateQueries({ queryKey: ['contents'] });
  void queryClient.invalidateQueries({ queryKey: ['graph'] });

  if (contentId) {
    void queryClient.invalidateQueries({ queryKey: ['content', contentId] });
  }
};
