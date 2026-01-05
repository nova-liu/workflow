# Workflow Orchestration System

> 一个可视化工作流编排系统。拖拽、连接和组合任务快速构建自动化工作流。

## 功能特性

- **任务面板**：左侧显示所有可用任务类型，支持分类展开和拖拽。
- **可视化画布**：将任务节点拖拽到中心画布上，连接节点形成工作流。
- **节点配置**：在右侧面板编辑节点名称、查看任务类型和描述，或删除节点。
- **实时执行**：执行工作流时，实时显示每个任务的执行状态（等待、执行中、成功、失败）。
- **执行日志**：每个任务节点上实时显示执行日志，包括输入参数、输出结果和执行耗时。
- **流式返回**：后端使用 SSE（Server-Sent Events）流式推送任务执行结果，前端实时更新节点状态。
- **导出和清空**：导出当前工作流为 JSON 或清空画布。
- **响应式设计**：支持 Dark Mode 的现代化 UI。

## 当前支持的任务类型

| 分类 | 任务        |
| ---- | ----------- |
| 操作 | HTTP 请求   |
| 条件 | If 条件判断 |

## 快速开始

### 前端

1. 安装依赖：

   ```bash
   cd /Users/solar/projects/nova/workflow
   npm install
   ```

2. 启动开发服务器：

   ```bash
   npm start
   ```

   打开 [http://localhost:3000](http://localhost:3000)

3. 构建生产版本：
   ```bash
   npm run build
   ```

### 后端

1. 启动后端服务（Go）：
   ```bash
   cd /Users/solar/projects/nova/workflow/backend/cmd/server
   go run main.go
   ```
   服务运行在 `http://localhost:8080`

## 使用说明

### 构建工作流

1. **添加任务**：从左侧任务面板拖拽任务到中心画布
2. **连接任务**：从一个节点的下方连接点拖拽到另一个节点的上方连接点
3. **配置任务**：点击节点在右侧编辑名称、查看类型信息、修改参数配置
4. **删除任务**：点击节点右侧面板的删除按钮

### 执行工作流

1. **点击执行**：点击右上角"执行"按钮启动工作流
2. **实时监控**：
   - 未执行任务显示"等待"状态
   - 正在执行的任务显示"执行中"（蓝色边框）
   - 执行成功的任务显示"成功"（绿色边框）
   - 执行失败的任务显示"失败"（红色边框）
3. **查看日志**：点击节点展开执行日志，查看任务的输入参数、输出结果和执行耗时
4. **清除日志**：执行完成后，点击"清除日志"按钮重置所有节点状态

## 技术栈

### 前端

- React 19
- TypeScript 4.9
- Ant Design 5（UI 组件库）
- @xyflow/react 12（流程图库）
- UUID（ID 生成）

### 后端

- Go 1.21
- Gin Web Framework
- 支持 SSE（Server-Sent Events）流式推送
- 拓扑排序实现任务执行顺序

## 项目结构

```
workflow/
├── src/                          # React 前端代码
│   ├── components/               # 主要 UI 组件
│   │   ├── WorkflowCanvas.tsx   # 工作流画布
│   │   ├── TaskNode.tsx         # 任务节点（支持执行日志显示）
│   │   ├── TaskPanel.tsx        # 左侧任务面板
│   │   ├── TaskConfigPanel.tsx  # 右侧配置面板
│   │   └── ExecutionLogPanel.tsx # 执行日志组件
│   ├── api/                      # API 接口
│   │   └── workflowApi.ts       # 工作流 API（SSE 流式处理）
│   ├── engine/                   # 执行引擎
│   │   └── WorkflowExecutor.ts  # 工作流执行器
│   ├── types/                    # TypeScript 类型定义
│   │   └── workflow.ts
│   ├── hooks/                    # React Hooks
│   │   └── useTaskTypes.ts
│   ├── styles/                   # 样式文件
│   │   └── workflow.css
│   └── App.tsx                   # 主应用组件
│
└── backend/                      # Go 后端代码
    ├── cmd/server/
    │   └── main.go              # 服务器入口
    ├── internal/
    │   ├── api/
    │   │   ├── router.go        # 路由注册
    │   │   ├── workflow.go      # 工作流执行（SSE 实现）
    │   │   ├── tasks.go         # 任务类型 API
    │   │   └── health.go        # 健康检查
    │   ├── executor/            # 任务执行器
    │   │   ├── http_request.go  # HTTP 请求任务
    │   │   ├── conditions.go    # 条件判断任务
    │   │   └── registry.go      # 执行器注册
    │   └── types/
    │       └── types.go         # 类型定义
    └── go.mod                   # Go 模块定义
```

## 核心设计

### 前端与后端通信

- **REST API**：用于获取任务类型和配置
- **SSE（Server-Sent Events）**：用于流式推送工作流执行结果
  - `event: node_start`：节点开始执行
  - `event: node_complete`：节点执行完成（包含执行结果）
  - `event: complete`：工作流执行完成

### 任务执行流程

1. 前端发送工作流定义（节点和边）到后端
2. 后端进行拓扑排序确定执行顺序
3. 后端按顺序执行每个任务，使用 SSE 流式推送结果
4. 前端接收 SSE 事件，实时更新节点状态和执行日志

### 节点状态管理

- **pending**：等待执行
- **running**：正在执行
- **success**：执行成功
- **error**：执行失败
- **skipped**：被跳过

## 环境配置

### 前端环境变量

在 `.env` 文件中配置（或通过环境变量）：

```
REACT_APP_API_URL=http://localhost:8080/api
```

### 后端配置

- 服务监听端口：`8080`
- 支持 CORS 跨域请求

## 开发指南

### 添加新的任务类型

1. 在后端 `internal/executor/` 目录创建新的执行器文件
2. 实现 `TaskExecutor` 接口
3. 在 `registry.go` 中注册执行器
4. 前端会自动通过 API 获取新的任务类型

### 修改 UI 样式

- 使用 Ant Design 组件库
- Dark Mode 已内置，通过 `ConfigProvider` 统一配置
- 自定义样式在 `src/styles/workflow.css`

## 生产部署

### 前端

```bash
npm run build
# 静态文件在 build/ 目录，可部署到任何静态服务器（Nginx、CDN 等）
```

### 后端

```bash
cd backend
go build -o workflow-engine ./cmd/server
./workflow-engine
```

## 故障排除

### 节点卡在"执行中"状态

- 检查后端服务是否正常运行
- 检查浏览器控制台是否有错误
- 确认后端 SSE 响应正确（使用 curl 测试）

### 前端无法连接后端

- 确认后端服务已启动（`http://localhost:8080/api/health`）
- 检查 `REACT_APP_API_URL` 环境变量是否正确
- 检查 CORS 配置是否允许前端跨域请求

## 许可证

MIT

---

**项目维护者**：Nova Workflow Team

**最后更新**：2026 年 1 月 5 日
