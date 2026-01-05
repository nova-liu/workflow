package executor

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
	"workflow-engine/internal/types"

	"github.com/google/uuid"
)

func registerAliyunSMS() {
	Register(TaskConfig{
		ID:          "aliyun-sms",
		Name:        "阿里云短信",
		Category:    "action",
		Description: "通过阿里云短信服务发送短信",
		Params: []ParamConfig{
			{
				Name:        "accessKeyId",
				Type:        "string",
				Label:       "AccessKey ID",
				Required:    true,
				Description: "阿里云 AccessKey ID",
			},
			{
				Name:        "accessKeySecret",
				Type:        "password",
				Label:       "AccessKey Secret",
				Required:    true,
				Description: "阿里云 AccessKey Secret",
			},
			{
				Name:        "phoneNumbers",
				Type:        "string",
				Label:       "手机号码",
				Required:    true,
				Description: "接收短信的手机号码（多个用逗号分隔，最多1000个）",
			},
			{
				Name:        "signName",
				Type:        "string",
				Label:       "短信签名",
				Required:    true,
				Description: "短信签名名称（需在阿里云控制台申请）",
			},
			{
				Name:        "templateCode",
				Type:        "string",
				Label:       "模板 Code",
				Required:    true,
				Description: "短信模板 Code（需在阿里云控制台申请）",
			},
			{
				Name:        "templateParam",
				Type:        "json",
				Label:       "模板参数",
				Required:    false,
				Default:     map[string]string{},
				Description: "短信模板变量，JSON 格式，如 {\"code\":\"123456\"}",
			},
			{
				Name:        "regionId",
				Type:        "select",
				Label:       "区域",
				Required:    false,
				Default:     "cn-hangzhou",
				Description: "阿里云区域 ID",
				Options: []ParamOption{
					{Label: "华东1（杭州）", Value: "cn-hangzhou"},
					{Label: "华北1（青岛）", Value: "cn-qingdao"},
					{Label: "华北2（北京）", Value: "cn-beijing"},
					{Label: "华东2（上海）", Value: "cn-shanghai"},
					{Label: "华南1（深圳）", Value: "cn-shenzhen"},
					{Label: "新加坡", Value: "ap-southeast-1"},
				},
			},
		},
	}, executeAliyunSMS)
}

// AliyunSMSResponse 阿里云短信 API 响应
type AliyunSMSResponse struct {
	RequestId string `json:"RequestId"`
	Code      string `json:"Code"`
	Message   string `json:"Message"`
	BizId     string `json:"BizId"`
}

