import React, { useState } from 'react';
import { Minus, Square, X, Menu, ChevronLeft } from 'lucide-react';
import './styles/main.css';

// MVVM Layers
import { useAppViewModel } from './viewmodels/useAppViewModel';
import Sidebar from './views/Sidebar';
import HubView from './views/HubView';
import CalendarView from './views/CalendarView';
import TaskListView from './views/TaskListView';
import ProjectNamingModal from './components/ProjectNamingModal';

// Access Electron IPC
// @ts-ignore
const { ipcRenderer } = window.require('electron');

const App: React.FC = () => {
  const { state, commands } = useAppViewModel();
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);

  const activeProject = state.projectLists.find(p => p.id === state.activeListId);

  const renderActiveView = () => {
    switch (state.activeListId) {
      case 'hub':
        return (
          <HubView 
            projectLists={state.projectLists}
            tasks={state.tasks}
            onInitializeProject={() => setIsNamingModalOpen(true)}
            onSelectProject={(id) => {
              commands.setActiveListId(id);
            }}
            onDeleteProject={(id) => commands.deleteProject(id)}
          />
        );
      case 'calendar':
        return (
          <CalendarView 
            viewDate={state.viewDate}
            calendarDays={state.calendarDays}
            onSelectProject={(id) => {
              commands.setActiveListId(id);
            }}
            onPrevMonth={() => commands.changeMonth(-1)}
            onNextMonth={() => commands.changeMonth(1)}
          />
        );
      default:
        const title = activeProject ? activeProject.name : state.activeListId === 'todo' ? 'To Do List' : state.activeListId === 'important' ? 'Important' : 'Tasks';
        return (
          <TaskListView 
            title={title}
            tasks={state.filteredTasks}
            filterDate={state.filterDate}
            newTaskText={state.newTaskText}
            newTaskDate={state.newTaskDate}
            onSetNewTaskText={commands.setNewTaskText}
            onSetNewTaskDate={commands.setNewTaskDate}
            onAddTask={(e) => {
              e.preventDefault();
              commands.addTask();
            }}
            onToggleTask={(id) => commands.toggleTask(id)}
            onDeleteTask={(id) => commands.deleteTask(id)}
            onClearFilter={() => commands.setFilterDate(null)}
          />
        );
    }
  };

  return (
    <div id="root">
      {/* SEAMLESS UNIFIED HEADER */}
      <div className="unified-header">
        {/* LEFT: SIDEBAR CONTROLS */}
        <div className="header-left-zone">
          <button 
            className="header-icon-btn" 
            onClick={() => commands.setIsSidebarExpanded(!state.isSidebarExpanded)}
            title={state.isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {state.isSidebarExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* CENTER: PRIMARY BRANDING */}
        <div className="header-center-zone">
          <div className="header-branding">TaskFlow</div>
        </div>

        {/* RIGHT: WINDOW CONTROLS */}
        <div className="header-right-zone">
          <div className="window-controls-integrated">
            <button className="glyph-btn" onClick={() => ipcRenderer.send('window-minimize')} title="Minimize">
              <Minus size={16} strokeWidth={1.5} />
            </button>
            <button className="glyph-btn" onClick={() => ipcRenderer.send('window-maximize')} title="Maximize">
              <Square size={14} strokeWidth={1.5} />
            </button>
            <button className="glyph-btn close-glyph" onClick={() => ipcRenderer.send('window-close')} title="Close">
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        
        {/* DRAG REGION LAYER */}
        <div className="header-drag-overlay" />
      </div>

      <div className="app-container">
        <Sidebar 
          isExpanded={state.isSidebarExpanded}
          activeListId={state.activeListId}
          projectLists={state.projectLists}
          onNavigate={(id) => {
            commands.setActiveListId(id);
            commands.setFilterDate(null);
          }}
          onDeleteProject={(id) => commands.deleteProject(id)}
        />

        <main className="main-content-integrated">
          {renderActiveView()}
        </main>
      </div>

      <ProjectNamingModal 
        isOpen={isNamingModalOpen}
        onClose={() => setIsNamingModalOpen(false)}
        onCreate={(name) => {
          commands.createProject(name);
          setIsNamingModalOpen(false);
        }}
      />
    </div>
  );
};

export default App;
