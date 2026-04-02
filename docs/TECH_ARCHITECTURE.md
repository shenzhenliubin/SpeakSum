# SpeakSum 技术架构评估

**版本**: 1.0  
**日期**: 2026-04-02  
**对应产品设计**: PRODUCT_DESIGN.md v1.2

---

## 1. 技术要点梳理

### 1.1 核心技术挑战

| 模块 | 技术要点 | 复杂度 | 关键决策 |
|------|---------|--------|---------|
| **文件解析** | Word/PDF/TXT/图片多格式解析，OCR 集成 | 中 | 使用 python-docx、PyPDF2、marker 等库 |
| **发言提取** | 时间戳识别、说话人分离、多轮对话关联 | 高 | 正则 + LLM 混合策略 |
| **LLM 处理** | 口语化清洗、金句提取、话题标签生成 | 高 | Kimi 2.5 为主，支持多 Provider 切换 |
| **文本分块** | 长文本智能切分，保持上下文连贯 | 高 | 贪心分组 + 上下文重叠 + LLM 后处理 |
| **知识图谱** | 话题聚类、Embedding 计算、力导向布局 | 高 | Embedding API + 缓存，增量布局算法 |
| **实时通知** | 长文本处理进度推送，跨设备同步 | 中 | SSE + Celery 任务队列 |
| **数据存储** | 多设备同步、离线支持、数据安全 | 中 | PostgreSQL + pgvector + Redis |

### 1.2 性能关键点

1. **Embedding 计算成本**: 话题语义相似度需调用 Embedding API，需设计缓存机制避免重复计算
2. **长文本处理延迟**: 单次 LLM 调用可能超过 30 秒，需异步处理 + 实时进度反馈
3. **图谱渲染性能**: 节点超过 500 时 D3.js 力导向图可能出现卡顿，需虚拟化或分层渲染
4. **多设备同步延迟**: 知识图谱布局状态同步需控制在 3 秒内

---

## 2. 架构建议

### 2.1 推荐技术栈

#### 前端
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand（轻量，适合离线同步场景）
- **可视化**: D3.js（力导向图）+ ECharts（统计图表）
- **UI 组件**: Ant Design 或 Chakra UI
- **文件上传**: react-dropzone + tus（断点续传）
- **离线存储**: IndexedDB（via dexie.js）

#### 后端
- **API 框架**: FastAPI（异步、类型安全、自动文档）
- **任务队列**: Celery + Redis（长文本处理）
- **数据库**: PostgreSQL 15+ + pgvector（向量存储）
- **缓存**: Redis（Embedding 缓存、会话管理）
- **文件存储**: 本地存储（MVP）/ MinIO（后期扩展）
- **LLM 集成**: litellm 或统一封装多 Provider

#### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **进程管理**: Supervisor / systemd

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (React)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 文件上传  │ │ 会议列表  │ │ 发言详情  │ │ 知识图谱  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │  设置    │ │  搜索    │ │ IndexedDB │                       │
│  │(API Key) │ │          │ │(离线缓存) │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx (反向代理)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   FastAPI API   │ │   SSE 推送服务   │ │   WebSocket     │
│     服务        │ │   (进度通知)     │ │  (多设备同步)    │
└────────┬────────┘ └─────────────────┘ └─────────────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                              │
┌────────▼────────┐ ┌─────────────────┐ ┌──────────────▼──┐
│  Celery Worker  │ │   PostgreSQL    │ │     Redis       │
│  (LLM 处理)      │ │   + pgvector    │ │  (缓存/队列)     │
│                 │ │                 │ │                 │
│ ┌─────────────┐ │ │ • meetings      │ │ • Embedding缓存 │
│ │  Kimi 2.5   │ │ │ • speeches      │ │ • 任务队列      │
│ │  OpenAI     │ │ │ • topics        │ │ • 会话管理      │
│ │  Claude     │ │ │ • embeddings    │ │                 │
│ └─────────────┘ │ │ • users         │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 2.3 数据模型设计

