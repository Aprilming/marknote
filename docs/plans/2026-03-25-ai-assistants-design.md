# AI 小助手自定义功能设计

## 概述

将现有的三个固定AI小助手改为模板形式，允许用户自定义添加、编辑、删除自己的小助手。

## 数据结构

```typescript
interface Assistant {
  id: string           // 唯一ID
  name: string         // 助手名称
  prompt: string       // 提示词内容
  createdAt: number    // 创建时间
}

// 三个模板（代码中固定，不可删除）
const defaultAssistants = [
  {
    id: 'template_1',
    name: '一号助手',
    prompt: '你是一个笔记优化助手，严格按照以下规则优化笔记内容...'
  },
  {
    id: 'template_2',
    name: '二号助手',
    prompt: '从以下文本中提取待办事项...'
  },
  {
    id: 'template_3',
    name: '三号助手',
    prompt: '你是一个提示词优化专家...'
  }
]

// 用户自定义助手列表
type UserAssistant = Omit<Assistant, 'id' | 'createdAt'> & {
  id: string
  createdAt: number
}
```

## 存储

- **用户助手**：`{appDataDir}/assistants.json`（iCloud同步）
- **模板助手**：代码中固定，不存储

```json
// assistants.json 结构
{
  "version": 1,
  "assistants": [
    {
      "id": "user_xxx",
      "name": "我的助手",
      "prompt": "提示词内容",
      "createdAt": 1742900000000
    }
  ]
}
```

## 界面设计

### 设置页面布局

```
┌─────────────────────────────────────────┐
│ AI 小助手设置                            │
├─────────────────────────────────────────┤
│                                         │
│  模板助手（横排三个，点击直接添加）        │
│  ┌─────┐  ┌─────┐  ┌─────┐             │
│  │一号  │  │二号  │  │三号  │             │
│  │助手  │  │助手  │  │助手  │             │
│  └─────┘  └─────┘  └─────┘             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  我的助手                                │
│  ┌─────────────────────────────────┐    │
│  │ 📝 助手名称          [编辑] [删除] │    │
│  │    提示词预览...                 │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 📝 助手名称          [编辑] [删除] │    │
│  │    提示词预览...                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [+ 添加助手]                            │
│                                         │
└─────────────────────────────────────────┘
```

### 右键菜单

- 仅显示用户自定义助手
- 不显示模板助手

```
┌──────────────────┐
│ ✨ 我的助手1      │
│ 📝 我的助手2      │
│ 💡 我的助手3      │
└──────────────────┘
```

## 交互逻辑

### 模板助手点击
1. 检查用户列表中是否已存在相同 `prompt` 的助手
2. 如存在相同 prompt → 提示用户"该助手已添加"，不重复添加
3. 如不存在 → 复制模板内容，添加到用户列表

### 用户助手管理
- **新增**：点击"添加助手"按钮，弹出编辑框
- **编辑**：点击编辑按钮，弹出编辑框修改名称和提示词
- **删除**：点击删除按钮，直接删除（无二次确认，简化操作）

### 右键菜单调用AI
1. 用户在编辑器中右键，选择自定义助手
2. 使用选中助手对应的 prompt 调用 AI API
3. 如果未配置 API Key，提示用户去设置

## 组件变更

### Settings.vue
- 重构 AI 设置区域，使用新的 `Assistant` 组件
- 模板助手区：三个并排的模板按钮
- 用户助手区：列表展示 + 添加按钮

### VditorEditor.vue
- 右键菜单改为动态渲染用户助手列表
- 模板助手不显示在右键菜单中

### settingStore.ts
- 保留三个模板 prompt 的默认值
- 不再存储用户助手数据（改用独立文件）

### 新增 assistantsStore.ts
- 管理用户助手的 CRUD 操作
- 与 iCloud 文件同步

## 实现步骤

1. 创建 `assistantsStore.ts` 管理用户助手
2. 创建 `AssistantEditor.vue` 编辑对话框组件
3. 修改 `Settings.vue` AI 设置区域布局
4. 修改 `VditorEditor.vue` 右键菜单渲染逻辑
5. 实现 iCloud 文件读写（复用现有 `useFileSystem` 逻辑）

## 文件变更

| 文件 | 操作 |
|------|------|
| `src/stores/assistantsStore.ts` | 新增 |
| `src/components/Assistant/AssistantEditor.vue` | 新增 |
| `src/components/Settings/Settings.vue` | 修改 |
| `src/components/Editor/VditorEditor.vue` | 修改 |
| `src/stores/settingStore.ts` | 修改（移除用户助手相关） |
