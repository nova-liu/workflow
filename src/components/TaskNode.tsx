import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Typography } from "antd";
import { TaskType } from "../types/workflow";

const { Text } = Typography;

export interface TaskNodeData extends Record<string, unknown> {
  taskType: TaskType;
  label: string;
  config?: Record<string, unknown>;
}

const TaskNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as TaskNodeData;
  const { taskType, label } = nodeData;

  return (
    <div
      style={{
        background: "#1f1f1f",
        borderRadius: 8,
        border: `2px solid ${selected ? taskType.color : "#303030"}`,
        boxShadow: selected
          ? `0 0 12px ${taskType.color}40`
          : "0 2px 8px rgba(0,0,0,0.3)",
        minWidth: 180,
        transition: "all 0.2s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: taskType.color,
          width: 10,
          height: 10,
          border: "2px solid #1f1f1f",
        }}
      />

      <div
        style={{
          background: taskType.color,
          padding: "8px 12px",
          borderRadius: "6px 6px 0 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>{taskType.icon}</span>
        <Text strong style={{ color: "#fff", fontSize: 12 }}>
          {taskType.name}
        </Text>
      </div>

      <div style={{ padding: "10px 12px" }}>
        <Text
          style={{
            color: "#fff",
            fontSize: 13,
            display: "block",
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
          {taskType.description}
        </Text>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: taskType.color,
          width: 10,
          height: 10,
          border: "2px solid #1f1f1f",
        }}
      />
    </div>
  );
};

export default memo(TaskNode);
