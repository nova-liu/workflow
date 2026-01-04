import React, { useState } from "react";
import { TaskType, TaskCategory, CATEGORY_NAMES } from "../types/workflow";
import { useTaskTypes } from "../hooks/useTaskTypes";

interface TaskPanelProps {
  onDragStart: (event: React.DragEvent, taskType: TaskType) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ onDragStart }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<TaskCategory>
  >(
    () => new Set<TaskCategory>(["trigger", "action", "condition", "transform"])
  );

  // 从后端获取任务类型
  const { taskTypes, loading, error, refresh } = useTaskTypes();

  const toggleCategory = (category: TaskCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredTasks = taskTypes.filter(
    (task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedTasks = filteredTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<TaskCategory, TaskType[]>);

  const categories: TaskCategory[] = [
    "trigger",
    "action",
    "condition",
    "transform",
  ];

  // 加载中状态
  if (loading) {
    return (
      <div className="task-panel">
        <div className="task-panel-header">
          <h3>📦 任务面板</h3>
        </div>
        <div className="task-panel-loading">
          <div className="loading-spinner"></div>
          <span>加载任务列表...</span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="task-panel">
        <div className="task-panel-header">
          <h3>📦 任务面板</h3>
        </div>
        <div className="task-panel-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="retry-button" onClick={refresh}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-panel">
      <div className="task-panel-header">
        <h3>📦 任务面板</h3>
        <input
          type="text"
          placeholder="搜索任务..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="task-search"
        />
      </div>

      <div className="task-panel-body">
        {categories.map((category) => {
          const tasks = groupedTasks[category] || [];
          if (tasks.length === 0) return null;

          return (
            <div key={category} className="task-category">
              <div
                className="task-category-header"
                onClick={() => toggleCategory(category)}
              >
                <span className="task-category-toggle">
                  {expandedCategories.has(category) ? "▼" : "▶"}
                </span>
                <span className="task-category-name">
                  {CATEGORY_NAMES[category]}
                </span>
                <span className="task-category-count">{tasks.length}</span>
              </div>

              {expandedCategories.has(category) && (
                <div className="task-category-items">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="task-item"
                      draggable
                      onDragStart={(e) => onDragStart(e, task)}
                      style={{ borderLeftColor: task.color }}
                    >
                      <span className="task-item-icon">{task.icon}</span>
                      <div className="task-item-info">
                        <div className="task-item-name">{task.name}</div>
                        <div className="task-item-desc">{task.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {taskTypes.length === 0 && (
          <div className="task-panel-empty">
            <span>暂无可用任务</span>
            <button className="retry-button" onClick={refresh}>
              刷新
            </button>
          </div>
        )}
      </div>

      <div className="task-panel-footer">
        <p>💡 拖拽任务到画布上创建节点</p>
      </div>
    </div>
  );
};

export default TaskPanel;
