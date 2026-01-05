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
import { Button, Space, Input, Typography, Divider, message } from "antd";
import {
  PlayCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LoadingOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import TaskNode, { TaskNodeData, ExecutionLog } from "./TaskNode";
import TaskPanel from "./TaskPanel";
import TaskConfigPanel from "./TaskConfigPanel";
import { TaskType, TaskInput } from "../types/workflow";
import { ExecutionStatus } from "../engine/WorkflowExecutor";
import {
  executeWorkflow as apiExecuteWorkflow,
  Workflow,
  NodeExecutionLog,
} from "../api/workflowApi";

const { Text } = Typography;

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
      message.warning("请先添加任务节点");
      return;
    }

    // 重置所有节点的执行日志
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, executionLog: undefined },
      }))
    );
    setExecutionStatus("running");

    // 设置所有节点为 pending 状态
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          executionLog: { status: "pending" as const },
        },
      }))
    );

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

      // 更新每个节点的执行日志
      const nodeLogMap = new Map<string, ExecutionLog>();
      result.logs.forEach((log: NodeExecutionLog) => {
        if (log.status === "success" || log.status === "error") {
          nodeLogMap.set(log.nodeId, {
            status: log.status as "success" | "error",
            input: log.input,
            output: log.output,
            duration: log.duration,
          });
        }
      });

      setNodes((nds) =>
        nds.map((node) => {
          const log = nodeLogMap.get(node.id);
          return {
            ...node,
            data: {
              ...node.data,
              executionLog: log || { status: "skipped" as const },
            },
          };
        })
      );

      setExecutionStatus(result.status === "success" ? "completed" : "error");

      if (result.status === "success") {
        message.success("工作流执行成功");
      } else {
        message.error(`工作流执行失败: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      setExecutionStatus("error");
      message.error(`执行失败: ${errorMessage}`);
    }
  }, [nodes, edges, setNodes]);

  // 清除执行日志
  const clearExecutionLogs = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, executionLog: undefined },
      }))
    );
    setExecutionStatus("idle");
  }, [setNodes]);

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

          <Panel position="top-right">
            <Space>
              <Button
                type="primary"
                icon={
                  executionStatus === "running" ? (
                    <LoadingOutlined />
                  ) : (
                    <PlayCircleOutlined />
                  )
                }
                onClick={executeWorkflow}
                disabled={executionStatus === "running" || nodes.length === 0}
                loading={executionStatus === "running"}
              >
                {executionStatus === "running" ? "执行中" : "执行"}
              </Button>
              {executionStatus !== "idle" && executionStatus !== "running" && (
                <Button icon={<ClearOutlined />} onClick={clearExecutionLogs}>
                  清除日志
                </Button>
              )}
              <Button icon={<DeleteOutlined />} onClick={clearWorkflow} danger>
                清空
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportWorkflow}>
                导出
              </Button>
            </Space>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode &&
        (() => {
          const nodeData = selectedNode.data as TaskNodeData;
          return (
            <div className="node-config-panel">
              <Text
                strong
                style={{ fontSize: 16, marginBottom: 16, display: "block" }}
              >
                节点配置
              </Text>

              <div style={{ marginBottom: 16 }}>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 4 }}
                >
                  节点名称
                </Text>
                <Input
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

              <div style={{ marginBottom: 16 }}>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 4 }}
                >
                  任务类型
                </Text>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{nodeData.taskType.icon}</span>
                  <Text>{nodeData.taskType.name}</Text>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 4 }}
                >
                  描述
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {nodeData.taskType.description}
                </Text>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 4 }}
                >
                  节点 ID
                </Text>
                <Text code style={{ fontSize: 11 }}>
                  {selectedNode.id}
                </Text>
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <TaskConfigPanel
                taskTypeId={nodeData.taskType.id}
                initialValues={nodeData.config as TaskInput}
                onValuesChange={(newConfig) => {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === selectedNode.id
                        ? { ...node, data: { ...node.data, config: newConfig } }
                        : node
                    )
                  );
                  setSelectedNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, config: newConfig },
                  });
                }}
              />

              <Divider style={{ margin: "16px 0" }} />

              <Button
                danger
                block
                icon={<DeleteOutlined />}
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
                删除节点
              </Button>
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
