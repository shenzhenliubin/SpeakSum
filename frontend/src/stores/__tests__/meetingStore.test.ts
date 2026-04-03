import { describe, it, expect, beforeEach } from 'vitest';
import { useMeetingStore } from '../meetingStore';
import type { Meeting } from '@/types';

describe('meetingStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useMeetingStore.getState();
    store.setMeetings([]);
    store.setCurrentMeeting(null);
    store.setFilters({ searchQuery: '', dateRange: null, topics: [], status: undefined });
    store.setSelectedSpeaker('我');
    store.setViewMode('timeline');
  });

  it('should have correct initial state', () => {
    const state = useMeetingStore.getState();
    expect(state.meetings).toEqual([]);
    expect(state.currentMeeting).toBeNull();
    expect(state.selectedSpeaker).toBe('我');
    expect(state.viewMode).toBe('timeline');
    expect(state.filters).toEqual({
      searchQuery: '',
      dateRange: null,
      topics: [],
      status: undefined,
    });
    expect(state.isLoading).toBe(false);
  });

  it('should set meetings', () => {
    const store = useMeetingStore.getState();
    const mockMeetings: Meeting[] = [
      {
        id: '1',
        title: 'Test Meeting 1',
        date: new Date().toISOString(),
        participants: ['User 1'],
        sourceFile: 'test1.txt',
        fileSize: 1024,
        status: 'completed',
        speechCount: 10,
        mySpeechCount: 5,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Test Meeting 2',
        date: new Date().toISOString(),
        participants: ['User 2'],
        sourceFile: 'test2.txt',
        fileSize: 2048,
        status: 'processing',
        speechCount: 20,
        mySpeechCount: 10,
        createdAt: new Date().toISOString(),
      },
    ];

    store.setMeetings(mockMeetings);

    expect(useMeetingStore.getState().meetings).toEqual(mockMeetings);
  });

  it('should add meeting', () => {
    const store = useMeetingStore.getState();
    const mockMeeting: Meeting = {
      id: '1',
      title: 'Test Meeting',
      date: new Date().toISOString(),
      participants: ['User 1'],
      sourceFile: 'test.txt',
      fileSize: 1024,
      status: 'completed',
      speechCount: 10,
      mySpeechCount: 5,
      createdAt: new Date().toISOString(),
    };

    store.addMeeting(mockMeeting);

    expect(useMeetingStore.getState().meetings.length).toBe(1);
    expect(useMeetingStore.getState().meetings[0]).toEqual(mockMeeting);
  });

  it('should update meeting', () => {
    const store = useMeetingStore.getState();
    const mockMeeting: Meeting = {
      id: '1',
      title: 'Test Meeting',
      date: new Date().toISOString(),
      participants: ['User 1'],
      sourceFile: 'test.txt',
      fileSize: 1024,
      status: 'completed',
      speechCount: 10,
      mySpeechCount: 5,
      createdAt: new Date().toISOString(),
    };

    store.addMeeting(mockMeeting);
    store.updateMeeting('1', { title: 'Updated Meeting', status: 'processing' });

    const updatedMeeting = useMeetingStore.getState().meetings[0];
    expect(updatedMeeting.title).toBe('Updated Meeting');
    expect(updatedMeeting.status).toBe('processing');
  });

  it('should remove meeting', () => {
    const store = useMeetingStore.getState();
    const mockMeeting: Meeting = {
      id: '1',
      title: 'Test Meeting',
      date: new Date().toISOString(),
      participants: ['User 1'],
      sourceFile: 'test.txt',
      fileSize: 1024,
      status: 'completed',
      speechCount: 10,
      mySpeechCount: 5,
      createdAt: new Date().toISOString(),
    };

    store.addMeeting(mockMeeting);
    expect(useMeetingStore.getState().meetings.length).toBe(1);

    store.removeMeeting('1');
    expect(useMeetingStore.getState().meetings.length).toBe(0);
  });

  it('should set current meeting', () => {
    const store = useMeetingStore.getState();
    const mockMeeting: Meeting = {
      id: '1',
      title: 'Test Meeting',
      date: new Date().toISOString(),
      participants: ['User 1'],
      sourceFile: 'test.txt',
      fileSize: 1024,
      status: 'completed',
      speechCount: 10,
      mySpeechCount: 5,
      createdAt: new Date().toISOString(),
    };

    store.setCurrentMeeting(mockMeeting);

    expect(useMeetingStore.getState().currentMeeting).toEqual(mockMeeting);
  });

  it('should set filters', () => {
    const store = useMeetingStore.getState();

    store.setFilters({ searchQuery: 'test' });
    expect(useMeetingStore.getState().filters.searchQuery).toBe('test');

    store.setFilters({ status: 'completed' });
    expect(useMeetingStore.getState().filters.status).toBe('completed');
  });

  it('should set loading state', () => {
    const store = useMeetingStore.getState();

    store.setIsLoading(true);
    expect(useMeetingStore.getState().isLoading).toBe(true);

    store.setIsLoading(false);
    expect(useMeetingStore.getState().isLoading).toBe(false);
  });

  it('should set selected speaker', () => {
    const store = useMeetingStore.getState();

    store.setSelectedSpeaker('张三');
    expect(useMeetingStore.getState().selectedSpeaker).toBe('张三');
  });

  it('should set view mode', () => {
    const store = useMeetingStore.getState();

    store.setViewMode('detail');
    expect(useMeetingStore.getState().viewMode).toBe('detail');
  });
});
