package executor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"workflow-engine/internal/types"
)

func registerHTTPRequest() {
	Register(TaskConfig{
		ID:          "http-request",
		Name:        "HTTP 请求",
		Category:    "action",
		Description: "发送 HTTP 请求并获取响应",
		Params: []ParamConfig{
			{
				Name:        "url",
				Type:        "string",
				Label:       "请求 URL",
				Required:    true,
				Description: "完整的请求地址",
			},
			{
				Name:     "method",
				Type:     "select",
				Label:    "请求方法",
				Required: true,
				Default:  "GET",
				Options: []ParamOption{
					{Label: "GET", Value: "GET"},
					{Label: "POST", Value: "POST"},
					{Label: "PUT", Value: "PUT"},
					{Label: "DELETE", Value: "DELETE"},
					{Label: "PATCH", Value: "PATCH"},
				},
			},
			{
				Name:        "headers",
				Type:        "json",
				Label:       "请求头",
				Required:    false,
				Default:     map[string]string{},
				Description: "JSON 格式的请求头",
			},
			{
				Name:        "body",
				Type:        "json",
				Label:       "请求体",
				Required:    false,
				Description: "JSON 格式的请求体（POST/PUT/PATCH）",
			},
			{
				Name:        "timeout",
				Type:        "number",
				Label:       "超时时间",
				Required:    false,
				Default:     30,
				Description: "请求超时时间（秒）",
			},
		},
	}, executeHTTPRequest)
}

func executeHTTPRequest(input types.TaskInput) types.TaskOutput {
	url, _ := input["url"].(string)
	if url == "" {
		return types.TaskOutput{
			Error: "URL 不能为空",
			Data:  nil,
		}
	}

	method, _ := input["method"].(string)
	if method == "" {
		method = "GET"
	}
	method = strings.ToUpper(method)

	timeout, _ := input["timeout"].(float64)
	if timeout <= 0 {
		timeout = 30
	}

	// 构建请求体
	var bodyReader io.Reader
	if body, ok := input["body"]; ok && body != nil {
		switch v := body.(type) {
		case string:
			bodyReader = strings.NewReader(v)
		case map[string]interface{}:
			jsonBytes, err := json.Marshal(v)
			if err != nil {
				return types.TaskOutput{
					Error: "序列化请求体失败: " + err.Error(),
					Data:  nil,
				}
			}
			bodyReader = bytes.NewReader(jsonBytes)
		}
	}

	// 创建请求
	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return types.TaskOutput{
			Error: "创建请求失败: " + err.Error(),
			Data:  nil,
		}
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	if headers, ok := input["headers"].(map[string]interface{}); ok {
		for key, value := range headers {
			if strValue, ok := value.(string); ok {
				req.Header.Set(key, strValue)
			}
		}
	}

	// 发送请求
	client := &http.Client{
		Timeout: time.Duration(timeout) * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return types.TaskOutput{
			Error: "请求失败: " + err.Error(),
			Data:  nil,
		}
	}
	defer resp.Body.Close()

	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return types.TaskOutput{
			Error: "读取响应失败: " + err.Error(),
			Data:  nil,
		}
	}

	// 尝试解析 JSON 响应
	var responseData interface{}
	if err := json.Unmarshal(respBody, &responseData); err != nil {
		responseData = string(respBody)
	}

	// 检查状态码
	if resp.StatusCode >= 400 {
		return types.TaskOutput{
			Error: fmt.Sprintf("HTTP 错误: %d %s", resp.StatusCode, resp.Status),
			Data: map[string]interface{}{
				"statusCode": resp.StatusCode,
				"status":     resp.Status,
				"body":       responseData,
				"headers":    resp.Header,
			},
		}
	}

	return types.TaskOutput{
		Error: "",
		Data: map[string]interface{}{
			"statusCode": resp.StatusCode,
			"status":     resp.Status,
			"body":       responseData,
			"headers":    resp.Header,
		},
	}
}
