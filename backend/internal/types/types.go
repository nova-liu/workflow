package types

import "encoding/json"

// TaskInput 任务输入
type TaskInput map[string]interface{}

// TaskOutput 任务输出
type TaskOutput struct {
	Error string                 `json:"error"`
	Data  interface{}            `json:"data,omitempty"`
	Extra map[string]interface{} `json:"-"`
}

// MarshalJSON 自定义 JSON 序列化
func (o TaskOutput) MarshalJSON() ([]byte, error) {
	result := make(map[string]interface{})
	result["error"] = o.Error
	if o.Data != nil {
		result["data"] = o.Data
	}
	for k, v := range o.Extra {
		result[k] = v
	}
	return json.Marshal(result)
}

// IsSuccess 检查是否成功
func (o TaskOutput) IsSuccess() bool {
	return o.Error == ""
}

// NewSuccessOutput 创建成功输出
func NewSuccessOutput(data interface{}) TaskOutput {
	return TaskOutput{
		Error: "",
		Data:  data,
	}
}

// NewErrorOutput 创建错误输出
func NewErrorOutput(err string) TaskOutput {
	return TaskOutput{
		Error: err,
		Data:  nil,
	}
}

// TaskExecutor 任务执行器函数类型
type TaskExecutor func(input TaskInput) TaskOutput

// WorkflowNode 工作流节点
type WorkflowNode struct {
	ID       string    `json:"id"`
	Type     string    `json:"type"`
	Label    string    `json:"label"`
	Config   TaskInput `json:"config"`
	Position struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
	} `json:"position"`
}

// WorkflowEdge 工作流边
type WorkflowEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

// Workflow 工作流定义
type Workflow struct {
	Nodes []WorkflowNode `json:"nodes"`
	Edges []WorkflowEdge `json:"edges"`
}

// ExecuteTaskRequest 执行单个任务请求
type ExecuteTaskRequest struct {
	TaskType string    `json:"taskType"`
	Input    TaskInput `json:"input"`
}

// ExecuteWorkflowRequest 执行工作流请求
type ExecuteWorkflowRequest struct {
	Workflow Workflow `json:"workflow"`
}

// NodeExecutionLog 节点执行日志
type NodeExecutionLog struct {
	NodeID    string      `json:"nodeId"`
	NodeName  string      `json:"nodeName"`
	Status    string      `json:"status"` // pending, running, success, error
	Message   string      `json:"message"`
	Input     TaskInput   `json:"input,omitempty"`
	Output    *TaskOutput `json:"output,omitempty"`
	Duration  int64       `json:"duration,omitempty"` // 毫秒
	Timestamp string      `json:"timestamp"`
}

// WorkflowExecutionResult 工作流执行结果
type WorkflowExecutionResult struct {
	Status      string             `json:"status"` // success, error, cancelled
	StartTime   string             `json:"startTime"`
	EndTime     string             `json:"endTime"`
	Logs        []NodeExecutionLog `json:"logs"`
	FinalOutput *TaskOutput        `json:"finalOutput,omitempty"`
	Error       string             `json:"error,omitempty"`
}
