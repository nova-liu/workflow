import React, { useState, useCallback, useEffect, useRef } from "react";
import { TaskInput } from "../types/workflow";
import { getTaskConfig, TaskConfig, TaskConfigParam } from "../api/workflowApi";

interface TaskConfigPanelProps {
  taskTypeId: string;
  initialValues?: TaskInput;
  onValuesChange?: (values: TaskInput) => void;
}

// 根据参数定义获取默认值
const getDefaultValues = (config: TaskConfig): TaskInput => {
  const values: TaskInput = {};
  config.params.forEach((param) => {
    if (param.default !== undefined) {
      values[param.name] = param.default;
    }
  });
  return values;
};

// 单个参数输入组件
const ParamInput: React.FC<{
  param: TaskConfigParam;
  value: unknown;
  onChange: (value: unknown) => void;
  allValues: TaskInput;
}> = ({ param, value, onChange, allValues }) => {
  // 根据调度类型动态显示/隐藏相关字段
  const shouldShow = () => {
    if (param.name === "cronExpression") {
      return allValues.scheduleType === "cron";
    }
    if (param.name === "intervalSeconds") {
      return allValues.scheduleType === "interval";
    }
    if (param.name === "executeAt") {
      return allValues.scheduleType === "once";
    }
    return true;
  };

  if (!shouldShow()) {
    return null;
  }

  const renderInput = () => {
    switch (param.type) {
      case "boolean":
        return (
          <label className="param-checkbox">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="checkbox-label">{param.label}</span>
          </label>
        );

      case "number":
        return (
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="param-input"
          />
        );

      case "select":
        return (
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="param-select"
          >
            <option value="">请选择...</option>
            {param.options?.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "datetime":
        return (
          <input
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="param-input"
          />
        );

      case "cron":
        return (
          <div className="cron-input-wrapper">
            <input
              type="text"
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="例如: 0 9 * * * (每天9点)"
              className="param-input"
            />
            <div className="cron-help">格式: 分 时 日 月 周</div>
          </div>
        );

      case "json":
        return (
          <textarea
            value={
              typeof value === "string" ? value : JSON.stringify(value, null, 2)
            }
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            className="param-textarea"
            rows={4}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="param-input"
          />
        );
    }
  };

  return (
    <div className="param-field">
      {param.type !== "boolean" && (
        <label className="param-label">
          {param.label}
          {param.required && <span className="required-mark">*</span>}
        </label>
      )}
      {renderInput()}
      {param.description && (
        <div className="param-description">{param.description}</div>
      )}
    </div>
  );
};

// 主组件 - 纯参数配置面板，不包含执行功能
const TaskConfigPanel: React.FC<TaskConfigPanelProps> = ({
  taskTypeId,
  initialValues,
  onValuesChange,
}) => {
  const [config, setConfig] = useState<TaskConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [values, setValues] = useState<TaskInput>(initialValues || {});

  // 用于追踪是否已经设置过初始值
  const initializedRef = useRef(false);
  // 缓存上一次的 taskTypeId
  const prevTaskTypeIdRef = useRef(taskTypeId);

  // 从后端获取任务配置（只在 taskTypeId 变化时获取）
  useEffect(() => {
    // 如果 taskTypeId 没变，不重新获取
    if (prevTaskTypeIdRef.current === taskTypeId && config) {
      return;
    }
    prevTaskTypeIdRef.current = taskTypeId;

    let mounted = true;

    const fetchConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);

      try {
        const taskConfig = await getTaskConfig(taskTypeId);
        if (mounted) {
          setConfig(taskConfig);
          // 只在没有初始值且未初始化过时设置默认值
          if (!initialValues && !initializedRef.current) {
            const defaults = getDefaultValues(taskConfig);
            setValues(defaults);
            onValuesChange?.(defaults);
            initializedRef.current = true;
          }
        }
      } catch (err) {
        if (mounted) {
          setConfigError(err instanceof Error ? err.message : "获取配置失败");
        }
      } finally {
        if (mounted) {
          setConfigLoading(false);
        }
      }
    };

    fetchConfig();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskTypeId]); // 只依赖 taskTypeId，其他依赖会导致无限循环

  // 当 initialValues 外部变化时同步
  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
    }
  }, [initialValues]);

  const handleValueChange = useCallback(
    (key: string, value: unknown) => {
      const newValues = { ...values, [key]: value };
      setValues(newValues);
      // 本地更新，不调用后端 API
      onValuesChange?.(newValues);
    },
    [values, onValuesChange]
  );

  if (configLoading) {
    return (
      <div className="config-panel loading">
        <div className="loading-spinner"></div>
        <span>加载配置中...</span>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="config-panel error">
        <p>⚠️ {configError}</p>
      </div>
    );
  }

  if (!config || config.params.length === 0) {
    return (
      <div className="config-panel no-config">
        <p>该任务无需配置参数</p>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <div className="config-panel-header">
        <h4>⚙️ 参数配置</h4>
      </div>

      <div className="config-panel-params">
        {config.params.map((param) => (
          <ParamInput
            key={param.name}
            param={param}
            value={values[param.name]}
            onChange={(value) => handleValueChange(param.name, value)}
            allValues={values}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskConfigPanel;
