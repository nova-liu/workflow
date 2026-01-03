
# Workflow Orchestration System

>A visual workflow orchestration system. Drag, drop, and combine tasks to quickly build automation workflows.

## Features

- **Task Panel**: All available task types are shown on the left, with search, collapsible categories, and drag-and-drop support.
- **Visual Canvas**: Drag task nodes onto the center canvas and connect them to form workflows.
- **Node Configuration**: Edit node names, view type and description, or delete nodes in the right panel.
- **Connections & Branching**: Connect nodes, and use condition/switch/loop logic.
- **Export & Clear**: Export the current workflow as JSON or clear the canvas.
- **Responsive Design**: Works on both desktop and mobile.

## Example Task Types

| Category   | Tasks                                                      |
|------------|------------------------------------------------------------|
| Trigger    | HTTP Trigger, Schedule Trigger, Webhook                    |
| Action     | HTTP Request, Send Email, Database Query, File Operation, Notification |
| Condition  | If Condition, Switch, Loop                                 |
| Transform  | Data Transform, JSON Parse, Filter, Aggregate              |

## Quick Start

1. Install dependencies:
	```bash
	npm install
	```
2. Start the development server:
	```bash
	npm start
	```
	Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Drag a task from the left panel onto the canvas to create a node.
2. Drag from the bottom handle of a node to the top of another to connect them.
3. Click a node to edit its name, view its type and description, or delete it in the right panel.
4. Use the toolbar in the top-right to clear the canvas or export the workflow.

## Tech Stack

- React 19
- TypeScript
- [@xyflow/react](https://xyflow.com/) (formerly react-flow)
- uuid

## Project Structure

```
src/
  components/         # Main UI components (canvas, task panel, nodes, etc.)
  types/              # Task type definitions
  styles/             # Stylesheets
  App.tsx             # Entry point
  ...
```

## Build & Deploy

```bash
npm run build
# The static files will be in the build/ directory and can be deployed to any static server.
```

## Contributing

Contributions are welcome! Please open issues or pull requests to help improve this project.

---
This project was bootstrapped with Create React App and is now a fully customized workflow orchestration system.
