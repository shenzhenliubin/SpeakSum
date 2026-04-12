# 后端设计审查反馈文档（历史归档）

> 归档说明
>
> 本文档是对旧后端评审报告的反馈记录，讨论对象仍是已退场的 `meetings / speeches / topics` 与阶段性 `viewpoint` 模型，不再代表当前产品和接口契约。
>
> 当前有效文档请优先查看：
> - `docs/PRODUCT_DESIGN.md`
> - `docs/TECH_ARCHITECTURE.md`
> - `docs/TECH_DESIGN.md`
> - `docs/FRONTEND_DESIGN.md`
> - `docs/backend-impl-design.md`
> - `docs/openapi.yaml`
>
> 下文内容仅作为历史反馈与决策背景存档。

**审查日期**: 2026-04-03  
**审查文档**: `docs/BACKEND_DESIGN_REVIEW.md` (位于 develop 分支)  
**反馈文档状态**: 已审阅，部分接受修改  

---

## 总体回应

本次审查报告全面且深入，对后端设计提出了 13 个具体问题（2 个严重、8 个中等、3 个轻微）。经过仔细评估，我们**部分接受修改建议**：

- **接受修改** (8项): 架构说明澄清、Schema 补全、API 路径统一、响应格式标准化、加密算法升级、状态机细化、图谱布局端点、索引设计
- **不接受修改但记录** (5项): 分块上传（MVP延后）、任务重试/取消（MVP简化）、topic_embeddings 独立表（当前内嵌已满足）、长文本分块（P1延后）、认证/导出（二阶段）

---

## 逐条反馈

### 严重问题

#### 1. Celery 同步任务与异步数据库层架构冲突

**审查意见**: Celery Worker 默认同步运行，与 async DB 层不兼容，需要解决 event loop 冲突。

**决策**: ✅ **接受（澄清说明）**

**理由与解决方案**:
当前实现已使用 `asyncio.run()` 桥接模式，在同步 Celery task 中调用 async 函数。这种方式在 Python 3.7+ 中是官方支持的标准做法。具体实现：

```python
@app.task(bind=True, base=SqlAlchemyTask, max_retries=3)
def process_meeting_task(self, meeting_id, file_path, speaker_identity):
    return asyncio.run(_process_meeting_async(self, meeting_id, file_path, speaker_identity))
```

该模式已在实际项目中验证可行。我们会在设计文档中补充详细的架构说明，解释这种桥接模式的工作原理和注意事项。

**相关修改**: 已在设计文档第 6.1 节补充详细说明。

---

#### 2. 文件上传 API 不支持分块/批量上传

**审查意见**: 后端仅提供简单 POST /api/v1/upload，与前端设计的分块上传能力不匹配。

**决策**: ❌ **不接受（MVP阶段）**

**理由**:
1. 当前 10MB 限制下的简单上传已满足 MVP 核心需求
2. 分块上传实现复杂度高（init/chunks/complete 三端点、断点续传、并发控制）
3. 前端当前版本可使用简单上传完成核心功能验证

**解决方案**: 标记为 P1 功能，在后续迭代中实现：
- 添加 `/api/v1/upload/init`、`/api/v1/upload/{id}/chunks`、`/api/v1/upload/{id}/complete` 端点
- 参考 AWS S3 Multipart Upload 设计

**相关修改**: 已在设计文档第 4 节添加"后续迭代"说明。

---

### 中等问题

#### 3. 数据库 Schema 与 TECH_DESIGN.md 存在差异

**审查意见**: 缺少 speaker_identities 表、topic_embeddings 独立表、以及多个字段。

**决策**: ✅ **部分接受**

**接受部分**:
- `speaker_identities` 表：接受，P0 功能需要
- `meetings.duration_minutes`、`meetings.participants`、`speeches.sequence_number`、`speeches.is_target_speaker`：接受添加

**不接受部分**:
- `topic_embeddings` 独立表：当前内嵌实现已满足 MVP 需求
  - 理由：简化查询、减少 JOIN、MVP 阶段向量模型版本单一
  - 后续如需支持多模型版本，再拆分为独立表

**相关修改**: 已在设计文档第 3.2 节更新表定义。

---

#### 4. SSE 实时进度端点路径不一致

**审查意见**: 后端使用 `/api/v1/upload/{task_id}/stream`，前端使用 `/api/stream/tasks/${taskId}`，TECH_DESIGN.md 使用 `/process/:task_id/stream`。

**决策**: ✅ **接受**

**解决方案**: 统一采用 `/api/v1/process/{task_id}/stream`，与 TECH_DESIGN.md 对齐。

**相关修改**: 已在设计文档第 4 节更新。

---

#### 5. 缺少任务重试、取消和会议重新处理 API

**审查意见**: TECH_DESIGN.md 设计了 cancel/retry/reprocess 端点，后端设计缺失。

**决策**: ❌ **不接受（MVP简化）**

**理由**:
1. Celery 已内置重试机制（max_retries=3）
2. 任务取消和重新处理属于"体验优化"功能，非 P0 核心流程
3. 用户遇到失败可重新上传文件

**解决方案**: 标记为二阶段功能，后续补充：
- `POST /api/v1/process/{task_id}/cancel`
- `POST /api/v1/process/{task_id}/retry`
- `POST /api/v1/meetings/{meeting_id}/reprocess`

**相关修改**: 已在设计文档第 1.1 节范围说明中添加。

---

#### 6. 会议搜索方案效率存疑

**审查意见**: 使用 selectinload 加载所有 speeches 然后在 Python 层匹配，性能差。

