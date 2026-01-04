package executor

import (
	"encoding/json"
	"fmt"
	"reflect"
	"workflow-engine/internal/types"
)

// registerDataTransform 注册数据转换执行器
func registerDataTransform() {
	Register(TaskConfig{
		ID:          "data-transform",
		Name:        "数据转换",
		Category:    "transform",
		Description: "对数据进行转换操作",
		Params: []ParamConfig{
			{
				Name:     "operation",
				Type:     "select",
				Label:    "转换操作",
				Required: true,
				Default:  "extract",
				Options: []ParamOption{
					{Label: "提取字段", Value: "extract"},
					{Label: "重命名字段", Value: "rename"},
					{Label: "添加字段", Value: "add"},
					{Label: "删除字段", Value: "remove"},
					{Label: "合并对象", Value: "merge"},
				},
			},
			{
				Name:        "sourceData",
				Type:        "json",
				Label:       "源数据",
				Required:    false,
				Description: "要转换的数据（留空则使用上一步输出）",
			},
			{
				Name:        "fields",
				Type:        "json",
				Label:       "字段配置",
				Required:    false,
				Description: "字段列表或映射关系",
			},
		},
	}, executeDataTransform)
}

func executeDataTransform(input types.TaskInput) types.TaskOutput {
	operation, _ := input["operation"].(string)
	if operation == "" {
		operation = "extract"
	}

	// 获取源数据
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
		return types.TaskOutput{
			Error: "没有可转换的数据",
			Data:  nil,
		}
	}

	fields := input["fields"]

	switch operation {
	case "extract":
		return extractFields(sourceData, fields)
	case "rename":
		return renameFields(sourceData, fields)
	case "add":
		return addFields(sourceData, fields)
	case "remove":
		return removeFields(sourceData, fields)
	case "merge":
		return mergeData(sourceData, fields)
	default:
		return types.TaskOutput{
			Error: "未知的转换操作: " + operation,
			Data:  nil,
		}
	}
}

func extractFields(sourceData interface{}, fields interface{}) types.TaskOutput {
	fieldList, ok := toStringSlice(fields)
	if !ok || len(fieldList) == 0 {
		return types.TaskOutput{
			Error: "请提供要提取的字段列表",
			Data:  nil,
		}
	}

	sourceMap, ok := sourceData.(map[string]interface{})
	if !ok {
		return types.TaskOutput{
			Error: "源数据必须是对象类型",
			Data:  nil,
		}
	}

	result := make(map[string]interface{})
	for _, field := range fieldList {
		if value, exists := sourceMap[field]; exists {
			result[field] = value
		}
	}

	return types.TaskOutput{
		Error: "",
		Data:  result,
	}
}

func renameFields(sourceData interface{}, fields interface{}) types.TaskOutput {
	fieldMap, ok := fields.(map[string]interface{})
	if !ok || len(fieldMap) == 0 {
		return types.TaskOutput{
			Error: "请提供字段重命名映射",
			Data:  nil,
		}
	}

	sourceMap, ok := sourceData.(map[string]interface{})
	if !ok {
		return types.TaskOutput{
			Error: "源数据必须是对象类型",
			Data:  nil,
		}
	}

	result := make(map[string]interface{})
	for k, v := range sourceMap {
		if newName, ok := fieldMap[k].(string); ok {
			result[newName] = v
		} else {
			result[k] = v
		}
	}

	return types.TaskOutput{
		Error: "",
		Data:  result,
	}
}

func addFields(sourceData interface{}, fields interface{}) types.TaskOutput {
	fieldMap, ok := fields.(map[string]interface{})
	if !ok || len(fieldMap) == 0 {
		return types.TaskOutput{
			Error: "请提供要添加的字段",
			Data:  nil,
		}
	}

	sourceMap, ok := sourceData.(map[string]interface{})
	if !ok {
		sourceMap = make(map[string]interface{})
	}

	result := make(map[string]interface{})
	for k, v := range sourceMap {
		result[k] = v
	}
	for k, v := range fieldMap {
		result[k] = v
	}

	return types.TaskOutput{
		Error: "",
		Data:  result,
	}
}

func removeFields(sourceData interface{}, fields interface{}) types.TaskOutput {
	fieldList, ok := toStringSlice(fields)
	if !ok || len(fieldList) == 0 {
		return types.TaskOutput{
			Error: "请提供要删除的字段列表",
			Data:  nil,
		}
	}

	sourceMap, ok := sourceData.(map[string]interface{})
	if !ok {
		return types.TaskOutput{
			Error: "源数据必须是对象类型",
			Data:  nil,
		}
	}

	removeSet := make(map[string]bool)
	for _, field := range fieldList {
		removeSet[field] = true
	}

	result := make(map[string]interface{})
	for k, v := range sourceMap {
		if !removeSet[k] {
			result[k] = v
		}
	}

	return types.TaskOutput{
		Error: "",
		Data:  result,
	}
}

