package executor

import (
	"sync"
	"workflow-engine/internal/types"
)

// TaskExecutorFunc 任务执行函数类型
type TaskExecutorFunc func(input types.TaskInput) types.TaskOutput

// ParamConfig 参数配置
type ParamConfig struct {
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	Label       string        `json:"label"`
	Required    bool          `json:"required"`
	Default     interface{}   `json:"default,omitempty"`
	Description string        `json:"description,omitempty"`
	Options     []ParamOption `json:"options,omitempty"`
}

// ParamOption 参数选项
type ParamOption struct {
	Label string      `json:"label"`
	Value interface{} `json:"value"`
}

// TaskConfig 任务配置
type TaskConfig struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Category    string        `json:"category"`
	Description string        `json:"description"`
	Params      []ParamConfig `json:"params"`
}

// registeredExecutor 注册的执行器
type registeredExecutor struct {
	config   TaskConfig
	executor TaskExecutorFunc
}

var (
	registry = make(map[string]registeredExecutor)
	mu       sync.RWMutex
)

// Register 注册执行器
func Register(config TaskConfig, executor TaskExecutorFunc) {
	mu.Lock()
	defer mu.Unlock()
	registry[config.ID] = registeredExecutor{
		config:   config,
		executor: executor,
	}
}

// Get 获取执行器
func Get(taskType string) (TaskExecutorFunc, bool) {
	mu.RLock()
	defer mu.RUnlock()
	if reg, ok := registry[taskType]; ok {
		return reg.executor, true
	}
	return nil, false
}

// GetConfig 获取任务配置
func GetConfig(taskType string) (TaskConfig, bool) {
	mu.RLock()
	defer mu.RUnlock()
	if reg, ok := registry[taskType]; ok {
		return reg.config, true
	}
	return TaskConfig{}, false
}

// GetAllConfigs 获取所有任务配置
func GetAllConfigs() []TaskConfig {
	mu.RLock()
	defer mu.RUnlock()
	configs := make([]TaskConfig, 0, len(registry))
	for _, reg := range registry {
		configs = append(configs, reg.config)
	}
	return configs
}

// Execute 执行任务
func Execute(taskType string, input types.TaskInput) types.TaskOutput {
	executor, ok := Get(taskType)
	if !ok {
		return types.TaskOutput{
			Error: "未知的任务类型: " + taskType,
			Data:  nil,
		}
	}
	return executor(input)
}

// InitExecutors 初始化所有执行器
func InitExecutors() {
	registerHTTPRequest()
	registerIfCondition()
}
