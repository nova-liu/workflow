package executor

import (
	"fmt"
	"time"
	"workflow-engine/internal/types"
)

// registerDelay 注册延时执行器
func registerDelay() {
	Register(TaskConfig{
		ID:          "delay",
		Name:        "延时",
		Category:    "action",
		Description: "暂停执行指定的时间",
		Params: []ParamConfig{
			{
				Name:        "seconds",
				Type:        "number",
				Label:       "延时秒数",
				Required:    true,
				Default:     1,
				Description: "暂停执行的秒数",
			},
		},
	}, executeDelay)
}

func executeDelay(input types.TaskInput) types.TaskOutput {
	seconds, _ := input["seconds"].(float64)
	if seconds <= 0 {
		seconds = 1
	}

	startTime := time.Now()
	time.Sleep(time.Duration(seconds) * time.Second)
	endTime := time.Now()

	return types.TaskOutput{
		Error: "",
		Data: map[string]interface{}{
			"delayed":   true,
			"seconds":   seconds,
			"startTime": startTime.Format(time.RFC3339),
			"endTime":   endTime.Format(time.RFC3339),
			"message":   fmt.Sprintf("延时 %.1f 秒完成", seconds),
		},
	}
}

// registerLog 注册日志执行器
func registerLog() {
	Register(TaskConfig{
		ID:          "log",
		Name:        "日志",
		Category:    "action",
		Description: "输出日志信息",
		Params: []ParamConfig{
			{
				Name:     "level",
				Type:     "select",
				Label:    "日志级别",
				Required: true,
				Default:  "info",
				Options: []ParamOption{
					{Label: "调试", Value: "debug"},
					{Label: "信息", Value: "info"},
					{Label: "警告", Value: "warn"},
					{Label: "错误", Value: "error"},
				},
			},
			{
				Name:        "message",
				Type:        "string",
				Label:       "日志内容",
				Required:    true,
				Description: "要输出的日志信息",
			},
			{
				Name:        "data",
				Type:        "json",
				Label:       "附加数据",
				Required:    false,
				Description: "JSON 格式的附加数据",
			},
		},
	}, executeLog)
}

func executeLog(input types.TaskInput) types.TaskOutput {
	level, _ := input["level"].(string)
	if level == "" {
		level = "info"
	}

	message, _ := input["message"].(string)
	if message == "" {
		message = "(empty message)"
	}

	data := input["data"]

	timestamp := time.Now().Format(time.RFC3339)

	return types.TaskOutput{
		Error: "",
		Data: map[string]interface{}{
			"logged":    true,
			"level":     level,
			"message":   message,
			"data":      data,
			"timestamp": timestamp,
		},
	}
}