```
User
├── id: UUID
├── email: string
├── api_key_encrypted: string
├── created_at: datetime
└── devices: Device[]

Meeting
├── id: UUID
├── user_id: UUID
├── title: string
├── meeting_date: date
├── source_file: string
├── status: enum
├── created_at: datetime
└── speeches: Speech[]

Speech
├── id: UUID
├── meeting_id: UUID
├── speaker: string
├── timestamp: time
├── raw_text: text
├── cleaned_text: text
├── key_quotes: string[]
├── topics: Topic[]
└── embedding: vector(1536)

Topic
├── id: UUID
├── user_id: UUID
├── name: string
├── color: string
├── embedding: vector(1536)
└── speech_count: int

KnowledgeGraphLayout
├── id: UUID
├── user_id: UUID
├── topic_positions: JSON  # {topic_id: {x, y, radius, opacity}}
├── zoom_level: float
├── center_topic_id: UUID?
└── updated_at: datetime
```

---

## 3. 风险评估

### 3.1 高风险项

| 风险 | 影响 | 可能性 | 缓解策略 |
|------|------|--------|---------|
| **LLM API 限流/故障** | 核心功能不可用 | 中 | 1. 多 Provider 降级策略<br>2. 本地 Ollama 兜底<br>3. 任务队列 + 重试机制 |
| **长文本处理超时** | 用户体验差 | 高 | 1. 分块并行处理<br>2. SSE 实时进度<br>3. 超时自动重试 |
| **Embedding 成本过高** | 运营成本超预算 | 中 | 1. 缓存已计算向量<br>2. 话题标签去重<br>3. 增量更新策略 |
| **图谱渲染性能** | 界面卡顿 | 中 | 1. 虚拟化渲染（>100 节点）<br>2. 分层聚合<br>3. Web Worker 计算 |

### 3.2 中风险项

| 风险 | 影响 | 可能性 | 缓解策略 |
|------|------|--------|---------|
| **多设备同步冲突** | 数据不一致 | 中 | 1. 乐观锁 + 版本号<br>2. 最后写入优先<br>3. 冲突提示 |
| **OCR 识别准确率** | 发言提取错误 | 中 | 1. 支持手动编辑<br>2. 置信度标记<br>3. 多模型对比 |
| **浏览器存储限制** | 离线数据丢失 | 低 | 1. IndexedDB 配额检测<br>2. 数据分层存储<br>3. 定期云端备份 |

### 3.3 低风险项

- **API Key 安全**: Base64 编码存储，本地浏览器安全域隔离
- **跨浏览器兼容性**: 现代浏览器均支持所需 API
- **部署复杂度**: Docker Compose 一键部署

---

## 4. 关键决策建议

### 4.1 分块策略选择

**建议**: 贪心分组 + 上下文重叠 + LLM 后处理

```
原始文本 (10万字)
    ↓
贪心分组 (1000字/块, 100块)
    ↓
上下文重叠 (每块前后+50字)
    ↓
LLM 并行处理 (批次控制)
    ↓
后处理合并 (一致性修正)
    ↓
最终结果
```

**理由**:
- 纯贪心策略可能导致话题标签不一致（同一会说话题不同）
- LLM 后处理增加 10-20% token 消耗，但显著提升一致性
- 可配置开关，允许用户选择"速度优先"或"质量优先"

### 4.2 Embedding 计算策略

**建议**: 数据库持久化 + Redis 缓存

```python
# 伪代码
def get_embedding(text: str) -> list[float]:
    cache_key = f"emb:{hash(text)}"
    
    # 1. 查 Redis
    if cached := redis.get(cache_key):
        return json.loads(cached)
    
    # 2. 查数据库
    if stored := db.embeddings.find_by_hash(text_hash):
        redis.setex(cache_key, 86400, stored.vector)
        return stored.vector
    
    # 3. 调用 API
    vector = llm_client.embeddings.create(input=text)
    
    # 4. 存储
    db.embeddings.save(text_hash, vector)
    redis.setex(cache_key, 86400, json.dumps(vector))
    
    return vector
```

### 4.3 知识图谱布局策略

**建议**: 增量布局算法（用户手动调整优先）

