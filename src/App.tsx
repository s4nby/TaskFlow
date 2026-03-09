import React, { useState, Suspense, lazy, useEffect } from 'react';
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

// Access Electron modules safely
// @ts-ignore
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;
const shell = electron ? electron.shell : null;

const App: React.FC = () => {
  const { state, commands } = useAppViewModel();
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [selectedCreationDate, setSelectedCreationDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check for updates on mount
    commands.checkForUpdates();

    // Listen for global events
    if (ipcRenderer) {
      const handleGlobalNewTask = () => {
        commands.setActiveListId('todo');
        // Small delay to ensure view switch before focus if we had focus logic
      };
      
      const handleNavigate = (_event: any, target: string) => {
        commands.setActiveListId(target);
      };

      ipcRenderer.on('global-new-task', handleGlobalNewTask);
      ipcRenderer.on('navigate', handleNavigate);

      return () => {
        ipcRenderer.removeListener('global-new-task', handleGlobalNewTask);
        ipcRenderer.removeListener('navigate', handleNavigate);
      };
    }
  }, [ipcRenderer]);

  const activeProject = state.projectLists.find(p => p.id === state.activeListId);

  const handleExport = async () => {
    if (!ipcRenderer) return;
    
    let md = "# TaskFlow Data Export\n\n";
    state.projectLists.forEach(p => {
      md += `## Project: ${p.name} (Created: ${p.createdDate})\n`;
      const projTasks = state.tasks.filter(t => t.listId === p.id);
      projTasks.forEach(t => {
        md += `- [${t.completed ? 'x' : ' '}] ${t.text} (Priority: ${t.priority})\n`;
        t.subTasks?.forEach(s => {
          md += `  - [${s.completed ? 'x' : ' '}] ${s.text}\n`;
        });
      });
      md += "\n";
    });

    const success = await ipcRenderer.invoke('export-to-markdown', md);
    if (success) {
      alert('Data exported successfully!');
    }
  };

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
                  onExport={handleExport}
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
                  isPreferred={activeProject?.isPreferred}
                  onTogglePreference={activeProject ? () => commands.toggleProjectPreference(activeProject.id) : undefined}
                  onSetPriority={commands.setTaskPriority}
                  onAddSubTask={commands.addSubTask}
                  onToggleSubTask={commands.toggleSubTask}
                  onReorderTasks={commands.reorderTasks}
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
                onClick={() => {
                  if (state.updateStatus === 'ready') {
                    commands.installUpdate();
                  } else if (ipcRenderer) {
                    commands.startUpdate();
                    // Fallback: If it stays in 'available' for too long after click, 
                    // it might be because the provider is failing. Offer manual download.
                    setTimeout(() => {
                      if (state.updateStatus === 'available' && shell) {
                        shell.openExternal('https://github.com/s4nby/TaskFlow/releases/latest');
                      }
                    }, 5000);
                  }
                }}
                title={state.updateStatus === 'ready' ? 'Restart to Update' : state.updateStatus === 'downloading' ? 'Downloading...' : `Update Available (${state.availableVersion}) - Click to Update`}
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
          onTogglePreference={(id) => commands.toggleProjectPreference(id)}
          onRenameProject={(id, name) => commands.updateProjectName(id, name)}
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
