package api

import (
	"net/http"
	"time"
	"workflow-engine/internal/executor"
	"workflow-engine/internal/types"

	"github.com/gin-gonic/gin"
)

// executeWorkflow 执行工作流
func executeWorkflow(c *gin.Context) {
	var req types.ExecuteWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误: " + err.Error(),
		})
		return
	}

	result := runWorkflow(req.Workflow)
	c.JSON(http.StatusOK, result)
}

// runWorkflow 执行工作流
func runWorkflow(workflow types.Workflow) types.WorkflowExecutionResult {
	startTime := time.Now()
	logs := []types.NodeExecutionLog{}
	nodeOutputs := make(map[string]types.TaskOutput)

	// 拓扑排序获取执行顺序
	executionOrder := topologicalSort(workflow.Nodes, workflow.Edges)

	if len(executionOrder) != len(workflow.Nodes) {
		return types.WorkflowExecutionResult{
			Status:    "error",
			StartTime: startTime.Format(time.RFC3339),
			EndTime:   time.Now().Format(time.RFC3339),
			Logs:      logs,
			Error:     "工作流存在循环依赖，无法执行",
		}
	}

	// 构建节点映射
	nodeMap := make(map[string]types.WorkflowNode)
	for _, node := range workflow.Nodes {
		nodeMap[node.ID] = node
	}

	var finalOutput *types.TaskOutput

	// 按顺序执行节点
	for _, nodeID := range executionOrder {
		node := nodeMap[nodeID]
		nodeStartTime := time.Now()

		// 记录开始日志
		logs = append(logs, types.NodeExecutionLog{
			NodeID:    nodeID,
			NodeName:  node.Label,
			Status:    "running",
			Message:   "开始执行任务: " + node.Label,
			Timestamp: nodeStartTime.Format(time.RFC3339),
		})

		// 准备输入
		input := prepareInput(nodeID, node.Config, workflow.Edges, nodeOutputs)

		// 执行任务
		output := executor.Execute(node.Type, input)
		endTime := time.Now()
		duration := endTime.Sub(nodeStartTime).Milliseconds()

		// 保存输出
		nodeOutputs[nodeID] = output

		// 检查结果
		if !output.IsSuccess() {
			logs = append(logs, types.NodeExecutionLog{
				NodeID:    nodeID,
				NodeName:  node.Label,
				Status:    "error",
				Message:   "任务执行失败: " + output.Error,
				Input:     input,
				Output:    &output,
				Duration:  duration,
				Timestamp: endTime.Format(time.RFC3339),
			})

			return types.WorkflowExecutionResult{
				Status:      "error",
				StartTime:   startTime.Format(time.RFC3339),
				EndTime:     endTime.Format(time.RFC3339),
				Logs:        logs,
				FinalOutput: &output,
				Error:       "任务 \"" + node.Label + "\" 执行失败: " + output.Error,
			}
		}

		// 执行成功
		logs = append(logs, types.NodeExecutionLog{
			NodeID:    nodeID,
			NodeName:  node.Label,
			Status:    "success",
			Message:   "任务执行成功: " + node.Label,
			Input:     input,
			Output:    &output,
			Duration:  duration,
			Timestamp: endTime.Format(time.RFC3339),
		})

		finalOutput = &output
	}

	return types.WorkflowExecutionResult{
		Status:      "success",
		StartTime:   startTime.Format(time.RFC3339),
		EndTime:     time.Now().Format(time.RFC3339),
		Logs:        logs,
		FinalOutput: finalOutput,
	}
}

// prepareInput 准备节点输入
func prepareInput(nodeID string, config types.TaskInput, edges []types.WorkflowEdge, nodeOutputs map[string]types.TaskOutput) types.TaskInput {
	input := make(types.TaskInput)

	// 复制节点配置
	for k, v := range config {
		input[k] = v
	}

	// 获取前置节点的输出
	predecessors := getPredecessors(nodeID, edges)
	if len(predecessors) > 0 {
		previous := make(map[string]interface{})
		for _, predID := range predecessors {
			if output, ok := nodeOutputs[predID]; ok {
				previous[predID] = map[string]interface{}{
					"error": output.Error,
					"data":  output.Data,
				}
			}
		}
		input["$previous"] = previous

		// 如果只有一个前置节点，展开其 data
		if len(predecessors) == 1 {
			if output, ok := nodeOutputs[predecessors[0]]; ok {
				if data, ok := output.Data.(map[string]interface{}); ok {
					for k, v := range data {
						if _, exists := input[k]; !exists {
							input[k] = v
						}
					}
				}
			}
		}
	}

	return input
}

// getPredecessors 获取前置节点
func getPredecessors(nodeID string, edges []types.WorkflowEdge) []string {
	var result []string
	for _, edge := range edges {
		if edge.Target == nodeID {
			result = append(result, edge.Source)
		}
	}
	return result
}

// topologicalSort 拓扑排序
func topologicalSort(nodes []types.WorkflowNode, edges []types.WorkflowEdge) []string {
	graph := make(map[string][]string)
	inDegree := make(map[string]int)

	// 初始化
	for _, node := range nodes {
		graph[node.ID] = []string{}
		inDegree[node.ID] = 0
	}

	// 构建图
	for _, edge := range edges {
		graph[edge.Source] = append(graph[edge.Source], edge.Target)
		inDegree[edge.Target]++
	}

	// BFS
	var queue []string
	for nodeID, degree := range inDegree {
		if degree == 0 {
			queue = append(queue, nodeID)
		}
	}

	var result []string
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		result = append(result, current)

		for _, neighbor := range graph[current] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	return result
}
