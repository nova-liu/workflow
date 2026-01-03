import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { TaskType } from "../types/workflow";

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
      className={`task-node ${selected ? "selected" : ""}`}
      style={{
        borderColor: taskType.color,
        boxShadow: selected ? `0 0 0 2px ${taskType.color}` : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="task-handle"
        style={{ background: taskType.color }}
      />

      <div className="task-node-header" style={{ background: taskType.color }}>
        <span className="task-node-icon">{taskType.icon}</span>
        <span className="task-node-type">{taskType.name}</span>
      </div>

      <div className="task-node-body">
        <div className="task-node-label">{label}</div>
        <div className="task-node-description">{taskType.description}</div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="task-handle"
        style={{ background: taskType.color }}
      />
    </div>
  );
};

export default memo(TaskNode);
