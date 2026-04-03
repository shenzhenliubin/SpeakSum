# MSW Mock 服务

基于 OpenAPI 规范生成的 Mock 数据，用于前端开发和测试。

## 环境变量

| 变量 | 说明 | 开发环境 | 生产环境 |
|------|------|----------|----------|
| `VITE_USE_MOCK` | 是否启用 MSW Mock | `true` | `false` |
| `VITE_API_URL` | API 基础 URL | `http://localhost:8000/api/v1` | `/api/v1` |

## Mock 端点

### 上传相关
- `POST /api/v1/upload` - 上传会议文件
- `GET /api/v1/upload/:task_id/status` - 查询处理进度（轮询）
- `GET /api/v1/upload/:task_id/stream` - SSE 实时推送进度

### 会议相关
- `GET /api/v1/meetings` - 获取会议列表（支持分页、搜索）
- `GET /api/v1/meetings/:meeting_id` - 获取会议详情
- `DELETE /api/v1/meetings/:meeting_id` - 删除会议

### 发言相关
- `GET /api/v1/meetings/:meeting_id/speeches` - 获取某会议的发言列表
- `GET /api/v1/speeches/:speech_id` - 获取发言详情
- `PATCH /api/v1/speeches/:speech_id` - 更新发言

### 知识图谱相关
- `GET /api/v1/knowledge-graph` - 获取知识图谱数据
- `GET /api/v1/knowledge-graph/topics/:topic_id/speeches` - 获取某话题下的发言

### 设置相关
- `GET /api/v1/settings/model` - 获取模型配置列表
- `PUT /api/v1/settings/model` - 更新模型配置

## 使用方式

### 开发环境
```bash
# 启用 Mock（默认）
npm run dev

# 禁用 Mock，连接真实后端
VITE_USE_MOCK=false npm run dev
```

### 测试
测试自动使用 MSW，无需额外配置。在 `setup.ts` 中已自动启动 MSW 服务器。

### 扩展 Mock

1. 编辑 `handlers.ts` 添加新的处理程序
2. 使用 `faker` 生成假数据
3. 确保返回的数据符合 `src/types/index.ts` 中定义的类型

示例：
```typescript
http.get('/api/v1/custom', () => {
  return HttpResponse.json({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
  });
}),
```
