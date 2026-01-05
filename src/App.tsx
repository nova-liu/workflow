import React from "react";
import { ConfigProvider, theme } from "antd";
import WorkflowCanvas from "./components/WorkflowCanvas";
import "./styles/workflow.css";

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#1890ff",
          borderRadius: 6,
        },
      }}
    >
      <WorkflowCanvas />
    </ConfigProvider>
  );
}

export default App;
