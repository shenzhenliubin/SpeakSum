# 后端设计 Review 报告

**Review 日期**: 2026-04-03  
**Review 文档**: `docs/backend-impl-design.md`（位于 `feature-backend-impl` 分支）  
**参考文档**: `docs/TECH_ARCHITECTURE.md`, `docs/TECH_DESIGN.md`, `docs/PRODUCT_DESIGN.md`, `docs/FRONTEND_DESIGN.md`（位于 `develop` 分支）  

---

## 总体评价

后端实现设计文档整体结构清晰，覆盖了核心 MVP 功能（上传、解析、清理、标签、图谱）。技术栈选择（FastAPI + SQLAlchemy 2.0 + Celery + pgvector）与架构约束一致，模块拆分基本合理。但设计在**数据库 Schema 完整性**、**API 与前端的端点对齐**、**Celery 异步任务与异步数据库的兼容性**、以及**任务处理流程的细化程度**等方面存在需要修正的问题，部分关键功能（如说话人身份管理、任务重试/取消、分块上传）被明确排除在范围外，与参考文档存在差距。

---

## 详细检查

### 模块完整性

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 数据库模型 | ⚠️ | 核心模型（User、Meeting、Speech、Topic、TopicRelation、GraphLayout、UserModelConfig）已定义，但缺少 `speaker_identities`、`processing_tasks` 细节字段、`topic_embeddings` 独立表等与 TECH_DESIGN.md 对齐的表结构。 |
| API 路由 | ⚠️ | 覆盖了 upload、meetings、speeches、knowledge_graph、settings，但缺少 `batch upload`、`task retry/cancel`、` chunked upload`、以及 `speaker identities` 相关端点。 |
| 业务服务 | ✅ | parser、llm_client、text_processor、graph_builder 拆分合理，职责较清晰。 |
| 异步任务 | ⚠️ | Celery 任务定义了 `process_meeting_task` 和 `update_knowledge_graph_task`，但任务状态机过于简化（仅 PENDING/PROCESSING/SUCCESS/FAILED），且未解决同步 Celery Task 调用异步 DB 的根本架构问题。 |

### API 设计质量

| 检查项 | 状态 | 说明 |
|--------|------|------|
| RESTful 规范 | ⚠️ | 整体符合 RESTful，但 `upload/{task_id}/status` 和 `upload/{task_id}/stream` 将处理状态与上传模块耦合，与 TECH_DESIGN.md 建议的独立 `/process` 模块不一致。 |
| 请求/响应格式 | ⚠️ | 文档未明确统一响应信封结构（`success`/`data`/`meta`/`error`），TECH_DESIGN.md 中有详细定义。 |
| 错误处理 | ✅ | 提到自定义异常和全局处理器，以及各场景错误码，基本完善。 |
| 分页/搜索/筛选 | ⚠️ | 会议列表支持搜索（q 参数）但未定义分页参数；话题/发言的独立搜索端点缺失；未定义筛选器（时间范围、话题）。 |

### 数据库设计

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 表关系 | ⚠️ | ER 图关系基本正确，但 `TOPIC` 与 `SPEECH` 的关联通过 JSONB `topics` 实现，而不是显式关联表， это 与 TECH_DESIGN.md 中 `SPEECH ||--o{ TOPIC : tagged_with` 的语义不完全一致。 |
| pgvector 存储 | ⚠️ | `topics.embedding` 直接存储在 topics 表中；TECH_DESIGN.md 要求使用独立的 `topic_embeddings` 表，并建立 `ivfflat` 向量索引。 |
| 索引设计 | ❌ | 文档未列出任何索引（如 `idx_meetings_user_date`、`idx_speeches_topics` GIN、`pg_trgm` 全文搜索索引等），而 TECH_DESIGN.md 中有明确的索引策略。 |
| 字段类型和约束 | ⚠️ | 缺少 `meetings.duration_minutes`、`meetings.participants`、`speeches.sequence_number`、`speeches.is_target_speaker` 等 TECH_DESIGN.md 中定义的字段；`meetings.status` 仅定义为 `status` 字符串，未列出完整枚举值。 |

### 与前端对齐

