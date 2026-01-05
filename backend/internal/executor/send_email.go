package executor

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
	"workflow-engine/internal/types"
)

func registerSendEmail() {
	Register(TaskConfig{
		ID:          "send-email",
		Name:        "发送邮件",
		Category:    "action",
		Description: "通过 SMTP 服务器发送电子邮件",
		Params: []ParamConfig{
			{
				Name:        "to",
				Type:        "string",
				Label:       "收件人",
				Required:    true,
				Description: "收件人邮箱地址（多个用逗号分隔）",
			},
			{
				Name:        "subject",
				Type:        "string",
				Label:       "邮件主题",
				Required:    true,
				Description: "邮件主题",
			},
			{
				Name:        "body",
				Type:        "textarea",
				Label:       "邮件内容",
				Required:    true,
				Description: "邮件正文内容",
			},
			{
				Name:        "password",
				Type:        "password",
				Label:       "应用密码",
				Required:    true,
				Description: "Gmail 应用专用密码（在 Google 账号设置中生成）",
			},
			{
				Name:        "from",
				Type:        "string",
				Label:       "发件人",
				Required:    false,
				Default:     "zhixizhixizhixi@gmail.com",
				Description: "发件人邮箱地址",
			},
			{
				Name:        "cc",
				Type:        "string",
				Label:       "抄送",
				Required:    false,
				Description: "抄送邮箱地址（多个用逗号分隔）",
			},
			{
				Name:        "isHTML",
				Type:        "boolean",
				Label:       "HTML 格式",
				Required:    false,
				Default:     false,
				Description: "是否为 HTML 格式的邮件",
			},
		},
	}, executeSendEmail)
}

func executeSendEmail(input types.TaskInput) types.TaskOutput {
	// 获取参数
	to, _ := input["to"].(string)
	subject, _ := input["subject"].(string)
	body, _ := input["body"].(string)
	password, _ := input["password"].(string)
	from, _ := input["from"].(string)
	cc, _ := input["cc"].(string)
	isHTML, _ := input["isHTML"].(bool)

	// 默认值
	if from == "" {
		from = "zhixizhixizhixi@gmail.com"
	}

	// 验证必填参数
	if to == "" {
		return types.TaskOutput{Error: "收件人不能为空", Data: nil}
	}
	if subject == "" {
		return types.TaskOutput{Error: "邮件主题不能为空", Data: nil}
	}
	if password == "" {
		return types.TaskOutput{Error: "应用密码不能为空", Data: nil}
	}

	// 解析收件人
	toAddrs := parseEmailAddresses(to)
	if len(toAddrs) == 0 {
		return types.TaskOutput{Error: "收件人邮箱地址无效", Data: nil}
	}

	// 解析抄送
	var ccAddrs []string
	if cc != "" {
		ccAddrs = parseEmailAddresses(cc)
	}

	// 构建邮件内容
	contentType := "text/plain"
	if isHTML {
		contentType = "text/html"
	}

	// 构建 MIME 邮件
	var msgBuilder strings.Builder
	msgBuilder.WriteString(fmt.Sprintf("From: %s\r\n", from))
	msgBuilder.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(toAddrs, ", ")))
	if len(ccAddrs) > 0 {
		msgBuilder.WriteString(fmt.Sprintf("Cc: %s\r\n", strings.Join(ccAddrs, ", ")))
	}
	msgBuilder.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msgBuilder.WriteString("MIME-Version: 1.0\r\n")
	msgBuilder.WriteString(fmt.Sprintf("Content-Type: %s; charset=UTF-8\r\n", contentType))
	msgBuilder.WriteString("\r\n")
	msgBuilder.WriteString(body)

	msg := []byte(msgBuilder.String())

	// 合并所有收件人
	allRecipients := append(toAddrs, ccAddrs...)

	// 使用 Gmail SMTP (SSL/TLS 端口 465)
	err := sendMailGmail(from, password, allRecipients, msg)

	if err != nil {
		return types.TaskOutput{
			Error: "发送邮件失败: " + err.Error(),
			Data:  nil,
		}
	}

	return types.TaskOutput{
		Error: "",
		Data: map[string]interface{}{
			"success":    true,
			"message":    "邮件发送成功",
			"to":         toAddrs,
			"cc":         ccAddrs,
			"subject":    subject,
			"recipients": len(allRecipients),
		},
	}
}

// parseEmailAddresses 解析邮箱地址列表
func parseEmailAddresses(addresses string) []string {
	var result []string
	for _, addr := range strings.Split(addresses, ",") {
		addr = strings.TrimSpace(addr)
		if addr != "" && strings.Contains(addr, "@") {
			result = append(result, addr)
		}
	}
	return result
}

// sendMailGmail 通过 Gmail SMTP 发送邮件
func sendMailGmail(from, password string, to []string, msg []byte) error {
	// Gmail SMTP 配置
	smtpHost := "smtp.gmail.com"
	smtpPort := 465

	addr := fmt.Sprintf("%s:%d", smtpHost, smtpPort)
	auth := smtp.PlainAuth("", from, password, smtpHost)

	// TLS 配置
	tlsConfig := &tls.Config{
		ServerName: smtpHost,
	}

	// 建立 TLS 连接
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("连接失败: %v", err)
	}

	// 创建 SMTP 客户端
	client, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return fmt.Errorf("创建客户端失败: %v", err)
	}
	defer client.Close()

	// 认证
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("认证失败（请检查应用密码）: %v", err)
	}

	// 设置发件人
	if err = client.Mail(from); err != nil {
		return fmt.Errorf("设置发件人失败: %v", err)
	}

	// 设置收件人
	for _, recipient := range to {
		if err = client.Rcpt(recipient); err != nil {
			return fmt.Errorf("设置收件人失败 (%s): %v", recipient, err)
		}
	}

	// 发送邮件内容
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("获取写入器失败: %v", err)
	}
	_, err = writer.Write(msg)
	if err != nil {
		return fmt.Errorf("写入内容失败: %v", err)
	}
	err = writer.Close()
	if err != nil {
		return fmt.Errorf("关闭写入器失败: %v", err)
	}

	return client.Quit()
}
