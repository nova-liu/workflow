import React, { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Typography, Tag, Tooltip } from "antd";
import {
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { TaskType } from "../types/workflow";
import { NodeExecutionStatus } from "../engine/WorkflowExecutor";

const { Text } = Typography;

export interface ExecutionLog {
  status: NodeExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  duration?: number;
}

export interface TaskNodeData extends Record<string, unknown> {
  taskType: TaskType;
  label: string;
  config?: Record<string, unknown>;
  executionLog?: ExecutionLog;
}

const getStatusTag = (status: NodeExecutionStatus) => {
  const config: Record<
    NodeExecutionStatus,
    { color: string; text: string; icon: React.ReactNode }
  > = {
    pending: { color: "default", text: "等待", icon: null },
    running: {
      color: "processing",
      text: "执行中",
      icon: <SyncOutlined spin />,
    },
    success: { color: "success", text: "成功", icon: <CheckCircleOutlined /> },
    error: { color: "error", text: "失败", icon: <CloseCircleOutlined /> },
    skipped: { color: "default", text: "跳过", icon: null },
  };
  const { color, text, icon } = config[status] || config.pending;
  return (
    <Tag color={color} icon={icon} style={{ marginRight: 0 }}>
      {text}
    </Tag>
  );
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const JsonPreview: React.FC<{ data: unknown; maxLength?: number }> = ({
  data,
  maxLength = 100,
}) => {
  if (data === undefined || data === null)
    return <Text type="secondary">-</Text>;
  const str = JSON.stringify(data, null, 2);
  const truncated =
    str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
  return (
    <Tooltip
      title={
        <pre
          style={{ margin: 0, maxHeight: 300, overflow: "auto", color: "#fff" }}
        >
          {str}
        </pre>
      }
      placement="left"
    >
      <pre
        style={{
          margin: 0,
          fontSize: 10,
          background: "#000",
          color: "#fff",
          padding: 6,
          borderRadius: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          maxHeight: 60,
          cursor: "pointer",
        }}
      >
        {truncated}
      </pre>
    </Tooltip>
  );
};

const TaskNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as TaskNodeData;
  const { taskType, label, executionLog } = nodeData;
  const [expanded, setExpanded] = useState(true);

  // 是否有执行状态（包括 pending 和 running）
  const hasExecutionStatus = executionLog !== undefined;
  // 是否有执行结果（success 或 error，有输入输出）
  const hasExecutionResult =
    executionLog &&
    (executionLog.status === "success" || executionLog.status === "error");

  const borderColor =
    executionLog?.status === "error"
      ? "#ff4d4f"
      : executionLog?.status === "success"
      ? "#52c41a"
      : executionLog?.status === "running"
      ? "#1890ff"
      : selected
      ? taskType.color
      : "#303030";

  return (
    <div
      style={{
        background: "#1f1f1f",
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        boxShadow: selected
          ? `0 0 12px ${taskType.color}40`
          : "0 2px 8px rgba(0,0,0,0.3)",
        minWidth: 220,
        maxWidth: 320,
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

      {/* 节点头部 */}
      <div
        style={{
          background: taskType.color,
          padding: "8px 12px",
          borderRadius: "6px 6px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{taskType.icon}</span>
          <Text strong style={{ color: "#fff", fontSize: 12 }}>
            {label}
          </Text>
        </div>
        {hasExecutionStatus && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {executionLog.duration !== undefined && (
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10 }}>
                {formatDuration(executionLog.duration)}
              </Text>
            )}
            {getStatusTag(executionLog.status)}
          </div>
        )}
      </div>

      {/* 执行日志展示 */}
      {hasExecutionResult && (
        <div style={{ borderTop: "1px solid #303030" }}>
          <div
            style={{
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              background: "#262626",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <Text type="secondary" style={{ fontSize: 11 }}>
              执行日志
            </Text>
            {expanded ? (
              <UpOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
            ) : (
              <DownOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
            )}
          </div>

          {expanded && (
            <div style={{ padding: "8px 12px", background: "#1a1a1a" }}>
              {/* 输入 */}
              <div style={{ marginBottom: 8 }}>
                <Text
                  type="secondary"
                  style={{ fontSize: 10, display: "block", marginBottom: 4 }}
                >
                  输入
                </Text>
                <JsonPreview data={executionLog.input} />
              </div>

              {/* 输出 */}
              <div>
                <Text
                  type={
                    executionLog.status === "error" ? "danger" : "secondary"
                  }
                  style={{ fontSize: 10, display: "block", marginBottom: 4 }}
                >
                  {executionLog.status === "error" ? "错误" : "输出"}
                </Text>
                <JsonPreview data={executionLog.output} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 未执行时显示描述 */}
      {!hasExecutionStatus && (
        <div style={{ padding: "10px 12px" }}>
          <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
            {taskType.description}
          </Text>
        </div>
      )}

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
