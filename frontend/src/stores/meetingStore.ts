import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Meeting, ViewMode } from '@/types';

interface MeetingState {
  // State
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  selectedSpeaker: string;
  viewMode: ViewMode;
  filters: {
    q?: string;           // Changed from 'searchQuery' to match backend
    status?: 'processing' | 'completed' | 'error';
    sort_by?: 'created_at' | 'meeting_date' | 'title';
    sort_order?: 'asc' | 'desc';
  };
  isLoading: boolean;

  // Actions
  setMeetings: (meetings: Meeting[]) => void;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  setSelectedSpeaker: (speaker: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<MeetingState['filters']>) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  removeMeeting: (id: string) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useMeetingStore = create<MeetingState>()(
  immer((set) => ({
    meetings: [],
    currentMeeting: null,
    selectedSpeaker: '我',
    viewMode: 'timeline',
    filters: {
      q: '',
      status: undefined,
      sort_by: 'created_at',
      sort_order: 'desc',
    },
    isLoading: false,

    setMeetings: (meetings) =>
      set((state) => {
        state.meetings = meetings;
      }),

    setCurrentMeeting: (meeting) =>
      set((state) => {
        state.currentMeeting = meeting;
      }),

    setSelectedSpeaker: (speaker) =>
      set((state) => {
        state.selectedSpeaker = speaker;
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    setFilters: (filters) =>
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),

    addMeeting: (meeting) =>
      set((state) => {
        state.meetings.unshift(meeting);
      }),

    updateMeeting: (id, updates) =>
      set((state) => {
        const index = state.meetings.findIndex((m: Meeting) => m.id === id);
        if (index !== -1) {
          state.meetings[index] = { ...state.meetings[index], ...updates };
        }
        if (state.currentMeeting?.id === id) {
          state.currentMeeting = { ...state.currentMeeting, ...updates };
        }
      }),

    removeMeeting: (id) =>
      set((state) => {
        state.meetings = state.meetings.filter((m: Meeting) => m.id !== id);
        if (state.currentMeeting?.id === id) {
          state.currentMeeting = null;
        }
      }),

    setIsLoading: (isLoading) =>
      set((state) => {
        state.isLoading = isLoading;
      }),
  }))
);