| 检查项 | 状态 | 说明 |
|--------|------|------|
| API 响应格式 | ⚠️ | 未明确统一 envelope，前端 `api.ts` 拦截器和 `useMeetings` 等 hooks 均假设了标准 envelope 结构。 |
| 实时进度推送 | ❌ | 后端设计 SSE 端点为 `/api/v1/upload/{task_id}/stream`，但 FRONTEND_DESIGN.md 中 `useProcessingSSE` 连接的是 `${API_BASE_URL}/api/stream/tasks/${taskId}`，且 TECH_DESIGN.md 建议为 `/process/:task_id/stream`。路径不一致，需统一。 |
| 文件上传方案 | ❌ | 后端仅设计简单 POST `/api/v1/upload`，但 FRONTEND_DESIGN.md 中 `uploadService.ts` 实现了分块上传（`/upload/init`、`/upload/{uploadId}/chunks`、`/upload/{uploadId}/complete`）和批量上传（`/upload/batch`），后端 API 未覆盖此需求。 |
| 图谱节点位置更新 | ❌ | 前端 `useUpdateNodePosition` 调用 `graphApi.updateNodePosition(nodeId, position)`，但后端 API 仅提供 `GET /api/v1/knowledge-graph`，无单节点位置更新或布局保存端点（TECH_DESIGN.md 有 `POST /graph/layout`）。 |

### 技术可行性

| 检查项 | 状态 | 说明 |
|--------|------|------|
| LLM 客户端抽象层 | ✅ | `BaseLLMClient` + 多供应商实现（Kimi/OpenAI/Claude/Ollama）设计合理，与架构约束一致。 |
| 长文本分块处理 | ⚠️ | `chunk_and_process` 仅标注为“预留接口”，未给出具体分块算法、上下文重叠策略、合并逻辑，实现风险较高。 |
| Celery 任务队列配置 | ❌ | 核心问题：Celery task 是同步的，但数据库层使用 `asyncpg` + `AsyncSession`。文档建议在同步 task 内用 `asyncio.run()` 或 `async_to_sync` 桥接调用 async LLM 方法，但未解决**同步 task 中复用/创建 async DB session** 的架构问题。实际实现中很可能遇到 event loop 冲突、连接池不兼容等问题。建议将 DB 访问层设计为同步 Repository，或 Celery Worker 使用独立 async 任务框架（如 `arq`），或采用 `loop.run_until_complete` 的严格隔离模式。 |
| 错误处理和重试 | ⚠️ | Celery 任务声明了 `max_retries=3`（在概念描述中），但 API 层无任务重试/取消端点，且未定义任务超时、死信队列、失败回调等机制。 |
| API Key 加密 | ⚠️ | 采用 `cryptography.fernet.Fernet` 对称加密；TECH_DESIGN.md 明确要求使用 **AES-256-GCM** 并支持密钥轮换（`encryption_version` 字段）。 |
| Redis Pub/Sub for SSE | ⚠️ | 机制描述模糊（"Celery 信号机制将进度写入 Redis Pub/Sub"），FastAPI SSE 端点如何订阅、连接管理、断线重连等未详细说明。 |

### 测试覆盖

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 测试策略 | ⚠️ | 列出了核心测试文件，但缺少 `test_api_knowledge_graph.py`、`test_api_settings.py`、`test_graph_builder.py` 等覆盖。 |
| 核心业务流程 | ⚠️ | 测试计划覆盖了上传、会议、LLM 客户端和文本处理，但未覆盖知识图谱构建、模型配置、SSE 进度推送等关键路径。 |
| Mock 策略 | ✅ | 外部依赖全部 Mock、使用 SQLite `:memory:`、pgvector 用 TypeDecorator 替换为 TEXT 的策略合理且可行。 |

---

## 发现的问题

### 严重问题

1. **Celery 同步任务与异步数据库层存在根本性架构冲突**
   - **位置**：backend-impl-design.md 第 6.1 节
   - **影响**：Celery Worker 默认在同步线程中运行。若数据库访问层（`get_db`、`AsyncSession`、asyncpg）全部为 async，同步 Celery task 中调用 `asyncio.run()` 来执行 DB 操作会导致 event loop 冲突、连接池无法复用，甚至可能阻塞 Worker。这会使得整个异步任务管道难以稳定运行。
   - **建议**：
     - 方案 A：为 Celery Worker 单独设计**同步 Repository 层**（使用同步 SQLAlchemy engine + psycopg2），与 FastAPI 的 async 层分离。
     - 方案 B：将 `process_meeting_task` 设计为 async task（使用 `celery-async` 扩展或改用 `arq`/`fastapi-background`），保持全链路 async。
     - 方案 C：在同步 Celery task 内显式新建 event loop 并严格管理其生命周期，但需充分验证连接池行为。