**决策**: ✅ **接受（标注优化方向）**

**理由**:
当前方案在 MVP 数据量下可接受，但审查意见正确——随着数据增长需要优化。

**解决方案**:
1. 当前版本保留简化方案，但添加明确的性能注释
2. 明确标注优化方向：使用 PostgreSQL `pg_trgm` GIN 索引 + `ILIKE` 查询
3. 在 API 中添加 `page`、`per_page`、`sort`、`start_date`、`end_date` 参数

**相关修改**: 已在设计文档第 5.1 节更新搜索策略说明。

---

#### 7. API Key 加密算法与架构规范不一致

**审查意见**: 后端使用 Fernet，TECH_DESIGN.md 要求 AES-256-GCM 并支持密钥轮换。

**决策**: ✅ **接受**

**理由**: 安全性要求必须遵循架构规范。

**解决方案**:
1. 改用 AES-256-GCM 实现
2. 在 `user_model_configs` 表中添加 `encryption_version` 字段支持密钥轮换
3. 参考 TECH_DESIGN.md 1.3.1 节实现

**相关修改**: 已在设计文档第 7.1 节更新。

---

#### 8. 长文本分块处理仅停留在接口预留

**审查意见**: 仅定义了 `chunk_and_process` 函数签名，无具体实现策略。

**决策**: ❌ **不接受（P1延后）**

**理由**:
1. PRODUCT_DESIGN.md 将"智能分块"列为 P1 功能（5万字会议）
2. MVP 阶段优先验证核心流程，长文本处理可延后

**解决方案**: 保留接口预留，后续迭代实现完整的 `TextChunker` 类：
- 分块算法（按段落/句子/Token）
- 上下文重叠策略
- 结果合并逻辑

**相关修改**: 已在设计文档第 5.3 节添加说明。

---

### 轻微问题

#### 9. 未定义统一 API 响应信封格式

**审查意见**: 前端 hooks 依赖统一的 `{ success, data, meta/error }` 结构。

**决策**: ✅ **接受**

**解决方案**: 补充统一响应格式，引用 TECH_DESIGN.md 2.2 节定义：

```python
class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    meta: dict[str, Any] | None = None
    error: ErrorDetail | None = None
```

**相关修改**: 已在设计文档第 4 节添加。

---

#### 10. 知识图谱布局缺少保存/更新端点

**审查意见**: 前端支持拖拽调整节点位置，后端无对应端点。

**决策**: ✅ **接受**

**解决方案**: 添加 `POST /api/v1/knowledge-graph/layout` 端点，支持保存用户调整后的节点位置。

**相关修改**: 已在设计文档第 4 节添加。

---

#### 11. 导出 API 与认证 API 范围边界

**审查意见**: 文档将认证和导出排除在 MVP 外，但产品文档列为 P0/P1。

**决策**: ❌ **不接受（二阶段）**

**理由**:
1. 当前任务明确要求聚焦于核心流程（上传→解析→清理→标签→图谱）
2. 认证和导出可作为独立迭代，不影响核心功能验证

**解决方案**: 在文档中明确标注为"二阶段依赖"，而非完全删除。

**相关修改**: 已在设计文档第 1.1 节更新。

---

#### 12. 会议处理状态机过于简化

**审查意见**: 仅定义 PENDING→PROCESSING→SUCCESS/FAILED，缺少细粒度状态。

**决策**: ✅ **接受**

**解决方案**: 采用 TECH_DESIGN.md 中的完整状态机：
- `PENDING` → `PARSING` → `EXTRACTING` → `CLEANING` → `TAGGING` → `BUILDING_GRAPH` → `SUCCESS`
- 各阶段有明确的百分比映射（parsing:10%, extracting:25-40%, cleaning:40-70%, tagging:75%, building:90%, complete:100%）

**相关修改**: 已在设计文档第 6.1 节更新。

---

#### 13. 未提及 rate limiting、health check

**审查意见**: TECH_ARCHITECTURE.md 要求限流，K8s 需要 /health 探针。

**决策**: ✅ **接受**

**解决方案**:
1. 添加 `GET /health` 端点（数据库连通性检查）
2. 使用 `slowapi` 库实现基于 Redis 的 rate limiting

**相关修改**: 已在设计文档第 4 节添加。

---

## 修改后的设计文档清单

| 章节 | 修改内容 | 接受状态 |
|------|----------|----------|
| 1.1 范围说明 | 标注二阶段功能（分块上传、任务取消/重试、导出/认证） | 部分接受 |
| 3.2 表定义 | 添加 speaker_identities 表、补全 meetings/speeches 字段 | 接受 |
| 4 API路由 | 统一 SSE 路径、添加布局保存、health、统一响应格式 | 接受 |
| 5.1 搜索策略 | 标注当前简化方案，明确 pg_trgm 优化方向 | 接受 |
| 5.3 分块处理 | 标注为P1预留接口 | 不接受 |
| 6.1 Celery任务 | 补充架构说明、细化状态机 | 接受 |
| 7.1 加密策略 | 改为 AES-256-GCM + encryption_version | 接受 |

---

## 总结

本次审查帮助我们识别了设计中的关键改进点。我们已根据优先级和 MVP 范围做了取舍：

- **核心改进**（Schema 对齐、API 路径统一、响应格式、加密算法、状态机）已接受并修改
- **体验优化**（分块上传、任务取消/重试）标记为二阶段
- **架构说明**（Celery 桥接模式）补充详细解释

修改后的设计文档已同步更新。

---

**文档版本**: 1.1  
**更新日期**: 2026-04-03  
**状态**: 已根据审查反馈修改  
