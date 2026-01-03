// 任务类型定义
export interface TaskType {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  category: TaskCategory;
}

export type TaskCategory = "trigger" | "action" | "condition" | "transform";

// 预定义的任务类型
export const TASK_TYPES: TaskType[] = [
  // 触发器
  {
    id: "http-trigger",
    name: "HTTP 触发器",
    icon: "🌐",
    color: "#4CAF50",
    description: "通过 HTTP 请求触发工作流",
    category: "trigger",
  },
  {
    id: "schedule-trigger",
    name: "定时触发器",
    icon: "⏰",
    color: "#4CAF50",
    description: "按照设定的时间计划触发",
    category: "trigger",
  },
  {
    id: "webhook-trigger",
    name: "Webhook",
    icon: "🔔",
    color: "#4CAF50",
    description: "接收外部 Webhook 调用",
    category: "trigger",
  },

  // 操作
  {
    id: "http-request",
    name: "HTTP 请求",
    icon: "📡",
    color: "#2196F3",
    description: "发送 HTTP 请求",
    category: "action",
  },
  {
    id: "email-send",
    name: "发送邮件",
    icon: "📧",
    color: "#2196F3",
    description: "发送电子邮件",
    category: "action",
  },
  {
    id: "database-query",
    name: "数据库查询",
    icon: "🗄️",
    color: "#2196F3",
    description: "执行数据库查询",
    category: "action",
  },
  {
    id: "file-operation",
    name: "文件操作",
    icon: "📁",
    color: "#2196F3",
    description: "读取或写入文件",
    category: "action",
  },
  {
    id: "notification",
    name: "发送通知",
    icon: "🔔",
    color: "#2196F3",
    description: "发送推送通知",
    category: "action",
  },

  // 条件
  {
    id: "if-condition",
    name: "条件判断",
    icon: "❓",
    color: "#FF9800",
    description: "根据条件分支执行",
    category: "condition",
  },
  {
    id: "switch",
    name: "多路分支",
    icon: "🔀",
    color: "#FF9800",
    description: "根据值选择不同分支",
    category: "condition",
  },
  {
    id: "loop",
    name: "循环",
    icon: "🔄",
    color: "#FF9800",
    description: "循环执行任务",
    category: "condition",
  },

  // 转换
  {
    id: "data-transform",
    name: "数据转换",
    icon: "🔧",
    color: "#9C27B0",
    description: "转换数据格式",
    category: "transform",
  },
  {
    id: "json-parse",
    name: "JSON 解析",
    icon: "📋",
    color: "#9C27B0",
    description: "解析 JSON 数据",
    category: "transform",
  },
  {
    id: "filter",
    name: "数据过滤",
    icon: "🔍",
    color: "#9C27B0",
    description: "过滤数据",
    category: "transform",
  },
  {
    id: "aggregate",
    name: "数据聚合",
    icon: "📊",
    color: "#9C27B0",
    description: "聚合数据",
    category: "transform",
  },
];

// 获取分类名称
export const CATEGORY_NAMES: Record<TaskCategory, string> = {
  trigger: "触发器",
  action: "操作",
  condition: "条件",
  transform: "转换",
};
