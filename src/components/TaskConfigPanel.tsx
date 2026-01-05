import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  Spin,
  Typography,
  Empty,
  Alert,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { TaskInput } from "../types/workflow";
import { getTaskConfig, TaskConfig, TaskConfigParam } from "../api/workflowApi";

const { Text } = Typography;
const { TextArea } = Input;

interface TaskConfigPanelProps {
  taskTypeId: string;
  initialValues?: TaskInput;
  onValuesChange?: (values: TaskInput) => void;
}

const getDefaultValues = (config: TaskConfig): TaskInput => {
  const values: TaskInput = {};
  config.params.forEach((param) => {
    if (param.default !== undefined) {
      values[param.name] = param.default;
    }
  });
  return values;
};

const ParamInput: React.FC<{
  param: TaskConfigParam;
  value: unknown;
  onChange: (value: unknown) => void;
}> = ({ param, value, onChange }) => {
  const renderInput = () => {
    switch (param.type) {
      case "boolean":
        return (
          <Switch
            checked={Boolean(value)}
            onChange={(checked) => onChange(checked)}
            checkedChildren="是"
            unCheckedChildren="否"
          />
        );

      case "number":
        return (
          <InputNumber
            value={value as number}
            onChange={(val) => onChange(val)}
            style={{ width: "100%" }}
          />
        );

      case "select":
        return (
          <Select
            value={value as string}
            onChange={(val) => onChange(val)}
            placeholder="请选择..."
            style={{ width: "100%" }}
            options={param.options?.map((opt) => ({
              label: opt.label,
              value: opt.value,
            }))}
          />
        );

      case "datetime":
        return (
          <DatePicker
            showTime
            style={{ width: "100%" }}
            onChange={(_, dateString) => onChange(dateString)}
          />
        );

      case "cron":
        return (
          <div>
            <Input
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="例如: 0 9 * * * (每天9点)"
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              格式: 分 时 日 月 周
            </Text>
          </div>
        );

      case "json":
        return (
          <TextArea
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
            rows={4}
            style={{ fontFamily: "monospace" }}
          />
        );

      default:
        return (
          <Input
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <Form.Item
      label={
        param.type !== "boolean" ? (
          <span>
            {param.label}
            {param.required && <Text type="danger"> *</Text>}
          </span>
        ) : undefined
      }
      help={param.description}
      style={{ marginBottom: 16 }}
    >
      {param.type === "boolean" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {renderInput()}
          <span>{param.label}</span>
        </div>
      ) : (
        renderInput()
      )}
    </Form.Item>
  );
};

const TaskConfigPanel: React.FC<TaskConfigPanelProps> = ({
  taskTypeId,
  initialValues,
  onValuesChange,
}) => {
  const [config, setConfig] = useState<TaskConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [values, setValues] = useState<TaskInput>(initialValues || {});
  const initializedRef = useRef(false);
  const prevTaskTypeIdRef = useRef(taskTypeId);

  useEffect(() => {
    if (prevTaskTypeIdRef.current === taskTypeId && config) return;
    prevTaskTypeIdRef.current = taskTypeId;
    let mounted = true;

    const fetchConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const taskConfig = await getTaskConfig(taskTypeId);
        if (mounted) {
          setConfig(taskConfig);
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
        if (mounted) setConfigLoading(false);
      }
    };

    fetchConfig();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskTypeId]);

  useEffect(() => {
    if (initialValues) setValues(initialValues);
  }, [initialValues]);

  const handleValueChange = useCallback(
    (key: string, value: unknown) => {
      const newValues = { ...values, [key]: value };
      setValues(newValues);
      onValuesChange?.(newValues);
    },
    [values, onValuesChange]
  );

  if (configLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin tip="加载配置中..." />
      </div>
    );
  }

  if (configError) {
    return (
      <Alert
        message="加载失败"
        description={configError}
        type="error"
        showIcon
      />
    );
  }

  if (!config || config.params.length === 0) {
    return (
      <Empty
        description="该任务无需配置参数"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <SettingOutlined />
        <Text strong>参数配置</Text>
      </div>
      <Form layout="vertical" size="small">
        {config.params.map((param) => (
          <ParamInput
            key={param.name}
            param={param}
            value={values[param.name]}
            onChange={(value) => handleValueChange(param.name, value)}
          />
        ))}
      </Form>
    </div>
  );
};

export default TaskConfigPanel;
