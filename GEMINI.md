# TaskFlow Project Context

A high-performance, minimalist to-do list and productivity application for Windows, built with Electron, React, and TypeScript.

## 🏗️ Architecture: MVVM
- **View (V)**: React components in `src/views` and `src/components`.
- **ViewModel (VM)**: Managed by `src/viewmodels/useAppViewModel.ts`. It centralizes all state and logic, exposing a `state` object and a `commands` object.
- **Model (M)**: TypeScript interfaces defined in `src/models/types.ts`.

## 🛠️ Tech Stack
- **Frontend**: React (TypeScript), Vite.
- **Desktop**: Electron (using `main.cjs`).
- **Icons**: Lucide React.
- **Styling**: Vanilla CSS (`src/styles/main.css`).
- **Persistence**: LocalStorage (handled within the ViewModel).

## 🚀 Key Features
- **Dashboard (Creation Hub)**: Unified initialization point for Projects and Prompt Groups.
- **AI Task Architect**: Natural language task generation using a mocked AI heuristic (integrated in header and dashboard).
- **Prompt Manager**: A specialized list view for administrative text prompts with instant copy functionality.
- **Calendar View**: Visual overview of project timelines and task deadlines.
- **Quick to-do list**: Fast, priority-based task management.

## 🎨 Design Conventions
- **Minimalist Aesthetic**: Focus on typography, whitespace, and subtle "glass" effects.
- **Interaction Model**: Priority is given to fast, keyboard-driven workflows (e.g., Enter to submit, Shift+Enter for newlines in textareas).
- **Feedback**: Interactive hover states and subtle animations (`anim-spin`, `anim-bounce`).

## 📋 Operational Commands
- **Development**: `npm run electron:dev` (Starts Vite + Electron).
- **Build**: `npm run build` (Runs `tsc` and `vite build`).
- **Release**: Handled via `electron-builder` publishing to GitHub releases.

## ⚠️ Stability Notes
- **React Hooks**: Strictly avoid state initialization or conditional hooks inside loops (e.g., `renderCard` maps). Move complex logic into sub-components.
- **IPC Safety**: Always check if `window.require` or `electron` exists before making IPC calls to ensure web compatibility.
- **Versioning**: `package.json` version is the single source of truth for the in-app updater.
