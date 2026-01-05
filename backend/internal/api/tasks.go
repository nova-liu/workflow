package api

import (
	"net/http"
	"sort"
	"workflow-engine/internal/executor"

	"github.com/gin-gonic/gin"
)

// listTasks 列出所有任务类型
func listTasks(c *gin.Context) {
	configs := executor.GetAllConfigs()

	// 按分类整理
	result := make(map[string][]executor.TaskConfig)
	for _, config := range configs {
		result[config.Category] = append(result[config.Category], config)
	}

	// 排序
	for category := range result {
		sort.Slice(result[category], func(i, j int) bool {
			return result[category][i].ID < result[category][j].ID
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks": result,
	})
}

// getTaskConfig 获取任务配置
func getTaskConfig(c *gin.Context) {
	taskType := c.Param("taskType")
	config, ok := executor.GetConfig(taskType)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "任务类型不存在: " + taskType,
		})
		return
	}
	c.JSON(http.StatusOK, config)
}
