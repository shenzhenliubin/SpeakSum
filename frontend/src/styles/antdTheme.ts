import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    // Brand colors
    colorPrimary: '#c8734f',
    colorPrimaryHover: '#d68860',
    colorPrimaryActive: '#9e5434',

    // Background colors
    colorBgBase: '#f4ede4',
    colorBgContainer: '#fffaf4',
    colorBgElevated: '#fffaf4',

    // Text colors
    colorTextBase: '#31291f',
    colorText: '#31291f',
    colorTextSecondary: '#74614f',
    colorTextTertiary: '#9e8b79',

    // Border colors
    colorBorder: '#dfd1c0',
    colorBorderSecondary: '#c8b39d',

    // Border radius
    borderRadius: 22,
    borderRadiusLG: 28,
    borderRadiusSM: 14,
    borderRadiusXS: 8,

    // Spacing
    paddingContentHorizontal: 18,
    paddingContentVertical: 12,

    // Font
    fontFamily: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    fontFamilyCode: '"SF Mono", "Fira Code", monospace',

    // Shadows
    boxShadow: '0 16px 40px rgba(80, 46, 24, 0.05)',
    boxShadowSecondary: '0 24px 60px rgba(90, 57, 35, 0.08)',

    // Functional colors
    colorSuccess: '#6f8465',
    colorWarning: '#d7b082',
    colorError: '#c8734f',
    colorInfo: '#8fa17a',
  },
  components: {
    Button: {
      borderRadius: 999,
      paddingInline: 18,
      paddingBlock: 12,
    },
    Card: {
      borderRadius: 28,
      paddingLG: 22,
    },
    Input: {
      borderRadius: 18,
      paddingInline: 16,
      paddingBlock: 14,
    },
    Menu: {
      borderRadius: 14,
    },
    Tag: {
      borderRadius: 999,
    },
    Modal: {
      borderRadius: 28,
    },
    Select: {
      borderRadius: 18,
    },
    DatePicker: {
      borderRadius: 18,
    },
  },
};
