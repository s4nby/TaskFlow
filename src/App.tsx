import React, { useState, Suspense, lazy } from 'react';
import { Minus, Square, X, Menu, ChevronLeft, Sun, Moon, Monitor, ArrowDown } from 'lucide-react';
import './styles/main.css';

// MVVM Layers
import { useAppViewModel } from './viewmodels/useAppViewModel';
import Sidebar from './views/Sidebar';
import packageJson from '../package.json';

// Lazy loaded components
const HubView = lazy(() => import('./views/HubView'));
const CalendarView = lazy(() => import('./views/CalendarView'));
const TaskListView = lazy(() => import('./views/TaskListView'));
const ProjectNamingModal = lazy(() => import('./components/ProjectNamingModal'));

// Access Electron IPC
// @ts-ignore
const { ipcRenderer } = window.require('electron');

const App: React.FC = () => {
  const { state, commands } = useAppViewModel();
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [selectedCreationDate, setSelectedCreationDate] = useState<string | undefined>(undefined);

  const activeProject = state.projectLists.find(p => p.id === state.activeListId);

  const toggleTheme = () => {
    const modes: ('system' | 'light' | 'dark')[] = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(state.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    commands.setThemeMode(modes[nextIndex]);
  };

  const renderActiveView = () => {
    return (
      <Suspense fallback={<div className="standard-page">Loading...</div>}>
        {(() => {
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
                  onInitializeProject={(date) => {
                    setSelectedCreationDate(date);
                    setIsNamingModalOpen(true);
                  }}
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
                  onSetNewTaskText={commands.setNewTaskText}
                  onAddTask={(e) => {
                    e.preventDefault();
                    commands.addTask();
                  }}
                  onToggleTask={(id) => commands.toggleTask(id)}
                  onDeleteTask={(id) => commands.deleteTask(id)}
                  onUpdateTask={(id, text) => commands.updateTask(id, text)}
                  onClearFilter={() => commands.setFilterDate(null)}
                  hideQuickAdd={state.activeListId === 'important'}
                />
              );
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div id="app-wrapper" className={state.theme === 'light' ? 'light-theme' : ''}>
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
            {state.updateStatus !== 'none' && (
              <button 
                className={`glyph-btn update-indicator ${state.updateStatus}`} 
                onClick={() => state.updateStatus === 'ready' ? commands.installUpdate() : commands.startUpdate()}
                title={state.updateStatus === 'ready' ? 'Restart to Update' : state.updateStatus === 'downloading' ? 'Downloading...' : `Update Available (${state.availableVersion})`}
              >
                <ArrowDown size={16} className={state.updateStatus === 'downloading' ? 'anim-bounce' : ''} />
              </button>
            )}
            <button 
              className="glyph-btn" 
              onClick={toggleTheme} 
              title={`Theme: ${state.themeMode.charAt(0).toUpperCase() + state.themeMode.slice(1)}`}
            >
              {state.themeMode === 'system' ? <Monitor size={16} /> : state.themeMode === 'light' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="header-divider" />
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

      <div className="app-version-label">v{packageJson.version}</div>

      <Suspense fallback={null}>
        <ProjectNamingModal 
          isOpen={isNamingModalOpen}
          onClose={() => {
            setIsNamingModalOpen(false);
            setSelectedCreationDate(undefined);
          }}
          onCreate={(name) => {
            commands.createProject(name, selectedCreationDate);
            setIsNamingModalOpen(false);
            setSelectedCreationDate(undefined);
          }}
        />
      </Suspense>
    </div>
  );
};

export default App;
