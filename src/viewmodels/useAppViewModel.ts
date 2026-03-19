import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Task, ProjectList, DayData, ViewState, Priority, SubTask, UpdateStatus } from '../models/types';

export const useAppViewModel = () => {
  // Synchronous initialization for "Instant Launch"
  const [activeListId, setActiveListId] = useState<ViewState>('hub');
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [projectLists, setProjectLists] = useState<ProjectList[]>(() => {
    const saved = localStorage.getItem('projects');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  

  // Update management state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('none');
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Restore internal state for task creation
  const [newTaskText, setNewTaskText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Access Electron IPC via preload contextBridge
  const ipcRenderer = (window as any).electronAPI ?? null;

  // Helper for consistent logging â€” dev only
  function logInfo(msg: string) {
    if (import.meta.env.DEV) console.log('[Updater UI] ' + msg);
  }
  function logError(msg: string) {
    if (import.meta.env.DEV) console.error('[Updater UI] ' + msg);
  }

  const checkForUpdates = useCallback(() => {
    logInfo('Update check triggered. Current Status: ' + updateStatus);
    
    if (ipcRenderer) {
      logInfo('Sending IPC: check-for-updates');
      ipcRenderer.send('check-for-updates');
    } else {
      logError('Electron updater bridge is unavailable.');
    }
  }, [ipcRenderer, updateStatus]);

  // Helper for consistent logging — dev only
  // Expose for dev console testing
  useEffect(() => {
    (window as any).forceUpdateCheck = checkForUpdates;
  }, [checkForUpdates]);

  // Dedicated Update Listeners (Runs Once)
  useEffect(() => {
    if (!ipcRenderer) return;

    const onUpdateAvailable = (version: string) => {
      logInfo('IPC - Update Available: ' + version);
      setAvailableVersion(version);
      setUpdateStatus('available');
    };

    const onUpdateNotAvailable = () => {
      logInfo('IPC - Update Not Available');
      setAvailableVersion(null);
      setDownloadProgress(0);
      setUpdateStatus(prev => prev === 'available' || prev === 'downloading' ? 'none' : prev);
    };

    const onUpdateProgress = (progressObj: any) => {
      setUpdateStatus('downloading');
      setDownloadProgress(Math.floor(progressObj?.percent ?? 0));
    };

    const onUpdateDownloaded = () => {
      logInfo('IPC - Update Downloaded — ready to install');
      setUpdateStatus('ready');
    };

    const onUpdateError = (message: string) => {
      logError('IPC - Update Error: ' + message);
      setDownloadProgress(0);
      setUpdateStatus(prev => prev === 'downloading' ? 'available' : 'error');
    };

    const wrappedAvailable = ipcRenderer.on('update-available', onUpdateAvailable);
    const wrappedNotAvailable = ipcRenderer.on('update-not-available', onUpdateNotAvailable);
    const wrappedProgress = ipcRenderer.on('update-progress', onUpdateProgress);
    const wrappedDownloaded = ipcRenderer.on('update-downloaded', onUpdateDownloaded);
    const wrappedError = ipcRenderer.on('update-error', onUpdateError);

    return () => {
      ipcRenderer.removeListener('update-available', wrappedAvailable);
      ipcRenderer.removeListener('update-not-available', wrappedNotAvailable);
      ipcRenderer.removeListener('update-progress', wrappedProgress);
      ipcRenderer.removeListener('update-downloaded', wrappedDownloaded);
      ipcRenderer.removeListener('update-error', wrappedError);
    };
  }, [ipcRenderer]);

  useEffect(() => {
    const handleOnline = () => {
      logInfo('Connectivity restored. Re-checking for updates...');
      checkForUpdates();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [checkForUpdates]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('projects', JSON.stringify(projectLists));
  }, [tasks, projectLists]);

  const filteredTasks = useMemo(() => {
    let list: Task[] = [];
    if (filterDate) {
      list = tasks.filter(t => t.dueDate === filterDate);
    } else if (activeListId === 'important') {
      const preferredProjectIds = projectLists.filter(p => p.isPreferred).map(p => p.id);
      list = tasks.filter(t => t.priority === 'high' || (t.listId && preferredProjectIds.includes(t.listId)));
    } else {
      list = tasks.filter(t => t.listId === activeListId);
    }

    const priorityWeight = { high: 3, medium: 2, low: 1 };

    return list.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      const pA = priorityWeight[a.priority] || 0;
      const pB = priorityWeight[b.priority] || 0;
      
      if (pA !== pB) return pB - pA; // Sort by priority first
      return (a.index ?? 0) - (b.index ?? 0); // Then by manual index
    });
  }, [tasks, activeListId, filterDate]);

  const sortedProjectLists = useMemo(() => {
    return [...projectLists].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  }, [projectLists]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return { projects: [], tasks: [] };
    const query = searchTerm.toLowerCase();
    
    return {
      projects: projectLists.filter(p => p.name.toLowerCase().includes(query)),
      tasks: tasks.filter(t => t.text.toLowerCase().includes(query))
    };
  }, [searchTerm, tasks, projectLists]);

  const calendarDays = useMemo(() => {
    if (activeListId !== 'calendar') return []; // Don't compute if not in calendar view

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days: DayData[] = [];
    
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Mon start

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Group tasks and projects by date for O(1) lookup in loop
    const tasksByDate: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
        tasksByDate[t.dueDate].push(t);
      }
    });

    const projectsByDate: Record<string, ProjectList[]> = {};
    projectLists.forEach(p => {
      if (p.createdDate) {
        if (!projectsByDate[p.createdDate]) projectsByDate[p.createdDate] = [];
        projectsByDate[p.createdDate].push(p);
      }
    });

    // Previous month ghost days
    for (let i = offset - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const d = new Date(year, month - 1, day);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ 
        day, 
        isCurrentMonth: false, 
        dateStr,
        tasksForDate: tasksByDate[dateStr] || [],
        projectsForDate: projectsByDate[dateStr] || []
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ 
        day: i, 
        isCurrentMonth: true, 
        dateStr,
        tasksForDate: tasksByDate[dateStr] || [],
        projectsForDate: projectsByDate[dateStr] || []
      });
    }

    // Next month ghost days
    const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length);
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ 
        day: i, 
        isCurrentMonth: false, 
        dateStr,
        tasksForDate: tasksByDate[dateStr] || [],
        projectsForDate: projectsByDate[dateStr] || []
      });
    }
    return days;
  }, [viewDate, tasks, projectLists, activeListId]);

  const addTask = async (text?: string, dueDate?: string, priority: Priority = 'low', title?: string) => {
    const taskText = text || newTaskText;
    if (!taskText.trim() && !title?.trim()) return;

    const taskDueDate = dueDate || (filterDate ? filterDate : undefined);
    
    const listTasks = tasks.filter(t => t.listId === activeListId);
    const maxIndex = listTasks.length > 0 ? Math.max(...listTasks.map(t => t.index ?? -1)) : -1;

    const newTask: Task = {
      id: Date.now().toString(),
      text: taskText,
      title: title,
      completed: false,
      listId: activeListId === 'hub' || activeListId === 'calendar' ? 'todo' : activeListId,
      dueDate: taskDueDate,
      priority,
      index: maxIndex + 1,
      subTasks: []
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskText('');
  };

  const createProject = async (name: string, date?: string, type: 'project' | 'prompt' = 'project') => {
    const maxIndex = projectLists.length > 0 ? Math.max(...projectLists.map(p => p.index ?? -1)) : -1;

    // Ensure we use local date string YYYY-MM-DD
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const newProject: ProjectList = {
      id: Date.now().toString(),
      name: name.trim(),
      createdDate: date || localDateStr,
      index: maxIndex + 1,
      type,
      color: type === 'prompt' ? '#227a39' : undefined
    };    setProjectLists(prev => [...prev, newProject]);
  };

  const createProjectWithTasks = (
    name: string,
    type: 'project' | 'prompt',
    items: string[],         // task texts for project; [promptContent] for prompt
    promptTitle?: string     // task-level title when type === 'prompt'
  ) => {
    const maxIndex = projectLists.length > 0 ? Math.max(...projectLists.map(p => p.index ?? -1)) : -1;
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const projectId = Date.now().toString();

    const newProject: ProjectList = {
      id: projectId,
      name: name.trim(),
      createdDate: localDateStr,
      index: maxIndex + 1,
      type,
      color: type === 'prompt' ? '#227a39' : undefined,
    };

    const newTasks: Task[] = type === 'project'
      ? items.map((text, i) => ({
          id: (Date.now() + i + 1).toString(),
          text: text.trim(),
          completed: false,
          listId: projectId,
          priority: 'low' as Priority,
          index: i,
          subTasks: [],
        }))
      : [{
          id: (Date.now() + 1).toString(),
          text: (items[0] ?? '').trim(),
          title: (promptTitle ?? name).trim(),
          completed: false,
          listId: projectId,
          priority: 'low' as Priority,
          index: 0,
          subTasks: [],
        }];

    setProjectLists(prev => [...prev, newProject]);
    setTasks(prev => [...prev, ...newTasks]);
  };

  const deleteProject = async (id: string) => {
    setProjectLists(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.listId !== id));
    setActiveListId('hub');
  };

  const toggleProjectPreference = (id: string) => {
    setProjectLists(prev => prev.map(p => p.id === id ? { ...p, isPreferred: !p.isPreferred } : p));
  };

  const updateProjectName = (id: string, name: string) => {
    setProjectLists(prev => prev.map(p => p.id === id ? { ...p, name: name.trim() } : p));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (id: string, text: string, title?: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: text.trim(), title: title !== undefined ? title.trim() : t.title } : t));
  };

  const setTaskPriority = (id: string, priority: Priority) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, priority };
      }
      return t;
    }));
  };

  const addSubTask = (taskId: string, text: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newSub: SubTask = { id: Date.now().toString(), text, completed: false };
        return { ...t, subTasks: [...t.subTasks, newSub] };
      }
      return t;
    }));
  };

  const toggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subTasks: t.subTasks.map(s => s.id === subTaskId ? { ...s, completed: !s.completed } : s)
        };
      }
      return t;
    }));
  };

  const updateSubTask = (taskId: string, subTaskId: string, text: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subTasks: t.subTasks.map(s => s.id === subTaskId ? { ...s, text: text.trim() } : s)
        };
      }
      return t;
    }));
  };

  const mergeTasks = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    
    setTasks(prev => {
      const sourceTask = prev.find(t => t.id === sourceId);
      const targetTask = prev.find(t => t.id === targetId);
      
      if (!sourceTask || !targetTask) return prev;

      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const mergedPriority: Priority = priorityWeight[sourceTask.priority] > priorityWeight[targetTask.priority] 
        ? sourceTask.priority 
        : targetTask.priority;

      const mergedTask: Task = {
        ...targetTask,
        text: `${targetTask.text} & ${sourceTask.text}`,
        priority: mergedPriority,
        subTasks: [...(targetTask.subTasks || []), ...(sourceTask.subTasks || [])]
      };

      // Filter out source, replace target with merged
      return prev
        .filter(t => t.id !== sourceId)
        .map(t => t.id === targetId ? mergedTask : t);
    });
  };

  const reorderTasks = (_listId: string, newOrder: Task[]) => {
    setTasks(prev => {
      // Create a map of new indices from the newOrder
      const indexMap = new Map(newOrder.map((t, i) => [t.id, i]));
      
      return prev.map(t => {
        if (indexMap.has(t.id)) {
          return { ...t, index: indexMap.get(t.id)! };
        }
        return t;
      });
    });
  };

  const reorderProjects = (newOrder: ProjectList[]) => {
    setProjectLists(newOrder.map((p, i) => ({ ...p, index: i })));
  };

  const changeMonth = (offset: number) => {
    const d = new Date(viewDate);
    d.setMonth(viewDate.getMonth() + offset);
    setViewDate(d);
  };

  const startUpdate = () => {
    if (ipcRenderer && updateStatus === 'available') {
      setUpdateStatus('downloading');
      ipcRenderer.send('start-update');
    }
  };

  const installUpdate = () => {
    if (ipcRenderer) {
      ipcRenderer.send('install-update');
    }
  };

  const clearAllData = useCallback(() => {
    localStorage.removeItem('tasks');
    localStorage.removeItem('projects');
    localStorage.removeItem('ai_consent_given');
    setTasks([]);
    setProjectLists([]);
    setActiveListId('hub');
  }, []);

  return useMemo(() => ({
    state: { 
      activeListId, tasks, projectLists: sortedProjectLists, filterDate, viewDate, 
      isSidebarExpanded, filteredTasks, calendarDays,
      newTaskText, searchTerm, searchResults,
      updateStatus, availableVersion, downloadProgress
    },
    commands: { 
      setActiveListId, 
      setFilterDate, 
      setViewDate, 
      setIsSidebarExpanded, 
      setNewTaskText,
      setSearchTerm,
      setUpdateStatus,
      setDownloadProgress,
      addTask,
      createProject,
      createProjectWithTasks,
      deleteProject,
      toggleProjectPreference,
      updateProjectName,
      toggleTask, 
      deleteTask,
      updateTask,
      setTaskPriority,
      addSubTask,
      toggleSubTask,
      updateSubTask,
      mergeTasks,
      reorderTasks,
      reorderProjects,
      changeMonth,
      startUpdate,
      installUpdate,
      checkForUpdates,
      clearAllData
    }
  }), [
    activeListId, tasks, sortedProjectLists, filterDate, viewDate,
    isSidebarExpanded, filteredTasks, calendarDays,
    newTaskText, searchTerm, searchResults,
    updateStatus, availableVersion, downloadProgress,
    addTask, createProject, createProjectWithTasks, deleteProject,
    toggleProjectPreference, updateProjectName, toggleTask, deleteTask,
    updateTask, setTaskPriority, addSubTask, toggleSubTask, updateSubTask,
    mergeTasks, reorderTasks, reorderProjects, changeMonth,
    startUpdate, installUpdate, checkForUpdates, clearAllData
  ]);
};

