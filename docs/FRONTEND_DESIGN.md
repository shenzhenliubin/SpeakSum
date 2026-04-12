# SpeakSum 前端设计规范文档

**文档版本**: 2.0  
**更新日期**: 2026-04-06  
**状态**: REDESIGNED

---

## 1. 前端目标

前端需要完整反映 SpeakSum 2.0 的新语义：

- 不是会议纪要管理器
- 而是刘彬个人思想整理系统
- 输入来源分为：
  - `会议纪要`
  - `其他文本`
- 输出核心分为：
  - `发言总结`
  - `思想金句`
  - `领域归类`
- 知识图谱围绕 `领域 + 金句` 构建

---

## 2. 页面结构

```text
/
├── 首页 Home
├── 时间线 Timeline
├── 知识图谱 Graph
├── 上传 Upload
└── 用户中心 Settings
```

---

## 3. 页面语义

## 3.1 首页

首页重点展示：
- 最近内容记录
- 最近新增思想金句
- 领域分布概览
- 快速上传入口

首页主文案要强调：
- 会议纪要只是来源之一
- 文章、随笔、笔记也可进入系统

## 3.2 时间线

时间线不再是“会议时间线”，而是 **内容时间线**。

每条卡片展示：
- 标题
- 日期
- 来源类型 Badge
- 发言总结摘要
- 金句数量
- 处理状态

建议卡片结构：

```text
标题
日期 · 来源类型
发言总结摘要（2-3 行）
金句数 / 状态
```

## 3.3 详情页

详情页主结构调整为：

1. **发言总结**
2. **思想金句**
3. **内容信息**

不再将“我的观点列表”作为主视觉结构。

### 发言总结区

- 主结果区域
- 支持原地编辑
- 保存后仅刷新内容详情，不触发图谱重建

### 思想金句区

每条金句展示：
- 金句正文
- 领域标签
- 编辑按钮
- 删除按钮

支持：
- 编辑正文
- 修改领域
- 删除金句

规则：
- 修改领域或删除金句后，前端要主动失效 `graph` 查询
- 只改金句正文，不强制重建图谱

## 3.4 知识图谱页

知识图谱页主语义：
- 节点是领域
- 点开领域看相关金句
- 侧边栏展示：
  - 领域名称
  - 相关金句
  - 金句所属内容

不再显示：
- speech 节点
- viewpoint 节点
- 话题岛屿细节

---

## 4. 上传交互

## 4.1 来源类型选择

上传页在选择文件之前，必须先或同时选择来源类型：
- `会议纪要`
- `其他文本`

### 交互要求

- 默认来源类型可以保留上一次选择
- 上传卡片中必须清楚显示当前来源类型
- 多文件上传时，同一批次共享一个来源类型

## 4.2 处理状态文案

### 会议纪要

- 解析文件
- 识别刘彬发言
- 生成发言总结
- 提炼思想金句
- 更新知识图谱

### 其他文本

- 解析文件
- 生成发言总结
- 提炼思想金句
- 更新知识图谱

### 忽略态

仅会议纪要可能出现：
- `已忽略：未检测到刘彬发言，因此未生成记录`

---

## 5. 组件设计

## 5.1 TimelineCard

建议 props：

```ts
interface TimelineCardProps {
  id: string;
  title: string;
  contentDate: string | null;
  sourceType: 'meeting_minutes' | 'other_text';
  summaryText: string | null;
  quoteCount: number;
  status: 'pending' | 'processing' | 'completed' | 'ignored' | 'failed';
}
```

## 5.2 SummaryEditor

功能：
- 展示发言总结
- 原地编辑
- 单条保存

## 5.3 QuoteCard

建议 props：

```ts
interface QuoteCardProps {
  quote: {
    id: string;
    sequence_number: number;
    text: string;
    domain_ids: string[];
  };
  domains: DomainOption[];
  onSave: (payload: { text: string; domainIds: string[] }) => Promise<void>;
  onDelete: () => Promise<void>;
}
```

功能：
- 展示金句
- 展示领域标签
- 原地编辑正文
- 原地编辑领域
- 删除

## 5.4 DomainGraph

图谱数据格式建议：

```ts
interface GraphNode {
  id: string;
  type: 'domain';
  label: string;
  size: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'related';
  strength: number;
}
```

---

## 6. 路由与页面映射

建议路由：

```text
/                     首页
/timeline             内容时间线
/timeline/:contentId  内容详情
/graph                领域知识图谱
/upload               上传页
/settings             用户中心
```

说明：
- 详情页路由仍可沿用历史 `meetingId` 参数命名作为过渡
- 但页面文案必须改成“内容详情/发言总结/思想金句”语义

---

## 7. 前端类型设计

```ts
type SourceType = 'meeting_minutes' | 'other_text';

interface Content {
  id: string;
  title: string;
  source_type: SourceType;
  content_date: string | null;
  status: 'pending' | 'processing' | 'completed' | 'ignored' | 'failed';
  ignored_reason: string | null;
  summary_text: string | null;
  quotes: Quote[];
}

interface Quote {
  id: string;
  sequence_number: number;
  text: string;
  domain_ids: string[];
  created_at: string;
  updated_at?: string;
}

interface Domain {
  id: string;
  display_name: string;
  sort_order: number;
}
```

---

## 8. Query 缓存策略

### 8.1 内容相关

- `['contents']`
- `['content', contentId]`

### 8.2 图谱相关

- `['graph']`
- `['graph-domain', domainId]`

### 8.3 失效规则

#### 修改发言总结

失效：
- `['contents']`
- `['content', contentId]`

#### 修改金句正文

失效：
- `['contents']`
- `['content', contentId]`

#### 修改金句领域 / 删除金句

失效：
- `['contents']`
- `['content', contentId]`
- `['graph']`
- `['graph-domain', domainId]`（如适用）

---

## 9. 知识图谱交互规范

### 9.1 节点点击

点击领域节点后：
- 高亮当前节点
- 展开右侧详情面板
- 加载该领域下思想金句

### 9.2 详情面板内容

每条金句项展示：
- 金句正文
- 所属内容标题
- 内容日期
- 跳转到详情页入口

### 9.3 空状态

图谱为空时文案建议：
- `还没有可用于构建图谱的思想金句`
- `上传会议纪要或其他文本，开始沉淀你的领域图谱`

---

## 10. 文案规范

### 不再使用的核心文案

- 我的观点
- 发言列表
- 话题岛屿
- speech 节点

### 新文案

- 发言总结
- 思想金句
- 内容时间线
- 领域图谱
- 来源类型

---

## 11. 默认领域显示名

前端展示默认使用以下领域名称：

- 产品与业务
- 技术与架构
- 项目推进与交付
- 组织协同与管理
- 学习成长与认知
- 方法论与决策
- 人生选择与价值观
- 运动健康与身心状态
- 下一代教育与成长
- 投资研究与交易决策
- 其他

---

## 12. 前端设计结论

前端的关键变化不是换一套样式，而是换一套内容语义：

- 从会议视角切到内容视角
- 从观点列表切到发言总结
- 从话题图切到领域图
- 从 speech/edit 切到 quote/domain/edit

页面、组件、路由、缓存和图谱交互都必须围绕这套新模型重构。