func mergeData(sourceData interface{}, fields interface{}) types.TaskOutput {
	mergeData, ok := fields.(map[string]interface{})
	if !ok {
		return types.TaskOutput{
			Error: "请提供要合并的数据",
			Data:  nil,
		}
	}

	sourceMap, ok := sourceData.(map[string]interface{})
	if !ok {
		sourceMap = make(map[string]interface{})
	}

	result := make(map[string]interface{})
	for k, v := range sourceMap {
		result[k] = v
	}
	for k, v := range mergeData {
		result[k] = v
	}

	return types.TaskOutput{
		Error: "",
		Data:  result,
	}
}

// registerJSONParse 注册 JSON 解析执行器
func registerJSONParse() {
	Register(TaskConfig{
		ID:          "json-parse",
		Name:        "JSON 解析",
		Category:    "transform",
		Description: "解析或序列化 JSON 数据",
		Params: []ParamConfig{
			{
				Name:     "operation",
				Type:     "select",
				Label:    "操作类型",
				Required: true,
				Default:  "parse",
				Options: []ParamOption{
					{Label: "解析 JSON", Value: "parse"},
					{Label: "序列化为 JSON", Value: "stringify"},
				},
			},
			{
				Name:        "data",
				Type:        "json",
				Label:       "数据",
				Required:    false,
				Description: "要处理的数据",
			},
		},
	}, executeJSONParse)
}

func executeJSONParse(input types.TaskInput) types.TaskOutput {
	operation, _ := input["operation"].(string)
	if operation == "" {
		operation = "parse"
	}

	data := input["data"]
	if data == nil {
		if previous, ok := input["$previous"].(map[string]interface{}); ok {
			for _, v := range previous {
				if prevOutput, ok := v.(map[string]interface{}); ok {
					if d, ok := prevOutput["data"]; ok {
						data = d
						break
					}
				}
			}
		}
	}

	switch operation {
	case "parse":
		if str, ok := data.(string); ok {
			var result interface{}
			if err := json.Unmarshal([]byte(str), &result); err != nil {
				return types.TaskOutput{
					Error: "JSON 解析失败: " + err.Error(),
					Data:  nil,
				}
			}
			return types.TaskOutput{
				Error: "",
				Data:  result,
			}
		}
		// 已经是对象，直接返回
		return types.TaskOutput{
			Error: "",
			Data:  data,
		}

	case "stringify":
		jsonBytes, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			return types.TaskOutput{
				Error: "JSON 序列化失败: " + err.Error(),
				Data:  nil,
			}
		}
		return types.TaskOutput{
			Error: "",
			Data: map[string]interface{}{
				"json": string(jsonBytes),
			},
		}

	default:
		return types.TaskOutput{
			Error: "未知的操作类型: " + operation,
			Data:  nil,
		}
	}
}

