## Agent 4 (Aphrodite) 任务：前端设计

**你的身份**: 前端设计师
**工作目录**: `~/claudcode-project/SpeakSum-wt/feature-frontend-design`
**当前分支**: `feature/frontend-design`

---

### 任务目标

基于产品设计文档，设计完整的前端UI/UX：
1. 设计系统（颜色、字体、间距）
2. 组件规范
3. 页面布局设计
4. 交互流程定义

---

### 输入

**必读文档** (位于 `../develop/docs/`):
- `PRODUCT_DESIGN.md` - 产品设计文档
- `TECH_ARCHITECTURE.md` - 技术架构

---

### 输出要求

文件路径: `docs/FRONTEND_DESIGN.md`

内容结构:
```markdown
# 前端设计文档

## 1. 设计系统
### 1.1 颜色系统
### 1.2 字体系统
### 1.3 间距系统
### 1.4 阴影与圆角

## 2. 组件规范
### 2.1 Button
### 2.2 Card
### 2.3 Input
### 2.4 TopicIsland

## 3. 页面设计
### 3.1 Home
### 3.2 Timeline
### 3.3 KnowledgeGraph
### 3.4 Upload
### 3.5 Settings

## 4. 交互设计
## 5. API集成
## 6. 状态管理
```

---

### 设计约束

- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5.x
- **状态**: Zustand
- **数据**: TanStack Query
- **可视化**: D3.js
- **样式**: CSS Variables

---

### 颜色主题

```css
:root {
  /* 主色调 - 赤陶橙 */
  --color-primary: #E07A5F;
  --color-primary-light: #F4A261;
  --color-primary-dark: #C45C3E;
  
  /* 辅助色 - 苔藓绿 */
  --color-secondary: #81B29A;
  
  /* 中性色 */
  --color-background: #FDFBF7;
  --color-surface: #FFFFFF;
  --color-text-primary: #3D405B;
  --color-text-secondary: #6B6E8A;
}
```

---

### 可用Skill

- `frontend-design` - 前端设计规范
- `pencil` - 可视化设计

---

### 验收标准

- [ ] 设计系统完整
- [ ] 组件规范清晰
- [ ] 所有页面有布局
- [ ] 交互流程定义
- [ ] 提交并推送到 feature/frontend-design

---

### 注意事项

**重要**: API端点请以 `../develop/docs/openapi.yaml` 为准，不要自行定义！
