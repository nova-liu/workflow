import React, { useState } from "react";
import {
  TASK_TYPES,
  TaskType,
  TaskCategory,
  CATEGORY_NAMES,
} from "../types/workflow";

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

  const toggleCategory = (category: TaskCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredTasks = TASK_TYPES.filter(
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
      </div>

      <div className="task-panel-footer">
        <p>💡 拖拽任务到画布上创建节点</p>
      </div>
    </div>
  );
};

export default TaskPanel;
