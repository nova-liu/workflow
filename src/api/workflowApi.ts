import { TaskInput, TaskOutput } from "../types/workflow";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080/api";

// 工作流节点
export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  config: TaskInput;
}

// 工作流边
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

// 工作流定义
export interface Workflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// 节点执行日志
export interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  message: string;
  input?: TaskInput;
  output?: TaskOutput;
  duration?: number;
  timestamp: string;
}

// 工作流执行结果
export interface WorkflowExecutionResult {
  status: "success" | "error";
  startTime: string;
  endTime: string;
  logs: NodeExecutionLog[];
  finalOutput?: TaskOutput;
  error?: string;
}

// 任务配置参数
export interface TaskConfigParam {
  name: string;
  type: string;
  label: string;
  required: boolean;
  default?: any;
  description?: string;
  options?: { label: string; value: any }[];
}

// 任务配置
export interface TaskConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  params: TaskConfigParam[];
}

// 健康检查
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
}> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("后端服务不可用");
  }
  return response.json();
}

// 获取所有任务类型
export async function listTasks(): Promise<Record<string, TaskConfig[]>> {
  const response = await fetch(`${API_BASE_URL}/tasks`);
  if (!response.ok) {
    throw new Error("获取任务列表失败");
  }
  const data = await response.json();
  return data.tasks;
}

// 获取任务配置
export async function getTaskConfig(taskType: string): Promise<TaskConfig> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskType}/config`);
  if (!response.ok) {
    throw new Error(`获取任务配置失败: ${taskType}`);
  }
  return response.json();
}

// 执行工作流
export async function executeWorkflow(
  workflow: Workflow
): Promise<WorkflowExecutionResult> {
  const response = await fetch(`${API_BASE_URL}/workflow/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workflow }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`执行工作流失败: ${errorText}`);
  }

  return response.json();
}

// 实时执行工作流（带回调）
export async function executeWorkflowWithCallbacks(
  workflow: Workflow,
  callbacks: {
    onNodeStart?: (nodeId: string, nodeName: string) => void;
    onNodeComplete?: (
      nodeId: string,
      nodeName: string,
      output: TaskOutput
    ) => void;
    onNodeError?: (nodeId: string, nodeName: string, error: string) => void;
    onComplete?: (result: WorkflowExecutionResult) => void;
  }
): Promise<WorkflowExecutionResult> {
  // 标记所有节点为 pending
  workflow.nodes.forEach((node) => {
    callbacks.onNodeStart?.(node.id, node.label);
  });

  // 执行工作流
  const result = await executeWorkflow(workflow);

  // 通知各节点执行结果
  result.logs.forEach((log) => {
    if (log.status === "success") {
      callbacks.onNodeComplete?.(log.nodeId, log.nodeName, log.output!);
    } else if (log.status === "error") {
      callbacks.onNodeError?.(
        log.nodeId,
        log.nodeName,
        log.output?.error || "未知错误"
      );
    }
  });

  // 通知完成
  callbacks.onComplete?.(result);

  return result;
}
