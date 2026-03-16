import React, { useState, Suspense, lazy, useEffect, useRef, useCallback } from 'react';
import { Minus, Square, X, Menu, ChevronLeft, Sun, Moon, Monitor, ArrowDown, Calendar as CalendarIcon, Search } from 'lucide-react';
import './styles/main.css';
import AIAssistantPanel from './components/AIAssistantPanel';
import type { PendingCreation } from './hooks/useAIAssistant';

// MVVM Layers
import { useAppViewModel } from './viewmodels/useAppViewModel';
import Sidebar from './views/Sidebar';
import packageJson from '../package.json';

// Lazy loaded components
const HubView = lazy(() => import('./views/HubView'));
const CalendarView = lazy(() => import('./views/CalendarView'));
const TaskListView = lazy(() => import('./views/TaskListView'));
const PromptManagerView = lazy(() => import('./views/PromptManagerView'));
const ProjectNamingModal = lazy(() => import('./components/ProjectNamingModal'));

// Access Electron modules safely
// @ts-ignore
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

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

      ipcRenderer.on('global-new-task', handleGlobalNewTask);
      ipcRenderer.on('navigate', handleNavigate);

      return () => {
        ipcRenderer.removeListener('global-new-task', handleGlobalNewTask);
        ipcRenderer.removeListener('navigate', handleNavigate);
      };
    }
  }, [ipcRenderer, commands.setActiveListId]);

  const activeProject = state.projectLists.find(p => p.id === state.activeListId);

  const toggleTheme = useCallback(() => {
    const modes: ('system' | 'light' | 'dark')[] = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(state.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    commands.setThemeMode(modes[nextIndex]);
  }, [state.themeMode, commands.setThemeMode]);

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
    <div id="app-wrapper" className={state.theme === 'light' ? 'light-theme' : ''}>
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
                placeholder="Search tasks and projects... (Esc to close)"
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
          <img src="/icon_32x32.png" className="app-header-icon" alt="taskflow" />
          <button 
            className="header-icon-btn" 
            onClick={() => commands.setIsSidebarExpanded(!state.isSidebarExpanded)}
            title={state.isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {state.isSidebarExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
          <button 
            className={`header-icon-btn ${state.activeListId === 'calendar' ? 'active' : ''}`} 
            onClick={() => {
              commands.setActiveListId('calendar');
              commands.setFilterDate(null);
            }}
            title="Calendar"
          >
            <CalendarIcon size={18} />
          </button>
          <button
            className={`header-icon-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(true)}
            title="Search (Ctrl+F)"
          >
            <Search size={18} />
          </button>
          <div className="header-divider" />
          <div className="header-branding">taskflow</div>
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
                  }
                }}
                title={
                  state.updateStatus === 'ready' ? 'Restart to Update' : 
                  state.updateStatus === 'downloading' ? (state.downloadProgress > 0 ? `Downloading... ${state.downloadProgress}%` : 'Downloading...') : 
                  state.updateStatus === 'error' ? 'Update Failed - Click to Retry' :
                  `Update Available (${state.availableVersion}) - Click to Update`
                }
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
          onRenameProject={(id, name) => commands.updateProjectName(id, name)}
        />

        <main className="main-content-integrated">
          {renderActiveView()}
        </main>
      </div>

      <div className="app-version-label">v{packageJson.version}</div>

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
            
            // Only redirect if created from Calendar View (selectedCreationDate is set)
            if (selectedCreationDate) {
              // We need to wait for the next render or use the ID we just generated
              // Since createProject in useAppViewModel also uses Date.now().toString()
              // but it's internal, let's keep it simple: 
              // If the user is on dashboard, they stay there.
              // If they are on calendar, we want them to go to the project.
              // Actually, useAppViewModel generates the ID internally. 
              // To be safe and stay on Dashboard as requested, we just don't set active ID here.
              // If we REALLY need to redirect from Calendar, we'd need useAppViewModel to return the ID.
            }

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
