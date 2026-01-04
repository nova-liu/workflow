import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  OnConnect,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import TaskNode, { TaskNodeData } from "./TaskNode";
import TaskPanel from "./TaskPanel";
import TaskConfigPanel from "./TaskConfigPanel";
import ExecutionLogPanel from "./ExecutionLogPanel";
import { TaskType, TaskInput } from "../types/workflow";
import {
  ExecutionLogEntry,
  ExecutionStatus,
  NodeExecutionState,
} from "../engine/WorkflowExecutor";
import {
  executeWorkflow as apiExecuteWorkflow,
  Workflow,
  NodeExecutionLog,
} from "../api/workflowApi";

const nodeTypes = {
  taskNode: TaskNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const WorkflowCanvasInner: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  // 执行状态
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus>("idle");
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [nodeExecutionStates, setNodeExecutionStates] = useState<
    Record<string, NodeExecutionState>
  >({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#555", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, taskType: TaskType) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify(taskType)
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const taskTypeData = event.dataTransfer.getData("application/reactflow");
      if (!taskTypeData) return;

      const taskType: TaskType = JSON.parse(taskTypeData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: uuidv4(),
        type: "taskNode",
        position,
        data: {
          taskType,
          label: `${taskType.name} #${nodes.length + 1}`,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, nodes.length, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const exportWorkflow = useCallback(() => {
    const workflow = {
      nodes: nodes.map((node) => {
        const data = node.data as TaskNodeData;
        return {
          id: node.id,
          type: data.taskType.id,
          label: data.label,
          position: node.position,
          config: data.config,
        };
      }),
      edges: edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      })),
    };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // 执行工作流
  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      alert("请先添加任务节点");
      return;
    }

    // 重置状态
    setExecutionLogs([]);
    setNodeExecutionStates({});
    setShowLogPanel(true);
    setExecutionStatus("running");

    // 添加开始日志
    const startLog: ExecutionLogEntry = {
      nodeId: "workflow",
      nodeName: "工作流",
      status: "running",
      message: "开始执行工作流...",
      timestamp: new Date(),
    };
    setExecutionLogs([startLog]);

    // 构建工作流数据
    const workflow: Workflow = {
      nodes: nodes.map((node) => {
        const data = node.data as TaskNodeData;
        return {
          id: node.id,
          type: data.taskType.id,
          label: data.label,
          config: data.config as TaskInput,
        };
      }),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    };

    try {
      // 调用后端 API 执行
      const result = await apiExecuteWorkflow(workflow);

      // 转换后端日志为前端格式
      const logs: ExecutionLogEntry[] = result.logs.map(
        (log: NodeExecutionLog) => ({
          nodeId: log.nodeId,
          nodeName: log.nodeName,
          status: log.status as "pending" | "running" | "success" | "error",
          message: log.message,
          input: log.input,
          output: log.output,
          duration: log.duration,
          timestamp: new Date(log.timestamp),
        })
      );

      // 更新节点状态
      const newNodeStates: Record<string, NodeExecutionState> = {};
      result.logs.forEach((log: NodeExecutionLog) => {
        if (log.status === "success" || log.status === "error") {
          newNodeStates[log.nodeId] = {
            status: log.status,
            output: log.output,
          };
        }
      });

      setExecutionLogs([startLog, ...logs]);
      setNodeExecutionStates(newNodeStates);
      setExecutionStatus(result.status === "success" ? "completed" : "error");

      // 添加完成日志
      const endLog: ExecutionLogEntry = {
        nodeId: "workflow",
        nodeName: "工作流",
        status: result.status === "success" ? "success" : "error",
        message:
          result.status === "success"
            ? "工作流执行完成"
            : `工作流执行失败: ${result.error}`,
        timestamp: new Date(),
      };
      setExecutionLogs((prev) => [...prev, endLog]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      setExecutionStatus("error");
      setExecutionLogs((prev) => [
        ...prev,
        {
          nodeId: "workflow",
          nodeName: "工作流",
          status: "error",
          message: `执行失败: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [nodes, edges]);

  // 取消执行
  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setExecutionStatus("cancelled");
    }
  }, []);

  return (
    <div className="workflow-container">
      <TaskPanel onDragStart={onDragStart} />

      <div className="workflow-canvas" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
          }}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as TaskNodeData;
              return data?.taskType?.color || "#eee";
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

          <Panel position="top-right" className="workflow-toolbar">
            <button
              onClick={executeWorkflow}
              className="toolbar-btn execute"
              disabled={executionStatus === "running" || nodes.length === 0}
            >
              {executionStatus === "running" ? "⏳ 执行中..." : "▶️ 执行"}
            </button>
            <button onClick={clearWorkflow} className="toolbar-btn danger">
              🗑️ 清空
            </button>
            <button onClick={exportWorkflow} className="toolbar-btn primary">
              📥 导出
            </button>
            {executionLogs.length > 0 && (
              <button
                onClick={() => setShowLogPanel(true)}
                className="toolbar-btn secondary"
              >
                📋 日志
              </button>
            )}
          </Panel>
        </ReactFlow>

        {/* 执行日志面板 */}
        {showLogPanel && (
          <ExecutionLogPanel
            logs={executionLogs}
            status={executionStatus}
            onClose={() => setShowLogPanel(false)}
            onCancel={cancelExecution}
          />
        )}
      </div>

      {selectedNode &&
        (() => {
          const nodeData = selectedNode.data as TaskNodeData;
          return (
            <div className="node-config-panel">
              <h3>节点配置</h3>
              <div className="config-section">
                <label>节点名称</label>
                <input
                  type="text"
                  value={nodeData.label}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id
                          ? {
                              ...node,
                              data: { ...node.data, label: e.target.value },
                            }
                          : node
                      )
                    );
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, label: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="config-section">
                <label>任务类型</label>
                <div className="config-value">
                  <span>{nodeData.taskType.icon}</span>
                  <span>{nodeData.taskType.name}</span>
                </div>
              </div>
              <div className="config-section">
                <label>描述</label>
                <div className="config-description">
                  {nodeData.taskType.description}
                </div>
              </div>
              <div className="config-section">
                <label>节点 ID</label>
                <div className="config-id">{selectedNode.id}</div>
              </div>

              {/* 任务参数配置面板 */}
              <TaskConfigPanel
                taskTypeId={nodeData.taskType.id}
                initialValues={nodeData.config as TaskInput}
                onValuesChange={(newConfig) => {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === selectedNode.id
                        ? {
                            ...node,
                            data: { ...node.data, config: newConfig },
                          }
                        : node
                    )
                  );
                  setSelectedNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, config: newConfig },
                  });
                }}
              />

              <button
                className="delete-node-btn"
                onClick={() => {
                  setNodes((nds) =>
                    nds.filter((node) => node.id !== selectedNode.id)
                  );
                  setEdges((eds) =>
                    eds.filter(
                      (edge) =>
                        edge.source !== selectedNode.id &&
                        edge.target !== selectedNode.id
                    )
                  );
                  setSelectedNode(null);
                }}
              >
                🗑️ 删除节点
              </button>
            </div>
          );
        })()}
    </div>
  );
};

const WorkflowCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;
