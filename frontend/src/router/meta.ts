// Route metadata for titles and descriptions
export const routeMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: '首页 - SpeakSum',
    description: '让每一次会议发言都成为你知识图谱的一个节点',
  },
  '/timeline': {
    title: '会议时间线 - SpeakSum',
    description: '按时间查看所有会议发言',
  },
  '/graph': {
    title: '知识图谱 - SpeakSum',
    description: '可视化探索话题关联',
  },
  '/upload': {
    title: '上传会议 - SpeakSum',
    description: '上传会议纪要文件',
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
