import React, { useState } from "react";
import { Input, Collapse, Spin, Button, Badge, Typography, Empty } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
  DragOutlined,
} from "@ant-design/icons";
import { TaskType, TaskCategory, CATEGORY_NAMES } from "../types/workflow";
import { useTaskTypes } from "../hooks/useTaskTypes";

const { Text } = Typography;

interface TaskPanelProps {
  onDragStart: (event: React.DragEvent, taskType: TaskType) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ onDragStart }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { taskTypes, loading, error, refresh } = useTaskTypes();

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

  const categories: TaskCategory[] = ["action", "condition"];

  if (loading) {
    return (
      <div className="task-panel">
        <div className="task-panel-header">
          <Text strong style={{ fontSize: 16 }}>
            📦 任务面板
          </Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            padding: 40,
          }}
        >
          <Spin tip="加载任务列表..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-panel">
        <div className="task-panel-header">
          <Text strong style={{ fontSize: 16 }}>
            📦 任务面板
          </Text>
        </div>
        <div style={{ padding: 24, textAlign: "center" }}>
          <WarningOutlined
            style={{ fontSize: 32, color: "#ff4d4f", marginBottom: 12 }}
          />
          <div style={{ color: "#ff4d4f", marginBottom: 12 }}>{error}</div>
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  const collapseItems = categories
    .filter((category) => groupedTasks[category]?.length > 0)
    .map((category) => ({
      key: category,
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span>{CATEGORY_NAMES[category]}</span>
          <Badge
            count={groupedTasks[category].length}
            style={{ backgroundColor: "#52c41a" }}
          />
        </div>
      ),
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {groupedTasks[category].map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => onDragStart(e, task)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 12px",
                background: "#1f1f1f",
                borderRadius: 6,
                borderLeft: `3px solid ${task.color}`,
                cursor: "grab",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#2a2a2a";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1f1f1f";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <span style={{ fontSize: 20, marginRight: 10 }}>{task.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>
                  {task.name}
                </div>
                <Text type="secondary" ellipsis style={{ fontSize: 11 }}>
                  {task.description}
                </Text>
              </div>
            </div>
          ))}
        </div>
      ),
    }));

  return (
    <div className="task-panel">
      <div className="task-panel-header">
        <Text
          strong
          style={{ fontSize: 16, marginBottom: 12, display: "block" }}
        >
          📦 任务面板
        </Text>
        <Input
          placeholder="搜索任务..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
      </div>

      <div className="task-panel-body">
        {taskTypes.length === 0 ? (
          <Empty description="暂无可用任务">
            <Button onClick={refresh}>刷新</Button>
          </Empty>
        ) : (
          <Collapse defaultActiveKey={categories} ghost items={collapseItems} />
        )}
      </div>

      <div className="task-panel-footer">
        <Text type="secondary" style={{ fontSize: 12 }}>
          <DragOutlined /> 拖拽任务到画布上创建节点
        </Text>
      </div>
    </div>
  );
};

export default TaskPanel;