func executeAliyunSMS(input types.TaskInput) types.TaskOutput {
	// 获取参数
	accessKeyId, _ := input["accessKeyId"].(string)
	accessKeySecret, _ := input["accessKeySecret"].(string)
	phoneNumbers, _ := input["phoneNumbers"].(string)
	signName, _ := input["signName"].(string)
	templateCode, _ := input["templateCode"].(string)
	regionId, _ := input["regionId"].(string)

	// 处理模板参数
	var templateParamStr string
	if templateParam, ok := input["templateParam"]; ok && templateParam != nil {
		switch v := templateParam.(type) {
		case string:
			templateParamStr = v
		case map[string]interface{}:
			if len(v) > 0 {
				paramBytes, err := json.Marshal(v)
				if err == nil {
					templateParamStr = string(paramBytes)
				}
			}
		}
	}

	// 默认值
	if regionId == "" {
		regionId = "cn-hangzhou"
	}

	// 验证必填参数
	if accessKeyId == "" {
		return types.TaskOutput{Error: "AccessKey ID 不能为空", Data: nil}
	}
	if accessKeySecret == "" {
		return types.TaskOutput{Error: "AccessKey Secret 不能为空", Data: nil}
	}
	if phoneNumbers == "" {
		return types.TaskOutput{Error: "手机号码不能为空", Data: nil}
	}
	if signName == "" {
		return types.TaskOutput{Error: "短信签名不能为空", Data: nil}
	}
	if templateCode == "" {
		return types.TaskOutput{Error: "模板 Code 不能为空", Data: nil}
	}

	// 构建请求参数
	params := map[string]string{
		// 公共参数
		"Format":           "JSON",
		"Version":          "2017-05-25",
		"AccessKeyId":      accessKeyId,
		"SignatureMethod":  "HMAC-SHA1",
		"Timestamp":        time.Now().UTC().Format("2006-01-02T15:04:05Z"),
		"SignatureVersion": "1.0",
		"SignatureNonce":   uuid.New().String(),
		"RegionId":         regionId,
		// 接口参数
		"Action":       "SendSms",
		"PhoneNumbers": phoneNumbers,
		"SignName":     signName,
		"TemplateCode": templateCode,
	}

	if templateParamStr != "" {
		params["TemplateParam"] = templateParamStr
	}

	// 计算签名
	signature := computeAliyunSignature(params, accessKeySecret, "GET")
	params["Signature"] = signature

	// 构建请求 URL
	baseURL := "https://dysmsapi.aliyuncs.com/"
	queryString := buildQueryString(params)
	requestURL := baseURL + "?" + queryString

	// 发送请求
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(requestURL)
	if err != nil {
		return types.TaskOutput{Error: fmt.Sprintf("发送请求失败: %v", err), Data: nil}
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return types.TaskOutput{Error: fmt.Sprintf("读取响应失败: %v", err), Data: nil}
	}

	// 解析响应
	var smsResp AliyunSMSResponse
	if err := json.Unmarshal(body, &smsResp); err != nil {
		return types.TaskOutput{Error: fmt.Sprintf("解析响应失败: %v", err), Data: nil}
	}

	// 检查是否成功
	if smsResp.Code != "OK" {
		return types.TaskOutput{
			Error: fmt.Sprintf("发送短信失败: %s (%s)", smsResp.Message, smsResp.Code),
			Data: map[string]interface{}{
				"requestId": smsResp.RequestId,
				"code":      smsResp.Code,
				"message":   smsResp.Message,
			},
		}
	}

	return types.TaskOutput{
		Error: "",
		Data: map[string]interface{}{
			"success":   true,
			"requestId": smsResp.RequestId,
			"bizId":     smsResp.BizId,
			"code":      smsResp.Code,
			"message":   smsResp.Message,
		},
	}
}

// computeAliyunSignature 计算阿里云 API 签名
func computeAliyunSignature(params map[string]string, accessKeySecret string, httpMethod string) string {
	// 1. 按参数名排序
	var keys []string
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// 2. 构建规范化请求字符串
	var pairs []string
	for _, k := range keys {
		pairs = append(pairs, specialURLEncode(k)+"="+specialURLEncode(params[k]))
	}
	canonicalizedQueryString := strings.Join(pairs, "&")

	// 3. 构建待签名字符串
	stringToSign := httpMethod + "&" + specialURLEncode("/") + "&" + specialURLEncode(canonicalizedQueryString)

	// 4. 计算 HMAC-SHA1 签名
	key := []byte(accessKeySecret + "&")
	mac := hmac.New(sha1.New, key)
	mac.Write([]byte(stringToSign))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	return signature
}

// specialURLEncode 阿里云特殊 URL 编码
func specialURLEncode(s string) string {
	encoded := url.QueryEscape(s)
	// 阿里云要求的特殊编码规则
	encoded = strings.ReplaceAll(encoded, "+", "%20")
	encoded = strings.ReplaceAll(encoded, "*", "%2A")
	encoded = strings.ReplaceAll(encoded, "%7E", "~")
	return encoded
}

// buildQueryString 构建查询字符串
func buildQueryString(params map[string]string) string {
	var pairs []string
	for k, v := range params {
		pairs = append(pairs, url.QueryEscape(k)+"="+url.QueryEscape(v))
	}
	return strings.Join(pairs, "&")
}
