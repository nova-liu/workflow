package executor

import (
	"fmt"
	"reflect"
	"strings"
	"workflow-engine/internal/types"
)

func registerIfCondition() {
	Register(TaskConfig{
		ID:          "if-condition",
		Name:        "条件判断",
		Category:    "condition",
		Description: "根据条件判断是否继续执行",
		Params: []ParamConfig{
			{
				Name:        "field",
				Type:        "string",
				Label:       "判断字段",
				Required:    true,
				Description: "要判断的字段路径（支持嵌套，如 data.value）",
			},
			{
				Name:     "operator",
				Type:     "select",
				Label:    "比较运算符",
				Required: true,
				Default:  "equals",
				Options: []ParamOption{
					{Label: "等于", Value: "equals"},
					{Label: "不等于", Value: "notEquals"},
					{Label: "大于", Value: "gt"},
					{Label: "大于等于", Value: "gte"},
					{Label: "小于", Value: "lt"},
					{Label: "小于等于", Value: "lte"},
					{Label: "包含", Value: "contains"},
					{Label: "为空", Value: "isEmpty"},
					{Label: "不为空", Value: "isNotEmpty"},
				},
			},
			{
				Name:        "value",
				Type:        "string",
				Label:       "比较值",
				Required:    false,
				Description: "用于比较的值",
			},
			{
				Name:        "sourceData",
				Type:        "json",
				Label:       "数据源",
				Required:    false,
				Description: "要判断的数据（留空则使用上一步输出）",
			},
		},
	}, executeIfCondition)
}

func executeIfCondition(input types.TaskInput) types.TaskOutput {
	field, _ := input["field"].(string)
	if field == "" {
		return types.TaskOutput{
			Error: "判断字段不能为空",
			Data:  nil,
		}
	}

	operator, _ := input["operator"].(string)
	if operator == "" {
		operator = "equals"
	}

	compareValue := input["value"]

	// 获取数据源
	sourceData := input["sourceData"]
	if sourceData == nil {
		if previous, ok := input["$previous"].(map[string]interface{}); ok {
			for _, v := range previous {
				if prevOutput, ok := v.(map[string]interface{}); ok {
					if data, ok := prevOutput["data"]; ok {
						sourceData = data
						break
					}
				}
			}
		}
	}

	if sourceData == nil {
		sourceData = input
	}

	// 获取字段值
	fieldValue := getNestedValue(sourceData, field)

	// 执行条件判断
	result := evaluateCondition(fieldValue, operator, compareValue)

	if !result {
		return types.TaskOutput{
			Error: fmt.Sprintf("条件不满足: %s %s %v", field, operator, compareValue),
			Data: map[string]interface{}{
				"condition":  false,
				"field":      field,
				"operator":   operator,
				"value":      compareValue,
				"fieldValue": fieldValue,
			},
		}
	}

	return types.TaskOutput{
		Error: "",
		Data: map[string]interface{}{
			"condition":  true,
			"field":      field,
			"operator":   operator,
			"value":      compareValue,
			"fieldValue": fieldValue,
			"message":    "条件满足，继续执行",
		},
	}
}

func getNestedValue(data interface{}, path string) interface{} {
	if data == nil {
		return nil
	}

	parts := strings.Split(path, ".")
	current := data

	for _, part := range parts {
		if m, ok := current.(map[string]interface{}); ok {
			if val, exists := m[part]; exists {
				current = val
			} else {
				return nil
			}
		} else {
			return nil
		}
	}

	return current
}

func evaluateCondition(fieldValue interface{}, operator string, compareValue interface{}) bool {
	switch operator {
	case "equals":
		return reflect.DeepEqual(fieldValue, compareValue) ||
			fmt.Sprintf("%v", fieldValue) == fmt.Sprintf("%v", compareValue)

	case "notEquals":
		return !reflect.DeepEqual(fieldValue, compareValue) &&
			fmt.Sprintf("%v", fieldValue) != fmt.Sprintf("%v", compareValue)

	case "contains":
		fieldStr := fmt.Sprintf("%v", fieldValue)
		compareStr := fmt.Sprintf("%v", compareValue)
		return strings.Contains(fieldStr, compareStr)

	case "isEmpty":
		if fieldValue == nil {
			return true
		}
		if str, ok := fieldValue.(string); ok {
			return str == ""
		}
		if arr, ok := fieldValue.([]interface{}); ok {
			return len(arr) == 0
		}
		if m, ok := fieldValue.(map[string]interface{}); ok {
			return len(m) == 0
		}
		return false

	case "isNotEmpty":
		if fieldValue == nil {
			return false
		}
		if str, ok := fieldValue.(string); ok {
			return str != ""
		}
		if arr, ok := fieldValue.([]interface{}); ok {
			return len(arr) > 0
		}
		if m, ok := fieldValue.(map[string]interface{}); ok {
			return len(m) > 0
		}
		return true

	case "gt", "gte", "lt", "lte":
		return compareNumbersCondition(fieldValue, operator, compareValue)
	}

	return false
}

func compareNumbersCondition(a interface{}, op string, b interface{}) bool {
	aFloat := toFloat64Condition(a)
	bFloat := toFloat64Condition(b)

	switch op {
	case "gt":
		return aFloat > bFloat
	case "gte":
		return aFloat >= bFloat
	case "lt":
		return aFloat < bFloat
	case "lte":
		return aFloat <= bFloat
	}
	return false
}

func toFloat64Condition(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		var f float64
		fmt.Sscanf(val, "%f", &f)
		return f
	}
	return 0
}
