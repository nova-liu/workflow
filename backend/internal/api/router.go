package api

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes 注册所有路由
func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// 健康检查
		api.GET("/health", healthCheck)

		// 任务类型相关
		api.GET("/tasks", listTasks)
		api.GET("/tasks/:taskType/config", getTaskConfig)

		// 工作流执行
		api.POST("/workflow/execute", executeWorkflow)
	}
}
