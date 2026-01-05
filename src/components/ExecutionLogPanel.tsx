import React from "react";
import { Button, Tag, Typography, Space, Spin } from "antd";
import {
  CloseOutlined,
  StopOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import {
  ExecutionLogEntry,
  ExecutionStatus,
  NodeExecutionStatus,
} from "../engine/WorkflowExecutor";

const { Text } = Typography;

interface ExecutionLogPanelProps {
  logs: ExecutionLogEntry[];
  status: ExecutionStatus;
  onClose: () => void;
  onCancel?: () => void;
}

const getStatusTag = (status: NodeExecutionStatus) => {
  const config: Record<NodeExecutionStatus, { color: string; text: string }> = {
    pending: { color: "default", text: "等待" },
    running: { color: "processing", text: "执行中" },
    success: { color: "success", text: "成功" },
    error: { color: "error", text: "失败" },
    skipped: { color: "default", text: "跳过" },
  };
  const { color, text } = config[status] || config.pending;
  return <Tag color={color}>{text}</Tag>;
};

const getWorkflowStatusTag = (status: ExecutionStatus) => {
  const config: Record<ExecutionStatus, { color: string; text: string }> = {
    idle: { color: "default", text: "等待执行" },
    running: { color: "processing", text: "执行中..." },
    success: { color: "success", text: "执行成功" },
    error: { color: "error", text: "执行失败" },
    cancelled: { color: "default", text: "已取消" },
    completed: { color: "success", text: "执行完成" },
  };
  const { color, text } = config[status] || config.idle;
  return <Tag color={color}>{text}</Tag>;
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const JsonBlock: React.FC<{ label: string; data: unknown }> = ({
  label,
  data,
}) => {
  if (data === undefined || data === null) return null;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text
        type="secondary"
        style={{ fontSize: 11, marginBottom: 4, display: "block" }}
      >
        {label}
      </Text>
      <pre
        style={{
          background: "#141414",
          padding: 8,
          borderRadius: 4,
          fontSize: 11,
          overflow: "auto",
          maxHeight: 150,
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

// 合并同一个节点的日志，只保留最终状态
const mergeLogsByNode = (logs: ExecutionLogEntry[]): ExecutionLogEntry[] => {
  const nodeMap = new Map<string, ExecutionLogEntry>();
  logs.forEach((log) => {
    const existing = nodeMap.get(log.nodeId);
    if (!existing || log.status !== "pending") {
      nodeMap.set(log.nodeId, log);
    }
  });
  return Array.from(nodeMap.values());
};

const TaskLogCard: React.FC<{ log: ExecutionLogEntry }> = ({ log }) => {
  return (
    <div
      style={{
        background: "#262626",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        border:
          log.status === "error" ? "1px solid #ff4d4f" : "1px solid #303030",
      }}
    >
      {/* 头部：任务名称 + 状态 + 耗时 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Space>
          <Text strong>{log.nodeName}</Text>
          {getStatusTag(log.status)}
        </Space>
        {log.duration !== undefined && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDuration(log.duration)}
          </Text>
        )}
      </div>

      {/* 输入输出并排显示 */}
      <div style={{ display: "flex", gap: 12 }}>
        <JsonBlock label="输入" data={log.input} />
        <JsonBlock
          label={log.status === "error" ? "错误" : "输出"}
          data={log.output}
        />
      </div>
    </div>
  );
};

const ExecutionLogPanel: React.FC<ExecutionLogPanelProps> = ({
  logs,
  status,
  onClose,
  onCancel,
}) => {
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const mergedLogs = mergeLogsByNode(logs);

  return (
    <div className="execution-log-panel">
      {/* 头部 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #303030",
        }}
      >
        <Space>
          {status === "running" ? (
            <SyncOutlined spin style={{ color: "#1890ff" }} />
          ) : status === "success" || status === "completed" ? (
            <CheckCircleOutlined style={{ color: "#52c41a" }} />
          ) : status === "error" ? (
            <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
          ) : (
            <MinusCircleOutlined style={{ color: "#8c8c8c" }} />
          )}
          <Text strong>执行日志</Text>
          {getWorkflowStatusTag(status)}
        </Space>
        <Space>
          {status === "running" && onCancel && (
            <Button
              size="small"
              icon={<StopOutlined />}
              onClick={onCancel}
              danger
            >
              取消
            </Button>
          )}
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            type="text"
          />
        </Space>
      </div>

      {/* 日志内容 */}
      <div
        ref={logContainerRef}
        style={{ flex: 1, overflow: "auto", padding: 12 }}
      >
        {mergedLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Text type="secondary">暂无执行日志</Text>
          </div>
        ) : (
          mergedLogs.map((log) => <TaskLogCard key={log.nodeId} log={log} />)
        )}

        {status === "running" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 16,
              justifyContent: "center",
            }}
          >
            <Spin size="small" />
            <Text type="secondary">执行中...</Text>
          </div>
        )}
      </div>

      {/* 底部状态 */}
      {(status === "success" || status === "completed") &&
        mergedLogs.length > 0 && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #303030",
              background: "rgba(82, 196, 26, 0.1)",
            }}
          >
            <Text type="success">
              ✅ 工作流执行完成，共{" "}
              {mergedLogs.filter((l) => l.status === "success").length}{" "}
              个任务成功
            </Text>
          </div>
        )}

      {status === "error" && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #303030",
            background: "rgba(255, 77, 79, 0.1)",
          }}
        >
          <Text type="danger">❌ 工作流执行失败</Text>
        </div>
      )}
    </div>
  );
};

export default ExecutionLogPanel;
