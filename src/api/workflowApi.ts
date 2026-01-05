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

// 执行工作流（流式）
export function executeWorkflowStream(
  workflow: Workflow,
  callbacks: {
    onNodeStart?: (log: NodeExecutionLog) => void;
    onNodeComplete?: (log: NodeExecutionLog) => void;
    onComplete?: (result: WorkflowExecutionResult) => void;
    onError?: (error: string) => void;
  }
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE_URL}/workflow/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workflow }),
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("执行工作流失败");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 按双换行分割事件
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const eventBlock of events) {
            if (!eventBlock.trim()) continue;

            const lines = eventBlock.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              }
            }

            if (eventType && eventData) {
              try {
                const parsed = JSON.parse(eventData);
                switch (eventType) {
                  case "node_start":
                    callbacks.onNodeStart?.(parsed as NodeExecutionLog);
                    break;
                  case "node_complete":
                    callbacks.onNodeComplete?.(parsed as NodeExecutionLog);
                    break;
                  case "complete":
                    callbacks.onComplete?.(parsed as WorkflowExecutionResult);
                    break;
                }
              } catch (e) {
                console.error("解析 SSE 数据失败:", e, eventData);
              }
            }
          }
        }
      };

      processStream().catch((err) => {
        if (err.name !== "AbortError") {
          callbacks.onError?.(err.message);
        }
      });
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.(err.message);
      }
    });

  // 返回取消函数
  return () => controller.abort();
}

// 执行工作流（同步，兼容旧接口）
export async function executeWorkflow(
  workflow: Workflow
): Promise<WorkflowExecutionResult> {
  return new Promise((resolve, reject) => {
    executeWorkflowStream(workflow, {
      onComplete: resolve,
      onError: (error) => reject(new Error(error)),
    });
  });
}
