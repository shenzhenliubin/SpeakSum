// Route metadata for titles and descriptions
export const routeMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: '首页 - SpeakSum',
    description: '让每一次发言、文章或文本都成为你的长期思想沉淀',
  },
  '/timeline': {
    title: '思想记录 - SpeakSum',
    description: '按时间查看所有发言总结与思想金句',
  },
  '/graph': {
    title: '知识图谱 - SpeakSum',
    description: '按领域可视化探索思想金句的聚合关系',
  },
  '/upload': {
    title: '上传内容 - SpeakSum',
    description: '上传会议纪要或其他文本',
  },
  '/settings': {
    title: '设置 - SpeakSum',
    description: '管理模型配置和个人信息',
  },
  '/login': {
    title: '登录 - SpeakSum',
    description: '登录你的 SpeakSum 账户',
  },
};
