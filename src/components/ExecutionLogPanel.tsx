import React from "react";
import {
  ExecutionLogEntry,
  ExecutionStatus,
  NodeExecutionStatus,
} from "../engine/WorkflowExecutor";

interface ExecutionLogPanelProps {
  logs: ExecutionLogEntry[];
  status: ExecutionStatus;
  onClose: () => void;
  onCancel?: () => void;
}

// 状态图标
const getStatusIcon = (
  status: NodeExecutionStatus | ExecutionStatus
): string => {
  switch (status) {
    case "pending":
      return "⏳";
    case "running":
      return "🔄";
    case "success":
      return "✅";
    case "error":
      return "❌";
    case "skipped":
      return "⏭️";
    case "cancelled":
      return "🚫";
    case "idle":
      return "💤";
    default:
      return "❓";
  }
};

// 状态文本
const getStatusText = (status: ExecutionStatus): string => {
  switch (status) {
    case "idle":
      return "等待执行";
    case "running":
      return "执行中...";
    case "success":
      return "执行成功";
    case "error":
      return "执行失败";
    case "cancelled":
      return "已取消";
    default:
      return "未知状态";
  }
};

// 格式化时间
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

// 格式化耗时
const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

// JSON 格式化显示组件
const JsonDisplay: React.FC<{ data: unknown; title: string }> = ({
  data,
  title,
}) => {
  if (data === undefined || data === null) {
    return null;
  }

  return (
    <div className="json-display">
      <div className="json-display-title">{title}</div>
      <pre className="json-display-content">
        {JSON.stringify(data, null, 2)}
      </pre>
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

  // 自动滚动到底部
  React.useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="execution-log-panel">
      <div className="log-panel-header">
        <div className="log-panel-title">
          <span className="log-status-icon">{getStatusIcon(status)}</span>
          <span>执行日志</span>
          <span className={`log-status-badge ${status}`}>
            {getStatusText(status)}
          </span>
        </div>
        <div className="log-panel-actions">
          {status === "running" && onCancel && (
            <button className="log-cancel-btn" onClick={onCancel}>
              取消
            </button>
          )}
          <button className="log-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="log-panel-body" ref={logContainerRef}>
        {logs.length === 0 ? (
          <div className="log-empty">暂无执行日志</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={`${log.nodeId}-${index}`}
              className={`log-entry ${log.status}`}
            >
              <div className="log-entry-header">
                <span className="log-entry-icon">
                  {getStatusIcon(log.status)}
                </span>
                <span className="log-entry-time">
                  {formatTime(log.timestamp)}
                </span>
                <span className="log-entry-node">{log.nodeName}</span>
                {log.duration !== undefined && (
                  <span className="log-entry-duration">
                    {formatDuration(log.duration)}
                  </span>
                )}
              </div>
              <div className="log-entry-message">{log.message}</div>

              {/* 显示输入参数 */}
              {log.input && Object.keys(log.input).length > 0 && (
                <details className="log-entry-details">
                  <summary>📥 输入参数</summary>
                  <JsonDisplay data={log.input} title="" />
                </details>
              )}

              {/* 显示输出结果 */}
              {log.output && (
                <details
                  className="log-entry-details"
                  open={log.status === "error"}
                >
                  <summary>
                    {log.status === "error" ? "❌ 错误详情" : "📤 输出结果"}
                  </summary>
                  <JsonDisplay data={log.output} title="" />
                </details>
              )}
            </div>
          ))
        )}

        {status === "running" && (
          <div className="log-running-indicator">
            <div className="log-spinner"></div>
            <span>执行中...</span>
          </div>
        )}
      </div>

      {status === "success" && logs.length > 0 && (
        <div className="log-panel-footer success">
          ✅ 工作流执行完成，共{" "}
          {logs.filter((l) => l.status === "success").length} 个任务成功
        </div>
      )}

      {status === "error" && (
        <div className="log-panel-footer error">
          ❌ 工作流执行失败，请检查错误日志
        </div>
      )}
    </div>
  );
};

export default ExecutionLogPanel;
