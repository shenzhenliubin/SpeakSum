# SpeakSum Backend Implementation Design

## 1. 文档定位

本文档描述当前后端已落地的实现口径。  
当前系统已经不再围绕 `meeting / speech / viewpoint / topic` 主模型展开，主路径为：

- `content`
- `summary_text`
- `quotes`
- `domains`
- `quote_domains`
- `domain_relations`

如果和历史文档存在冲突，以本文档和当前代码实现为准。

---

## 2. 当前后端主模型

### 2.1 内容记录 (`contents`)

每条上传内容对应一条 `content` 记录，支持两类来源：

- `meeting_minutes`
- `other_text`

关键字段：

- `id`
- `user_id`
- `title`
- `source_type`
- `content_date`
- `source_file_name`
- `source_file_path`
- `source_file_size`
- `file_type`
- `status`
- `ignored_reason`
- `error_message`
- `summary_text`
- `created_at`
- `updated_at`
- `completed_at`

### 2.2 思想金句 (`quotes`)

每条内容可生成多条思想金句。  
金句是图谱的核心内容单元，不再围绕逐条发言建模。

关键字段：

- `id`
- `content_id`
- `user_id`
- `sequence_number`
- `text`
- `created_at`
- `updated_at`

### 2.3 领域 (`domains`)

领域是系统预定义的稳定分类，当前默认包含：

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

### 2.4 金句-领域关联 (`quote_domains`)

一条金句可关联多个领域。  
知识图谱按领域聚合，边关系来自领域共现。

### 2.5 领域关系 (`domain_relations`)

图谱边关系由同一条内容中多个领域的共现，以及内容时间接近度共同计算。

---

## 3. 数据库表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 用户 | id, email, password_hash, created_at, updated_at |
| `contents` | 内容主记录 | id, user_id, title, source_type, content_date, status, summary_text |
| `quotes` | 思想金句 | id, content_id, user_id, sequence_number, text |
| `domains` | 预定义领域 | id, display_name, description, is_system_default, sort_order |
| `quote_domains` | 金句与领域多对多 | quote_id, domain_id |
| `domain_relations` | 领域关系 | user_id, domain_a_id, domain_b_id, total_score |
| `graph_layouts` | 用户图谱布局缓存 | user_id, layout_data, version |
| `user_model_configs` | 用户模型配置 | provider, name, api_key_encrypted, base_url, default_model |
| `speaker_identities` | 说话人身份配置 | display_name, aliases, is_default |

历史兼容表 `meetings / speeches / viewpoints / topics` 仍可能存在于数据库中，但已经不再属于当前主路径。

---

## 4. API 路由

### 4.1 认证

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/login` | POST | 登录 |
| `/api/v1/auth/register` | POST | 注册 |
| `/api/v1/auth/me` | GET | 获取当前用户 |

### 4.2 上传与处理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/upload` | POST | 上传文件并创建异步处理任务 |
| `/api/v1/upload/{task_id}/status` | GET | 查询任务状态 |
| `/api/v1/process/{task_id}/stream` | GET | SSE 实时推送任务进度 |

上传字段：

- `file`
- `source_type`
- `provider`

其中：

- `source_type` 仅支持 `meeting_minutes` / `other_text`
- `provider` 对应用户已配置的模型提供商

### 4.3 内容

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/contents` | GET | 内容列表（分页、搜索、状态筛选） |
| `/api/v1/contents/{content_id}` | GET | 内容详情 |
| `/api/v1/contents/{content_id}` | DELETE | 删除内容 |
| `/api/v1/contents/{content_id}/summary` | PATCH | 修改发言总结 |
| `/api/v1/contents/{content_id}/quotes/{quote_id}` | PATCH | 修改思想金句或其领域 |
| `/api/v1/contents/{content_id}/quotes/{quote_id}` | DELETE | 删除思想金句 |

### 4.4 领域图谱

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/knowledge-graph` | GET | 获取领域图谱 |
| `/api/v1/knowledge-graph/domains/{domain_id}` | GET | 获取单个领域详情及相关金句 |
| `/api/v1/knowledge-graph/layout` | POST | 保存用户图谱布局 |

### 4.5 设置

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/settings/model` | GET | 获取模型配置列表 |
| `/api/v1/settings/model` | PUT | 更新模型配置 |
| `/api/v1/settings/model/test` | POST | 测试模型连通性 |
| `/api/v1/speaker-identities` | GET/POST | 获取或新增说话人身份 |
| `/api/v1/speaker-identities/{identity_id}` | PUT/DELETE | 更新或删除说话人身份 |

---

## 5. 处理链路

当前异步任务是 `process_content_task`，不再使用历史 `process_meeting_task`。

### 5.1 输入分流

- `meeting_minutes`
  - 先进行刘彬发言识别
  - 再做发言总结和思想金句提炼
- `other_text`
  - 默认整份文本就是刘彬本人输出
  - 直接做发言总结和思想金句提炼

### 5.2 处理步骤

1. `PARSING`
2. `IDENTIFYING_SPEAKER`（仅会议纪要）
3. `SUMMARIZING`
4. `EXTRACTING_QUOTES`
5. `BUILDING_GRAPH`
6. `completed / ignored / failed`

### 5.3 输出结果

- `summary_text`
- `quotes`
- `quote.domain_ids`

如果会议纪要中未检测到刘彬发言，则状态为 `ignored`，不会进入主时间线。

---

## 6. 图谱构建

当前图谱构建器为 `DomainGraphBuilder`。

职责：

- 确保默认领域存在
- 统计内容级领域共现
- 计算 `domain_relations`
- 输出 `KnowledgeGraphData`
- 持久化 `graph_layouts`

图谱节点类型固定为：

- `domain`

图谱详情展开对象固定为：

- `quotes`

---

## 7. 测试口径

当前主验证集围绕新主路径展开：

- `tests/test_content_processor.py`
- `tests/test_celery_tasks.py`
- `tests/test_api_upload.py`
- `tests/test_api_contents.py`
- `tests/test_api_knowledge_graph.py`
- `tests/test_api_edge_cases.py`
- `tests/test_schema_compatibility.py`

历史 `meetings / speeches / viewpoints / topics` 测试已退场。

---

## 8. 当前实现结论

SpeakSum 当前后端已经完成主语义切换：

- 从“会议 + 发言列表”切到“内容 + 发言总结 + 思想金句”
- 从“话题图谱”切到“领域图谱”
- 从“逐条 speech/viewpoint 编辑”切到“summary/quote/domain 编辑”

后续新增能力应继续围绕这套模型扩展，不再回到历史 `meeting/viewpoint/topic` 路径。