2. **文件上传 API 完全不支持前端设计的分块上传和批量上传**
   - **位置**：backend-impl-design.md 第 4 节 API 路由设计
   - **影响**：FRONTEND_DESIGN.md 明确实现了分块上传（大文件分片、断点续传、并发上传）和批量上传（一次上传多个文件）。后端仅提供 `POST /api/v1/upload`，会导致前端核心上传能力无法落地，10MB 大文件上传在弱网环境可靠性差。
   - **建议**：补充分块上传端点（`POST /upload/init`、`POST /upload/{id}/chunks`、`POST /upload/{id}/complete`）和批量上传端点（`POST /upload/batch`），与 TECH_DESIGN.md 和 FRONTEND_DESIGN.md 对齐。

### 中等问题

3. **数据库 Schema 与 TECH_DESIGN.md 存在多处不一致，缺少关键表和字段**
   - **位置**：backend-impl-design.md 第 3 节、第 5.1 节
   - **影响**：缺失 `speaker_identities` 表导致 PRODUCT_DESIGN.md 中 P0 功能“说话人身份管理”无法落地；`topics.embedding` 直接内嵌而非使用独立 `topic_embeddings` 表，不利于向量模型版本管理和索引优化；`meetings` 和 `speeches` 缺少 `duration_minutes`、`participants`、`sequence_number`、`is_target_speaker` 等字段，影响前端数据展示和处理逻辑。
   - **建议**：按 TECH_DESIGN.md 的 1.3 节完整 Schema 重新核对并补全表结构，特别是 `speaker_identities`、`topic_embeddings`、以及 `meetings`/`speeches` 的完整字段清单。

4. **SSE 实时进度端点路径与前端设计不一致**
   - **位置**：backend-impl-design.md 第 4 节（`upload.py` 的 `/api/v1/upload/{task_id}/stream`）
   - **影响**：前端 `useProcessingSSE`  hook 连接的是 `/api/stream/tasks/${taskId}`，TECH_DESIGN.md 中定义的是 `/process/:task_id/stream`。路径不统一将导致前后端联调失败。
   - **建议**：统一采用 `/api/v1/process/{task_id}/stream`（与 TECH_DESIGN.md 对齐），并更新前端 hook 中的 URL。

5. **缺少任务重试、取消和会议重新处理 API**
   - **位置**：backend-impl-design.md 第 4 节
   - **影响**：TECH_DESIGN.md 明确设计了 `POST /process/:task_id/cancel`、`POST /process/:task_id/retry`、`POST /meetings/:id/reprocess`。后端设计中完全没有这些端点，影响用户体验（处理失败时无法重试，无法取消长时任务）。
   - **建议**：补充 `/api/v1/process/{task_id}/cancel`、`/api/v1/process/{task_id}/retry` 和 `/api/v1/meetings/{meeting_id}/reprocess` 端点。

6. **会议搜索方案效率存疑，且未定义分页参数**
   - **位置**：backend-impl-design.md 第 5.1 节
   - **影响**：文档提出用 `selectinload/joinedload` 加载所有关联 speeches，然后在 Python 层做模糊匹配和评分。对于用户会议量增长后的场景，这会加载大量数据到内存，性能差。同时 API 路由表未列出分页参数（page、per_page）。
   - **建议**：
     - 对 `meetings.title` 和 `speeches.raw_text` 建立 PostgreSQL `pg_trgm` GIN 索引，使用 SQL `ILIKE` 或 `tsvector` 在数据库层完成搜索。
     - 在 `GET /api/v1/meetings` 中明确加入 `page`、`per_page`、`sort`、`start_date`、`end_date` 参数，与 TECH_DESIGN.md 对齐。

7. **API Key 加密算法与架构规范不一致**
   - **位置**：backend-impl-design.md 第 7.1 节
   - **影响**：TECH_DESIGN.md 1.3.1 节明确要求使用 **AES-256-GCM** 并支持密钥轮换（`encryption_version` 字段）。后端设计使用 Fernet（基于 AES-128-CBC 或 AES-256-CBC，非 GCM 模式），安全性和规范对齐度不足。
   - **建议**：改用 AES-256-GCM 实现 API Key 加解密，并在 `user_model_configs` 表中增加 `encryption_version` 字段。

