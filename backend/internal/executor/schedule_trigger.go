package executor

import (
	"fmt"
	"time"
	"workflow-engine/internal/types"
)

func registerScheduleTrigger() {
	Register(TaskConfig{
		ID:          "schedule-trigger",
		Name:        "定时触发",
		Category:    "trigger",
		Description: "按照设定的时间计划触发工作流",
		Params: []ParamConfig{
			{
				Name:        "scheduleType",
				Type:        "select",
				Label:       "调度类型",
				Required:    true,
				Default:     "once",
				Description: "选择触发方式",
				Options: []ParamOption{
					{Label: "Cron 表达式", Value: "cron"},
					{Label: "固定间隔", Value: "interval"},
					{Label: "单次执行", Value: "once"},
				},
			},
			{
				Name:        "cronExpression",
				Type:        "string",
				Label:       "Cron 表达式",
				Required:    false,
				Description: "格式: 分 时 日 月 周",
			},
			{
				Name:        "intervalSeconds",
				Type:        "number",
				Label:       "间隔秒数",
				Required:    false,
				Default:     60,
				Description: "执行间隔（秒）",
			},
			{
				Name:        "executeAt",
				Type:        "string",
				Label:       "执行时间",
				Required:    false,
				Description: "ISO 8601 格式的时间",
			},
		},
	}, executeScheduleTrigger)
}

func executeScheduleTrigger(input types.TaskInput) types.TaskOutput {
	scheduleType, _ := input["scheduleType"].(string)
	if scheduleType == "" {
		scheduleType = "once"
	}

	now := time.Now()

	switch scheduleType {
	case "cron":
		cronExpr, _ := input["cronExpression"].(string)
		if cronExpr == "" {
			return types.TaskOutput{
				Error: "cron 表达式不能为空",
				Data:  nil,
			}
		}
		return types.TaskOutput{
			Error: "",
			Data: map[string]interface{}{
				"triggered":      true,
				"scheduleType":   "cron",
				"cronExpression": cronExpr,
				"triggeredAt":    now.Format(time.RFC3339),
				"message":        fmt.Sprintf("Cron 调度已配置: %s", cronExpr),
			},
		}

	case "interval":
		interval, _ := input["intervalSeconds"].(float64)
		if interval <= 0 {
			interval = 60
		}
		return types.TaskOutput{
			Error: "",
			Data: map[string]interface{}{
				"triggered":       true,
				"scheduleType":    "interval",
				"intervalSeconds": interval,
				"triggeredAt":     now.Format(time.RFC3339),
				"message":         fmt.Sprintf("间隔调度已配置: 每 %.0f 秒执行", interval),
			},
		}

	case "once":
		executeAt, _ := input["executeAt"].(string)
		if executeAt != "" {
			executeTime, err := time.Parse(time.RFC3339, executeAt)
			if err != nil {
				executeTime, err = time.Parse("2006-01-02T15:04", executeAt)
			}
			if err != nil {
				return types.TaskOutput{
					Error: "无效的执行时间格式",
					Data:  nil,
				}
			}
			return types.TaskOutput{
				Error: "",
				Data: map[string]interface{}{
					"triggered":    true,
					"scheduleType": "once",
					"executeAt":    executeTime.Format(time.RFC3339),
					"triggeredAt":  now.Format(time.RFC3339),
					"message":      fmt.Sprintf("单次执行已配置: %s", executeTime.Format("2006-01-02 15:04:05")),
				},
			}
		}
		return types.TaskOutput{
			Error: "",
			Data: map[string]interface{}{
				"triggered":    true,
				"scheduleType": "once",
				"triggeredAt":  now.Format(time.RFC3339),
				"message":      "立即执行",
			},
		}

	default:
		return types.TaskOutput{
			Error: "未知的调度类型: " + scheduleType,
			Data:  nil,
		}
	}
}
