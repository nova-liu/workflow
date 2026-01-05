import React from "react";
import { Button, Tag, Typography, Collapse, Space, Spin } from "antd";
import {
  CloseOutlined,
  StopOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  PauseCircleOutlined,
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

const getStatusIcon = (status: NodeExecutionStatus | ExecutionStatus) => {
  const iconStyle = { fontSize: 14 };
  switch (status) {
    case "pending":
      return <ClockCircleOutlined style={{ ...iconStyle, color: "#faad14" }} />;
    case "running":
      return <SyncOutlined spin style={{ ...iconStyle, color: "#1890ff" }} />;
    case "success":
      return <CheckCircleOutlined style={{ ...iconStyle, color: "#52c41a" }} />;
    case "error":
      return <CloseCircleOutlined style={{ ...iconStyle, color: "#ff4d4f" }} />;
    case "skipped":
      return <MinusCircleOutlined style={{ ...iconStyle, color: "#8c8c8c" }} />;
    case "cancelled":
      return <PauseCircleOutlined style={{ ...iconStyle, color: "#8c8c8c" }} />;
    default:
      return <ClockCircleOutlined style={{ ...iconStyle, color: "#8c8c8c" }} />;
  }
};

const getStatusTag = (status: ExecutionStatus) => {
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

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const JsonDisplay: React.FC<{ data: unknown }> = ({ data }) => {
  if (data === undefined || data === null) return null;
  return (
    <pre
      style={{
        background: "#1f1f1f",
        padding: 8,
        borderRadius: 4,
        fontSize: 11,
        overflow: "auto",
        maxHeight: 200,
        margin: 0,
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
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

  const collapseItems = logs.map((log, index) => {
    const hasDetails =
      (log.input && Object.keys(log.input).length > 0) || log.output;

    return {
      key: `${log.nodeId}-${index}`,
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
          }}
        >
          {getStatusIcon(log.status)}
          <Text
            type="secondary"
            style={{ fontSize: 11, fontFamily: "monospace" }}
          >
            {formatTime(log.timestamp)}
          </Text>
          <Text strong style={{ flex: 1 }}>
            {log.nodeName}
          </Text>
          {log.duration !== undefined && (
            <Tag>{formatDuration(log.duration)}</Tag>
          )}
        </div>
      ),
      children: hasDetails ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {log.message}
          </Text>
          {log.input && Object.keys(log.input).length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                📥 输入参数
              </Text>
              <JsonDisplay data={log.input} />
            </div>
          )}
          {log.output && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {log.status === "error" ? "❌ 错误详情" : "📤 输出结果"}
              </Text>
              <JsonDisplay data={log.output} />
            </div>
          )}
        </div>
      ) : (
        <Text type="secondary">{log.message}</Text>
      ),
      collapsible: hasDetails ? undefined : ("header" as const),
    };
  });

  return (
    <div className="execution-log-panel">
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
          {getStatusIcon(status)}
          <Text strong>执行日志</Text>
          {getStatusTag(status)}
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

      <div
        ref={logContainerRef}
        style={{ flex: 1, overflow: "auto", padding: 12 }}
      >
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Text type="secondary">暂无执行日志</Text>
          </div>
        ) : (
          <Collapse
            size="small"
            items={collapseItems}
            defaultActiveKey={logs
              .filter((l) => l.status === "error")
              .map((_, i) => `${_.nodeId}-${logs.indexOf(_)}`)}
          />
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

      {status === "success" && logs.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #303030",
            background: "rgba(82, 196, 26, 0.1)",
          }}
        >
          <Text type="success">
            ✅ 工作流执行完成，共{" "}
            {logs.filter((l) => l.status === "success").length} 个任务成功
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
          <Text type="danger">❌ 工作流执行失败，请检查错误日志</Text>
        </div>
      )}
    </div>
  );
};

export default ExecutionLogPanel;
