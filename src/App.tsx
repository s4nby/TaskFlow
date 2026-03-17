import React, { useState, Suspense, lazy, useEffect, useRef } from 'react';
import { Minus, Square, X, Calendar as CalendarIcon, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './styles/main.css';
import AIAssistantPanel from './components/AIAssistantPanel';
import type { PendingCreation } from './hooks/useAIAssistant';

// MVVM Layers
import { useAppViewModel } from './viewmodels/useAppViewModel';
import Sidebar from './views/Sidebar';

// Lazy loaded components
const HubView = lazy(() => import('./views/HubView'));
const CalendarView = lazy(() => import('./views/CalendarView'));
const TaskListView = lazy(() => import('./views/TaskListView'));
const PromptManagerView = lazy(() => import('./views/PromptManagerView'));
const ProjectNamingModal = lazy(() => import('./components/ProjectNamingModal'));

// Access Electron IPC via preload contextBridge
const ipcRenderer = (window as any).electronAPI ?? null;

const App: React.FC = () => {
  const { state, commands } = useAppViewModel();
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [selectedCreationDate, setSelectedCreationDate] = useState<string | undefined>(undefined);
  const [namingType, setNamingType] = useState<'project' | 'prompt'>('project');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        commands.setSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commands.setSearchTerm]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    // Check for updates on mount
    commands.checkForUpdates();
  }, [commands.checkForUpdates]);

  useEffect(() => {
    // Listen for global events
    if (ipcRenderer) {
      const handleGlobalNewTask = () => {
        commands.setActiveListId('todo');
      };
      
      const handleNavigate = (_event: any, target: string) => {
        commands.setActiveListId(target);
      };

      const wrappedNewTask = ipcRenderer.on('global-new-task', handleGlobalNewTask);
      const wrappedNavigate = ipcRenderer.on('navigate', handleNavigate);

      return () => {
        ipcRenderer.removeListener('global-new-task', wrappedNewTask);
        ipcRenderer.removeListener('navigate', wrappedNavigate);
      };
    }
  }, [ipcRenderer, commands.setActiveListId]);

  const activeProject = state.projectLists.find(p => p.id === state.activeListId);

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
                  onInitializeProject={(type = 'project') => {
                    setNamingType(type);
                    setIsNamingModalOpen(true);
                  }}
                  onSelectProject={(id) => {
                    commands.setActiveListId(id);
                  }}
                  onDeleteProject={(id) => commands.deleteProject(id)}
                  onRenameProject={commands.updateProjectName}
                  onTogglePreference={commands.toggleProjectPreference}
                  onOpenAI={() => setIsAIOpen(prev => !prev)}
                  isAIOpen={isAIOpen}
                  updateStatus={state.updateStatus}
                  setUpdateStatus={commands.setUpdateStatus}
                  setDownloadProgress={commands.setDownloadProgress}
                  onClearAllData={commands.clearAllData}
                />
              );
            case 'important':
              return (
                <HubView 
                  title="Favorites"
                  projectLists={state.projectLists.filter(p => p.isPreferred)}
                  tasks={state.tasks}
                  onInitializeProject={(type = 'project') => {
                    setNamingType(type);
                    setIsNamingModalOpen(true);
                  }}
                  onSelectProject={(id) => {
                    commands.setActiveListId(id);
                  }}
                  onDeleteProject={(id) => commands.deleteProject(id)}
                  onRenameProject={commands.updateProjectName}
                  onTogglePreference={commands.toggleProjectPreference}
                  hideActions={true}
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
              const title = activeProject ? activeProject.name : state.activeListId === 'todo' ? 'Quick to-do list' : state.activeListId === 'important' ? 'Important' : 'Tasks';
              
              if (activeProject?.type === 'prompt') {
                return (
                  <PromptManagerView 
                    title={title}
                    prompts={state.filteredTasks}
                    onAddTask={(e, promptTitle, promptText) => {
                      e.preventDefault();
                      commands.addTask(promptText, undefined, 'low', promptTitle);
                    }}
                    onDeleteTask={(id) => commands.deleteTask(id)}
                    onUpdateTask={(id, text, promptTitle) => {
                      commands.updateTask(id, text, promptTitle);
                    }}
                    isPreferred={activeProject?.isPreferred}
                    onTogglePreference={activeProject ? () => commands.toggleProjectPreference(activeProject.id) : undefined}
                  />
                );
              }

              return (
                <TaskListView 
                  title={title}
                  tasks={state.filteredTasks}
                  filterDate={state.filterDate}
                  newTaskText={state.newTaskText}
                  onSetNewTaskText={commands.setNewTaskText}
                  onAddTask={(e, title) => {
                    e.preventDefault();
                    commands.addTask(undefined, undefined, 'low', title);
                  }}
                  onToggleTask={(id) => commands.toggleTask(id)}
                  onDeleteTask={(id) => commands.deleteTask(id)}
                  onUpdateTask={(id, text, title) => {
                    commands.updateTask(id, text, title);
                  }}
                  onClearFilter={() => commands.setFilterDate(null)}
                  hideQuickAdd={state.activeListId === 'important'}
                  isPreferred={activeProject?.isPreferred}
                  onTogglePreference={activeProject ? () => commands.toggleProjectPreference(activeProject.id) : undefined}
                  onSetPriority={commands.setTaskPriority}
                  onAddSubTask={commands.addSubTask}
                  onToggleSubTask={commands.toggleSubTask}
                  onUpdateSubTask={commands.updateSubTask}
                  onMergeTasks={commands.mergeTasks}
                  onReorderTasks={commands.reorderTasks}
                />
              );
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div id="app-wrapper">
      {/* SEARCH OVERLAY */}
      {isSearchOpen && (
        <div className="search-overlay" onClick={() => {
          setIsSearchOpen(false);
          commands.setSearchTerm('');
        }}>
          <div className="search-modal glass-effect" onClick={e => e.stopPropagation()}>
            <div className="search-input-wrapper">
              <Search size={20} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search tasks and projects..."
                value={state.searchTerm}
                onChange={(e) => commands.setSearchTerm(e.target.value)}
              />
            </div>
            
            {state.searchTerm.trim() && (
              <div className="search-results-container">
                {state.searchResults.projects.length > 0 && (
                  <div className="search-result-group">
                    <div className="search-result-header">PROJECTS</div>
                    {state.searchResults.projects.map(p => (
                      <div key={p.id} className="search-result-item" onClick={() => {
                        commands.setActiveListId(p.id);
                        setIsSearchOpen(false);
                        commands.setSearchTerm('');
                      }}>
                        <span className="result-name">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {state.searchResults.tasks.length > 0 && (
                  <div className="search-result-group">
                    <div className="search-result-header">TASKS</div>
                    {state.searchResults.tasks.map(t => (
                      <div key={t.id} className="search-result-item" onClick={() => {
                        commands.setActiveListId(t.listId || 'todo');
                        setIsSearchOpen(false);
                        commands.setSearchTerm('');
                      }}>
                        <span className="result-name">{t.text}</span>
                        <span className="result-meta">{state.projectLists.find(p => p.id === t.listId)?.name || 'Quick to-do list'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {state.searchResults.projects.length === 0 && state.searchResults.tasks.length === 0 && (
                  <div className="search-no-results">No matches found for "{state.searchTerm}"</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEAMLESS UNIFIED HEADER */}
      <div className="unified-header">
        {/* LEFT: SIDEBAR CONTROLS */}
        <div className="header-left-zone">
          <div
            className="app-icon-toggle"
            onClick={() => commands.setIsSidebarExpanded(!state.isSidebarExpanded)}
            title={state.isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <img src="icon_32x32.png" className="app-header-icon" alt="taskflow" />
            <div className="app-icon-hint">
              {state.isSidebarExpanded
                ? <PanelLeftClose size={13} />
                : <PanelLeftOpen size={13} />}
            </div>
          </div>
          <button 
            className={`header-icon-btn ${state.activeListId === 'calendar' ? 'active' : ''}`} 
            onClick={() => {
              commands.setActiveListId('calendar');
              commands.setFilterDate(null);
            }}
            title="Calendar"
          >
            <CalendarIcon size={16} />
          </button>
          <button
            className={`header-icon-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(true)}
            title="Search (Ctrl+F)"
          >
            <Search size={15} />
          </button>
          <div className="header-divider" />
          <div className="header-branding">taskflow</div>
        </div>

        {/* RIGHT: WINDOW CONTROLS */}
        <div className="header-right-zone">
          <div className="window-controls-integrated">
            {(state.updateStatus === 'available' || state.updateStatus === 'ready') && (
              <button
                className="update-btn"
                onClick={() => {
                  if (!ipcRenderer) return;
                  if (state.updateStatus === 'ready') commands.installUpdate();
                  else commands.startUpdate();
                }}
                title={state.updateStatus === 'ready'
                  ? `Update ready (${state.availableVersion}) — Click to restart and install`
                  : `Update available (${state.availableVersion}) — Click to download`}
                aria-label={state.updateStatus === 'ready'
                  ? `Update ready: version ${state.availableVersion}. Click to restart and install.`
                  : `Update available: version ${state.availableVersion}. Click to download.`}
              >
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="0.75" x2="5" y2="6.25" />
                  <polyline points="2.5,4.25 5,6.75 7.5,4.25" />
                  <line x1="1.25" y1="9" x2="8.75" y2="9" />
                </svg>
              </button>
            )}
            <div className="header-divider" />
            <button className="glyph-btn" onClick={() => ipcRenderer.send('window-minimize')} title="Minimize" aria-label="Minimize window">
              <Minus size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button className="glyph-btn" onClick={() => ipcRenderer.send('window-maximize')} title="Maximize" aria-label="Maximize window">
              <Square size={14} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button className="glyph-btn close-glyph" onClick={() => ipcRenderer.send('window-close')} title="Close" aria-label="Close window">
              <X size={18} strokeWidth={1.5} aria-hidden="true" />
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
          onRenameProject={(id, name) => commands.updateProjectName(id, name)}
        />

        <main className="main-content-integrated">
          {renderActiveView()}
        </main>
      </div>

      <AIAssistantPanel
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        activeListId={state.activeListId}
        projectLists={state.projectLists}
        tasks={state.tasks}
        onCreateEntry={(creation: PendingCreation) => {
          if (creation.type === 'todo_list') {
            commands.createProjectWithTasks(creation.title, 'project', creation.items);
          } else {
            commands.createProjectWithTasks(creation.title, 'prompt', [creation.content], creation.promptTitle);
          }
        }}
      />

      <Suspense fallback={null}>
        <ProjectNamingModal 
          isOpen={isNamingModalOpen}
          type={namingType}
          onClose={() => {
            setIsNamingModalOpen(false);
            setSelectedCreationDate(undefined);
            setNamingType('project');
          }}
          onCreate={(name) => {
            commands.createProject(name, selectedCreationDate, namingType);
            setIsNamingModalOpen(false);
            setSelectedCreationDate(undefined);
            setNamingType('project');
          }}
        />
      </Suspense>
    </div>
  );
};

export default App;
