// 工作流执行相关类型定义
import { TaskInput, TaskOutput } from "../types/workflow";

// 执行状态
export type ExecutionStatus =
  | "idle"
  | "running"
  | "success"
  | "error"
  | "cancelled"
  | "completed";

// 单个节点的执行状态
export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

// 执行日志条目
export interface ExecutionLogEntry {
  timestamp: Date;
  nodeId: string;
  nodeName: string;
  status: NodeExecutionStatus;
  message: string;
  input?: TaskInput;
  output?: TaskOutput;
  duration?: number; // 执行耗时（毫秒）
}

// 节点执行状态映射
export interface NodeExecutionState {
  status: NodeExecutionStatus;
  output?: TaskOutput;
  startTime?: Date;
  endTime?: Date;
}

// 执行回调
export interface ExecutionCallbacks {
  onNodeStart?: (nodeId: string, nodeName: string) => void;
  onNodeComplete?: (
    nodeId: string,
    nodeName: string,
    output: TaskOutput
  ) => void;
  onNodeError?: (nodeId: string, nodeName: string, error: string) => void;
  onLog?: (log: ExecutionLogEntry) => void;
  onStatusChange?: (status: ExecutionStatus) => void;
}