```javascript
// 伪代码
function calculateLayout(topics, userLayout) {
    // 1. 保留用户手动调整的话题位置
    const fixedPositions = userLayout.getFixedPositions();
    
    // 2. 新话题使用力导向计算
    const newTopics = topics.filter(t => !fixedPositions.has(t.id));
    const newPositions = forceLayout(newTopics, {
        existingNodes: fixedPositions,
        repulsion: 100,
        springLength: 150
    });
    
    // 3. 合并结果
    return { ...fixedPositions, ...newPositions };
}
```

### 4.4 API 限流保护

**建议**: 令牌桶 + 多 Provider 降级

```python
# 限流配置
RATE_LIMITS = {
    "kimi": {"rpm": 10, "tpm": 10000},
    "openai": {"rpm": 60, "tpm": 60000},
    "claude": {"rpm": 20, "tpm": 40000}
}

# 降级链
PROVIDER_CHAIN = ["kimi", "openai", "claude"]
```

---

## 5. 技术债预警

### 5.1 MVP 阶段可接受债务

1. **单实例部署**: 不考虑水平扩展
2. **本地文件存储**: 暂不上云存储
3. **无全文搜索**: 仅支持话题/日期筛选（v1.5 加入 Elasticsearch）

### 5.2 必须避免的技术债

1. **不要**: 使用同步阻塞 IO 处理 LLM 调用
2. **不要**: 在数据库中存储明文 API Key
3. **不要**: 前端直接调用 LLM API（暴露 Key）
4. **不要**: 忽略错误边界和降级策略

---

## 6. 实施路径建议

### 6.1 阶段一：MVP 核心功能 (4 周)

**目标**: 完成基础文件解析、发言提取、LLM 处理、知识图谱展示

**技术重点**:
- Week 1: 文件上传 + 解析引擎（Word/PDF/TXT）
- Week 2: 发言提取 + 口语化清洗
- Week 3: 金句提取 + 话题标签 + Embedding 计算
- Week 4: 知识图谱可视化 + 基础布局算法

### 6.2 阶段二：完善与优化 (3 周)

**目标**: SSE 进度通知、多设备同步、图片 OCR

**技术重点**:
- Week 5: SSE 实时推送 + Celery 任务队列
- Week 6: 多设备同步协议 + IndexedDB 离线存储
- Week 7: 图片 OCR 集成 + 长文本分块优化

### 6.3 阶段三：高级功能 (2 周)

**目标**: 跨会议分析、图谱布局持久化、搜索优化

**技术重点**:
- Week 8: 话题关联分析 + 时间线演进图
- Week 9: 图谱布局保存/恢复 + 性能优化

---

## 7. 监控与运维建议

### 7.1 关键指标

| 指标 | 目标值 | 告警阈值 |
|------|--------|---------|
| LLM API 响应时间 | < 5s (P95) | > 10s |
| 文件处理成功率 | > 95% | < 90% |
| Embedding 缓存命中率 | > 70% | < 50% |
| 页面加载时间 | < 2s | > 5s |

### 7.2 日志规范

```python
# 结构化日志
{
    "timestamp": "2026-04-02T10:30:00Z",
    "level": "INFO",
    "event": "speech_extracted",
    "meeting_id": "uuid",
    "user_id": "uuid",
    "duration_ms": 1500,
    "token_count": 2500,
    "llm_provider": "kimi"
}
```

---

## 8. 附录

### 8.1 外部依赖清单

| 依赖 | 用途 | 许可 |
|------|------|------|
| python-docx | Word 解析 | MIT |
| PyPDF2 | PDF 解析 | BSD |
| marker | PDF 高精度解析 | MIT |
| celery | 任务队列 | BSD |
| pgvector | PostgreSQL 向量扩展 | PostgreSQL |
| d3.js | 图谱可视化 | BSD |
| dexie.js | IndexedDB 封装 | Apache 2.0 |

### 8.2 参考资源

- [FastAPI 最佳实践](https://fastapi.tiangolo.com/)
- [pgvector 文档](https://github.com/pgvector/pgvector)
- [D3.js Force Simulation](https://d3js.org/d3-force)
- [Celery 分布式任务队列](https://docs.celeryq.dev/)

---

## 9. 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 1.0 | 2026-04-02 | 初始版本，基于产品设计 v1.2 |