// registerFilter 注册过滤器执行器
func registerFilter() {
	Register(TaskConfig{
		ID:          "filter",
		Name:        "数据过滤",
		Category:    "transform",
		Description: "过滤数组中的数据",
		Params: []ParamConfig{
			{
				Name:        "data",
				Type:        "json",
				Label:       "数据数组",
				Required:    false,
				Description: "要过滤的数组数据",
			},
			{
				Name:        "field",
				Type:        "string",
				Label:       "过滤字段",
				Required:    true,
				Description: "用于过滤的字段名",
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
		},
	}, executeFilter)
}

func executeFilter(input types.TaskInput) types.TaskOutput {
	data := input["data"]
	if data == nil {
		if previous, ok := input["$previous"].(map[string]interface{}); ok {
			for _, v := range previous {
				if prevOutput, ok := v.(map[string]interface{}); ok {
					if d, ok := prevOutput["data"]; ok {
						data = d
						break
					}
				}
			}
		}
	}

	arr, ok := data.([]interface{})
	if !ok {
		return types.TaskOutput{
			Error: "数据必须是数组类型",
			Data:  nil,
		}
	}

	field, _ := input["field"].(string)
	operator, _ := input["operator"].(string)
	value := input["value"]

	var result []interface{}
	for _, item := range arr {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		fieldValue := itemMap[field]
		if matchesCondition(fieldValue, operator, value) {
			result = append(result, item)
		}
	}

	return types.TaskOutput{
		Error: "",
		Data: map[string]interface{}{
			"filtered": result,
			"count":    len(result),
			"original": len(arr),
		},
	}
}

// registerAggregate 注册聚合执行器
func registerAggregate() {
	Register(TaskConfig{
		ID:          "aggregate",
		Name:        "数据聚合",
		Category:    "transform",
		Description: "对数组数据进行聚合计算",
		Params: []ParamConfig{
			{
				Name:        "data",
				Type:        "json",
				Label:       "数据数组",
				Required:    false,
				Description: "要聚合的数组数据",
			},
			{
				Name:     "operation",
				Type:     "select",
				Label:    "聚合操作",
				Required: true,
				Default:  "count",
				Options: []ParamOption{
					{Label: "计数", Value: "count"},
					{Label: "求和", Value: "sum"},
					{Label: "平均值", Value: "avg"},
					{Label: "最大值", Value: "max"},
					{Label: "最小值", Value: "min"},
					{Label: "去重", Value: "distinct"},
				},
			},
			{
				Name:        "field",
				Type:        "string",
				Label:       "聚合字段",
				Required:    false,
				Description: "用于聚合的字段名",
			},
		},
	}, executeAggregate)
}

func executeAggregate(input types.TaskInput) types.TaskOutput {
	data := input["data"]
	if data == nil {
		if previous, ok := input["$previous"].(map[string]interface{}); ok {
			for _, v := range previous {
				if prevOutput, ok := v.(map[string]interface{}); ok {
					if d, ok := prevOutput["data"]; ok {
						data = d
						break
					}
				}
			}
		}
	}

	arr, ok := data.([]interface{})
	if !ok {
		return types.TaskOutput{
			Error: "数据必须是数组类型",
			Data:  nil,
		}
	}

	operation, _ := input["operation"].(string)
	field, _ := input["field"].(string)

	switch operation {
	case "count":
		return types.TaskOutput{
			Error: "",
			Data: map[string]interface{}{
				"count": len(arr),
			},
		}

	case "sum", "avg", "max", "min":
		if field == "" {
			return types.TaskOutput{
				Error: "聚合操作需要指定字段",
				Data:  nil,
			}
		}
		values := extractNumericValues(arr, field)
		if len(values) == 0 {
			return types.TaskOutput{
				Error: "没有可聚合的数值",
				Data:  nil,
			}
		}
		result := calculateAggregate(values, operation)
		return types.TaskOutput{
			Error: "",
			Data: map[string]interface{}{
				operation: result,
				"count":   len(values),
			},
		}

	case "distinct":
		if field == "" {
			return types.TaskOutput{
				Error: "去重操作需要指定字段",
				Data:  nil,
			}
		}
		distinct := extractDistinctValues(arr, field)
		return types.TaskOutput{
			Error: "",
			Data: map[string]interface{}{
				"distinct": distinct,
				"count":    len(distinct),
			},
		}

	default:
		return types.TaskOutput{
			Error: "未知的聚合操作: " + operation,
			Data:  nil,
		}
	}
}

// Helper functions

func toStringSlice(v interface{}) ([]string, bool) {
	if v == nil {
		return nil, false
	}

	switch val := v.(type) {
	case []string:
		return val, true
	case []interface{}:
		result := make([]string, 0, len(val))
		for _, item := range val {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
		return result, len(result) > 0
	}
	return nil, false
}

func matchesCondition(fieldValue interface{}, operator string, compareValue interface{}) bool {
	switch operator {
	case "equals":
		return reflect.DeepEqual(fieldValue, compareValue)
	case "notEquals":
		return !reflect.DeepEqual(fieldValue, compareValue)
	case "contains":
		if str, ok := fieldValue.(string); ok {
			if cmp, ok := compareValue.(string); ok {
				return contains(str, cmp)
			}
		}
		return false
	case "isNotEmpty":
		return fieldValue != nil && fieldValue != ""
	case "gt", "gte", "lt", "lte":
		return compareNumbers(fieldValue, operator, compareValue)
	}
	return false
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func compareNumbers(a interface{}, op string, b interface{}) bool {
	aFloat := toFloat64(a)
	bFloat := toFloat64(b)

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

func toFloat64(v interface{}) float64 {
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

func extractNumericValues(arr []interface{}, field string) []float64 {
	var values []float64
	for _, item := range arr {
		if itemMap, ok := item.(map[string]interface{}); ok {
			if val, exists := itemMap[field]; exists {
				values = append(values, toFloat64(val))
			}
		}
	}
	return values
}

func calculateAggregate(values []float64, operation string) float64 {
	if len(values) == 0 {
		return 0
	}

	switch operation {
	case "sum":
		var sum float64
		for _, v := range values {
			sum += v
		}
		return sum
	case "avg":
		var sum float64
		for _, v := range values {
			sum += v
		}
		return sum / float64(len(values))
	case "max":
		max := values[0]
		for _, v := range values[1:] {
			if v > max {
				max = v
			}
		}
		return max
	case "min":
		min := values[0]
		for _, v := range values[1:] {
			if v < min {
				min = v
			}
		}
		return min
	}
	return 0
}

func extractDistinctValues(arr []interface{}, field string) []interface{} {
	seen := make(map[string]bool)
	var distinct []interface{}

	for _, item := range arr {
		if itemMap, ok := item.(map[string]interface{}); ok {
			if val, exists := itemMap[field]; exists {
				key := fmt.Sprintf("%v", val)
				if !seen[key] {
					seen[key] = true
					distinct = append(distinct, val)
				}
			}
		}
	}
	return distinct
}
