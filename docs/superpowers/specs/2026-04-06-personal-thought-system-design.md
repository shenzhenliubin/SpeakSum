# SpeakSum 个人思想整理系统重构设计

**日期**: 2026-04-06  
**状态**: APPROVED BY USER  
**范围**: 产品、架构、前后端技术设计统一重构

---

## 1. 背景

原设计把 SpeakSum 定义为“个人会议知识管理工具”，主数据模型围绕：

```text
meeting -> speeches -> viewpoints -> topics -> graph
```

这个模型存在三个核心问题：

1. 过度绑定会议场景，无法自然接纳文章、随笔、笔记等非会议输入
2. 过度绑定逐条 speech / viewpoint，加工链路复杂，输出语义不稳定
3. 知识图谱围绕话题和发言构建，不适合长期沉淀“刘彬的思想资产”

用户确认新的产品方向是：
- 这是一个只服务 **刘彬本人** 的系统
- 会议纪要只是来源之一
- 其他本人文本也需要进入系统
- 主产物应是 **发言总结** 与 **思想金句**
- 知识图谱应围绕 **领域 + 金句** 构建

---

## 2. 设计结论

### 2.1 目标对象

固定主身份为 **刘彬**。

系统不再把“谁是目标发言人”做成通用多用户能力，而是：
- `meeting_minutes`：需要从多人会议中识别刘彬发言
- `other_text`：默认整份文本就是刘彬本人输出

### 2.2 支持的来源类型

当前只支持两类：
- `meeting_minutes`
- `other_text`

### 2.3 主产物

每条内容的最终产物固定为：
- 一段 **发言总结**
- 若干条 **思想金句**
- 每条金句关联 1-3 个 **领域 ID**

### 2.4 图谱模型

知识图谱的核心挂钩对象是：
- `Domain`
- `Quote`

而不是：
- `Speech`
- `Viewpoint`
- `Topic Island`

---

## 3. 默认领域体系

默认固定 11 个领域：

| 显示名 | ID |
|--------|----|
| 产品与业务 | `product_business` |
| 技术与架构 | `technology_architecture` |
| 项目推进与交付 | `delivery_execution` |
| 组织协同与管理 | `organization_collaboration` |
| 学习成长与认知 | `learning_growth` |
| 方法论与决策 | `decision_method` |
| 人生选择与价值观 | `life_values` |
| 运动健康与身心状态 | `health_fitness` |
| 下一代教育与成长 | `next_generation_education` |
| 投资研究与交易决策 | `investing_trading` |
| 其他 | `other` |

原则：
- 领域关系使用稳定 ID，不依赖显示名
- 后台可低频改显示名，但不鼓励高频修改
- 金句允许挂多个领域

---

## 4. Prompt 设计

必须维护两套 Prompt：
- `meeting_minutes`
- `other_text`

但统一返回一个 JSON 契约：

```json
{
  "status": "completed",
  "ignored_reason": null,
  "summary": "一段发言总结",
  "quotes": [
    {
      "text": "思想型金句",
      "domain_ids": ["decision_method", "technology_architecture"]
    }
  ]
}
```

约束：
- `summary` 是整体总结，不是列表
- `quotes` 是思想单元，不是漂亮话
- `meeting_minutes` 允许返回 `ignored`
- `other_text` 不做发言人检测

---

## 5. 数据模型

方案 A 采用新主模型：

```text
content -> summary_text -> quotes -> quote_domains -> graph
```

建议新表：
- `contents`
- `quotes`
- `domains`
- `quote_domains`
- `domain_relations`
- `graph_layouts`

旧结构：
- `meetings`
- `speeches`
- `viewpoints`
- `topics`

视为迁移前模型，不再作为未来主路径。

---

## 6. 页面语义

### 时间线

从“会议时间线”切到“内容时间线”，每条卡片展示：
- 标题
- 日期
- 来源类型
- 发言总结摘要
- 金句数量
- 状态

### 详情页

主结构改为：
1. 发言总结
2. 思想金句
3. 内容信息

### 知识图谱

节点为领域，点击领域查看相关思想金句。

---

## 7. 编辑规则

支持手工编辑：
- `summary_text`
- `quote.text`
- `quote.domain_ids`

影响规则：
- 改 `summary_text`：不重建图谱
- 改 `quote.text`：不重建图谱
- 改 `quote.domain_ids`：重建图谱
- 删除 `quote`：重建图谱

---

## 8. 迁移策略

采用 **重做主模型**：
- 新功能只面向新表
- 旧表只作迁移期兼容
- 文档、Prompt、页面、图谱全部按新语义重写

---

## 9. 文档同步要求

以下文档必须同步到同一口径：
- `docs/PRODUCT_DESIGN.md`
- `docs/TECH_ARCHITECTURE.md`
- `docs/TECH_DESIGN.md`
- `docs/FRONTEND_DESIGN.md`

统一移除或弱化：
- speech-first 表达
- viewpoint-first 表达
- topic island 作为主图谱单位

统一强化：
- source_type
- summary_text
- quote
- domain
- domain graph

---

## 10. 最终判断

这次重构不是“在旧会议工具上补几个功能”，而是产品语义的重定向：

- 从“会议知识管理”转向“个人思想整理”
- 从“逐条发言”转向“发言总结”
- 从“话题节点”转向“领域节点”
- 从“单一会议来源”转向“会议纪要 + 其他文本”

这是 SpeakSum 2.0 的基础设计。
