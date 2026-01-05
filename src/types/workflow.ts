// 任务执行输入 - 通用 JSON 格式
export interface TaskInput {
  [key: string]: unknown;
}

// 任务执行输出 - 必须包含 error 字段
export interface TaskOutput {
  error: string | null; // 空或 null 代表执行成功
  data?: unknown; // 任务返回的数据
  [key: string]: unknown; // 其他自定义输出字段
}

// 任务执行器函数类型 - 每个任务类型对应一段可执行的 TS 脚本
export type TaskExecutor = (input: TaskInput) => Promise<TaskOutput>;

// 任务脚本定义
export interface TaskScript {
  // 脚本源代码
  code: string;
  // 输入参数的 JSON Schema（用于验证）
  inputSchema?: Record<string, unknown>;
  // 输出参数的 JSON Schema（用于验证）
  outputSchema?: Record<string, unknown>;
}

// 任务参数配置
export interface TaskParamConfig {
  name: string;
  type: string;
  label: string;
  required: boolean;
  default?: unknown;
  description?: string;
  options?: { label: string; value: unknown }[];
}

// 任务类型定义（从后端获取）
export interface TaskType {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  category: TaskCategory;
  // 参数配置（从后端获取）
  params?: TaskParamConfig[];
  // 任务对应的可执行脚本
  script?: TaskScript;
  // 默认执行器（内置任务）
  executor?: TaskExecutor;
}

export type TaskCategory = "action" | "condition";

// 分类配置
export interface CategoryConfig {
  icon: string;
  color: string;
}

// 默认分类图标和颜色映射
export const CATEGORY_CONFIG: Record<TaskCategory, CategoryConfig> = {
  action: { icon: "⚡", color: "#2196F3" },
  condition: { icon: "❓", color: "#FF9800" },
};

// 默认任务图标映射（根据任务 ID 前缀）
export const getTaskIcon = (taskId: string): string => {
  const iconMap: Record<string, string> = {
    http: "🌐",
    if: "❓",
  };

  for (const [prefix, icon] of Object.entries(iconMap)) {
    if (taskId.startsWith(prefix)) {
      return icon;
    }
  }
  return "📦"; // 默认图标
};

// 获取分类名称
export const CATEGORY_NAMES: Record<TaskCategory, string> = {
  action: "操作",
  condition: "条件",
};

// 创建成功的任务输出
export const createSuccessOutput = (data?: unknown): TaskOutput => ({
  error: null,
  data,
});

// 创建失败的任务输出
export const createErrorOutput = (
  error: string,
  data?: unknown
): TaskOutput => ({
  error,
  data,
});

// 检查任务是否执行成功
export const isTaskSuccess = (output: TaskOutput): boolean => {
  return output.error === null || output.error === "";
};
