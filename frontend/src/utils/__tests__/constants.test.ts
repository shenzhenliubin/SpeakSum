import { describe, it, expect } from 'vitest';
import {
  API_BASE_URL,
  MAX_FILE_SIZE,
  ACCEPTED_FILE_TYPES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  GRAPH_CONFIG,
  EMPTY_STATE_CONFIG,
  NAV_ITEMS,
  SETTINGS_TABS,
  MODEL_PROVIDERS,
  DATE_RANGE_OPTIONS,
  STORAGE_KEYS,
} from '../constants';

describe('Constants', () => {
  describe('API Configuration', () => {
    it('should have API_BASE_URL defined', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(typeof API_BASE_URL).toBe('string');
    });
  });

  describe('File Upload Configuration', () => {
    it('should have correct MAX_FILE_SIZE', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should have correct ACCEPTED_FILE_TYPES', () => {
      expect(ACCEPTED_FILE_TYPES).toContain('.txt');
      expect(ACCEPTED_FILE_TYPES).toContain('.md');
      expect(ACCEPTED_FILE_TYPES).toContain('.doc');
      expect(ACCEPTED_FILE_TYPES).toContain('.docx');
    });
  });

  describe('Pagination', () => {
    it('should have correct DEFAULT_PAGE_SIZE', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(20);
    });

    it('should have correct MAX_PAGE_SIZE', () => {
      expect(MAX_PAGE_SIZE).toBe(100);
    });
  });

  describe('Graph Configuration', () => {
    it('should have correct zoom limits', () => {
      expect(GRAPH_CONFIG.minZoom).toBe(0.1);
      expect(GRAPH_CONFIG.maxZoom).toBe(5);
      expect(GRAPH_CONFIG.defaultZoom).toBe(1);
    });

    it('should have correct node size limits', () => {
      expect(GRAPH_CONFIG.nodeSize.min).toBe(30);
      expect(GRAPH_CONFIG.nodeSize.max).toBe(100);
    });

    it('should have correct colors', () => {
      expect(GRAPH_CONFIG.colors.terracotta).toBe('#c8734f');
      expect(GRAPH_CONFIG.colors.moss).toBe('#6f8465');
      expect(GRAPH_CONFIG.colors.sand).toBe('#d7b082');
      expect(GRAPH_CONFIG.colors.earth).toBe('#8a6e52');
    });
  });

  describe('Empty State Configurations', () => {
    it('should have noData config', () => {
      expect(EMPTY_STATE_CONFIG.noData).toBeDefined();
      expect(EMPTY_STATE_CONFIG.noData.title).toBe('暂无数据');
    });

    it('should have noSearchResult config', () => {
      expect(EMPTY_STATE_CONFIG.noSearchResult).toBeDefined();
      expect(EMPTY_STATE_CONFIG.noSearchResult.title).toBe('未找到结果');
    });

    it('should have noPermission config', () => {
      expect(EMPTY_STATE_CONFIG.noPermission).toBeDefined();
      expect(EMPTY_STATE_CONFIG.noPermission.title).toBe('无权访问');
    });

    it('should have error config', () => {
      expect(EMPTY_STATE_CONFIG.error).toBeDefined();
      expect(EMPTY_STATE_CONFIG.error.title).toBe('出错了');
    });

    it('should have emptyGraph config', () => {
      expect(EMPTY_STATE_CONFIG.emptyGraph).toBeDefined();
      expect(EMPTY_STATE_CONFIG.emptyGraph.title).toBe('知识图谱为空');
    });
  });

  describe('Navigation Items', () => {
    it('should have correct navigation items', () => {
      expect(NAV_ITEMS.length).toBe(4);
      expect(NAV_ITEMS.map((item) => item.key)).toContain('home');
      expect(NAV_ITEMS.map((item) => item.key)).toContain('timeline');
      expect(NAV_ITEMS.map((item) => item.key)).toContain('graph');
      expect(NAV_ITEMS.map((item) => item.key)).toContain('settings');
    });
  });

  describe('Settings Tabs', () => {
    it('should have correct settings tabs', () => {
      expect(SETTINGS_TABS.length).toBe(3);
      expect(SETTINGS_TABS.map((tab) => tab.key)).toContain('models');
      expect(SETTINGS_TABS.map((tab) => tab.key)).toContain('identities');
      expect(SETTINGS_TABS.map((tab) => tab.key)).toContain('general');
    });
  });

  describe('Model Providers', () => {
    it('should have correct model providers', () => {
      expect(MODEL_PROVIDERS.length).toBe(5);
      expect(MODEL_PROVIDERS.map((p) => p.value)).toContain('kimi');
      expect(MODEL_PROVIDERS.map((p) => p.value)).toContain('openai');
      expect(MODEL_PROVIDERS.map((p) => p.value)).toContain('claude');
      expect(MODEL_PROVIDERS.map((p) => p.value)).toContain('ollama');
      expect(MODEL_PROVIDERS.map((p) => p.value)).toContain('custom');
    });
  });

  describe('Date Range Options', () => {
    it('should have correct date range options', () => {
      expect(DATE_RANGE_OPTIONS.length).toBe(6);
      expect(DATE_RANGE_OPTIONS.map((o) => o.value)).toContain('all');
      expect(DATE_RANGE_OPTIONS.map((o) => o.value)).toContain('7d');
      expect(DATE_RANGE_OPTIONS.map((o) => o.value)).toContain('30d');
      expect(DATE_RANGE_OPTIONS.map((o) => o.value)).toContain('90d');
      expect(DATE_RANGE_OPTIONS.map((o) => o.value)).toContain('year');
      expect(DATE_RANGE_OPTIONS.map((o) => o.value)).toContain('custom');
    });
  });

  describe('Storage Keys', () => {
    it('should have correct storage keys', () => {
      expect(STORAGE_KEYS.AUTH).toBe('speaksum-auth');
      expect(STORAGE_KEYS.UI).toBe('speaksum-ui');
      expect(STORAGE_KEYS.GRAPH_LAYOUT).toBe('speaksum-graph-layout');
    });
  });
});