8. **长文本分块处理仅停留在接口预留层面，无具体实现策略**
   - **位置**：backend-impl-design.md 第 5.3 节
   - **影响**：PRODUCT_DESIGN.md 将“智能分块”列为 P1 功能（5 万字会议也能处理）。后端仅定义了 `chunk_and_process(text, processor)` 函数签名，没有分块算法、边界处理、上下文重叠、结果合并的具体设计。
   - **建议**：参考 TECH_DESIGN.md 第 3.2.1 节（`TextChunker` 类）和 PRODUCT_DESIGN.md 第 7.3 节，补充完整的分块算法和状态机设计。

### 轻微问题

9. **未定义统一 API 响应信封格式**
   - **位置**：backend-impl-design.md 全篇
   - **影响**：前端 hooks 和 API 拦截器依赖统一的 `{ success, data, meta/error }` 结构进行逻辑处理。
   - **建议**：在 API 设计章节补充统一响应格式说明，直接引用 TECH_DESIGN.md 2.2 节定义。

10. **知识图谱布局缺少保存/更新端点**
    - **位置**：backend-impl-design.md 第 4 节
    - **影响**：前端支持用户拖拽调整节点位置（`useUpdateNodePosition`），但后端无对应的布局保存或单节点更新端点。
    - **建议**：增加 `POST /api/v1/knowledge-graph/layout` 端点（或 `PATCH /api/v1/knowledge-graph/nodes/{node_id}/position`），与 FRONTEND_DESIGN.md 和 TECH_DESIGN.md 对齐。

11. **缺少导出 API 与认证 API 的说明范围边界可再商榷**
    - **位置**：backend-impl-design.md 第 1.1 节
    - **影响**：文档将认证路由和导出 API 明确排除在 MVP 外。但 PRODUCT_DESIGN.md 将“用户认证”和“JSON 导出”列为 P0/P1 功能，且 FRONTEND_DESIGN.md 中存在导出按钮和认证路由设计。
    - **建议**：即使本次不实现，建议在文档中标注为“二阶段依赖”而非完全删除，避免后续实现时出现接口断层。

12. **会议处理状态机过于简化**
    - **位置**：backend-impl-design.md 第 6.1 节
    - **影响**：仅定义 `PENDING → PROCESSING → SUCCESS/FAILED`，缺少 `parsing`、`extracting`、`cleaning`、`tagging`、`building_graph` 等细粒度状态。前端“处理进度”界面需要展示当前阶段（解析→提取→清理→标签→图谱）。
    - **建议**：采用 TECH_DESIGN.md 中定义的完整 `ProcessingStatus` 枚举和状态机。

13. **未提及 rate limiting、health check 等运维相关端点**
    - **位置**：backend-impl-design.md 全篇
    - **影响**：TECH_ARCHITECTURE.md 第 5.2 节要求限流，K8s 部署需要 `/health` 探针。
    - **建议**：补充 `GET /health` 端点和基于 `slowapi` 或 Nginx 的 rate limiting 设计说明。

---

## 建议

1. **优先解决架构冲突**：在编码前确定 Celery Worker 与 async DB 的集成方案，这是整个后端能否稳定运行的基础。
2. **补全 API 以实现对齐**：分块上传、批量上传、任务状态/重试/取消、知识图谱布局保存，这些是前端可以直接调用的必要接口。
3. **严格对齐 TECH_DESIGN.md 的数据库 Schema**：特别是 `speaker_identities`、`topic_embeddings`、`processing_tasks` 以及各个表的字段和索引。
4. **统一响应格式和端点路径**：直接引用 TECH_DESIGN.md 和 FRONTEND_DESIGN.md 中的定义，减少联调时的不一致。
5. **细化分块处理设计**：在实现前将 `TextChunker` 的算法、状态机、Celery chord/group 工作流设计完整化。

---

## 结论

- [ ] 设计通过，可以开始实现
- [ ] 设计基本通过，轻微问题可在实现中修复
- [x] 设计需要修改，请修复后再 review

**理由**：存在 1 个严重架构问题（Celery 同步任务与异步 DB 不兼容）和 1 个严重功能缺口（上传 API 不支持前端要求的分块/批量上传），以及多个中等级别的 Schema 和 API 对齐问题。这些问题如不在实现前修复，将导致大量返工。建议在修复上述关键问题后，重新提交 review。
