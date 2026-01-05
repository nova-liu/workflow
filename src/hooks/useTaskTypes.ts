import { useState, useEffect, useCallback } from "react";
import {
  TaskType,
  TaskCategory,
  CATEGORY_CONFIG,
  getTaskIcon,
} from "../types/workflow";
import { listTasks, TaskConfig } from "../api/workflowApi";

// Hook 返回类型
export interface UseTaskTypesResult {
  taskTypes: TaskType[];
  groupedTasks: Record<TaskCategory, TaskType[]>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// 将后端 TaskConfig 转换为前端 TaskType
const convertToTaskType = (config: TaskConfig): TaskType => {
  const category = config.category as TaskCategory;
  const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.action;

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    category,
    icon: getTaskIcon(config.id),
    color: categoryConfig.color,
    params: config.params?.map((p) => ({
      name: p.name,
      type: p.type,
      label: p.label,
      required: p.required,
      default: p.default,
      description: p.description,
      options: p.options,
    })),
  };
};

// 从后端获取任务类型的 Hook
export function useTaskTypes(): UseTaskTypesResult {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<
    Record<TaskCategory, TaskType[]>
  >({
    action: [],
    condition: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const tasksData = await listTasks();

      // 将后端数据转换为前端 TaskType 格式
      const allTasks: TaskType[] = [];
      const grouped: Record<TaskCategory, TaskType[]> = {
        action: [],
        condition: [],
      };

      // 遍历每个分类
      for (const [category, configs] of Object.entries(tasksData)) {
        const cat = category as TaskCategory;
        for (const config of configs) {
          const taskType = convertToTaskType(config);
          allTasks.push(taskType);
          if (grouped[cat]) {
            grouped[cat].push(taskType);
          }
        }
      }

      // 按 ID 排序
      allTasks.sort((a, b) => a.id.localeCompare(b.id));
      for (const cat of Object.keys(grouped) as TaskCategory[]) {
        grouped[cat].sort((a, b) => a.id.localeCompare(b.id));
      }

      setTaskTypes(allTasks);
      setGroupedTasks(grouped);
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取任务列表失败";
      setError(message);
      console.error("Failed to fetch task types:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskTypes();
  }, [fetchTaskTypes]);

  return {
    taskTypes,
    groupedTasks,
    loading,
    error,
    refresh: fetchTaskTypes,
  };
}

// 根据任务 ID 查找任务类型
export function findTaskType(
  taskTypes: TaskType[],
  taskId: string
): TaskType | undefined {
  return taskTypes.find((t) => t.id === taskId);
}
