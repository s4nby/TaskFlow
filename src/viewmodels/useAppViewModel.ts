import { useState, useEffect, useMemo } from 'react';
import type { Task, ProjectList, DayData, ViewState, Priority, SubTask } from '../models/types';

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
  
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('themeMode') as 'system' | 'light' | 'dark') || 'system';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Update management state
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloading' | 'ready'>('none');
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Restore internal state for task creation
  const [newTaskText, setNewTaskText] = useState('');
  
  // Access Electron IPC
  // @ts-ignore
  const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

  useEffect(() => {
    const initTheme = async () => {
      if (ipcRenderer) {
        const systemTheme = await ipcRenderer.invoke('get-system-theme');
        if (themeMode === 'system') {
          setTheme(systemTheme);
        } else {
          setTheme(themeMode);
        }

        ipcRenderer.on('system-theme-updated', (_event: any, newTheme: 'light' | 'dark') => {
          setThemeMode(prev => {
            if (prev === 'system') setTheme(newTheme);
            return prev;
          });
        });

        // Update listeners
        ipcRenderer.on('update-available', (_event: any, version: string) => {
          setAvailableVersion(version);
          setUpdateStatus('available');
        });

        ipcRenderer.on('update-not-available', () => {
          setUpdateStatus('none');
        });

        ipcRenderer.on('update-progress', (_event: any, progressObj: any) => {
          setUpdateStatus('downloading');
          setDownloadProgress(Math.floor(progressObj.percent));
        });

        ipcRenderer.on('update-downloaded', () => {
          setUpdateStatus('ready');
          setDownloadProgress(100);
          // Discord-style: Auto install immediately when ready
          ipcRenderer.send('install-update');
        });

        ipcRenderer.on('update-error', (_event: any, message: string) => {
          console.error('Update Error:', message);
          setUpdateStatus('none');
          setDownloadProgress(0);
        });
      }
    };
    initTheme();

    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('system-theme-updated');
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('update-not-available');
        ipcRenderer.removeAllListeners('update-progress');
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.removeAllListeners('update-error');
      }
    };
  }, [ipcRenderer, themeMode]);

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    if (themeMode !== 'system') {
      setTheme(themeMode);
    } else if (ipcRenderer) {
      ipcRenderer.invoke('get-system-theme').then((t: 'light' | 'dark') => setTheme(t));
    }
  }, [themeMode, ipcRenderer]);

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
      const pA = priorityWeight[a.priority] || 0;
      const pB = priorityWeight[b.priority] || 0;
      
      if (pA !== pB) return pB - pA; // Sort by priority first
      return (a.index ?? 0) - (b.index ?? 0); // Then by manual index
    });
  }, [tasks, activeListId, filterDate]);

  const sortedProjectLists = useMemo(() => {
    return [...projectLists].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  }, [projectLists]);

  const calendarDays = useMemo(() => {
    if (activeListId !== 'calendar') return []; // Don't compute if not in calendar view

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days: DayData[] = [];
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nextMonthDate = new Date(year, month + 1, 1);

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

    const remaining = 35 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(nextMonthDate);
      d.setDate(i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ 
        day: i, 
        isCurrentMonth: false, 
        dateStr,
        tasksForDate: tasksByDate[dateStr] || [],
        projectsForDate: projectsByDate[dateStr] || []
      });
    }
    return days.slice(0, 35);
  }, [viewDate, tasks, projectLists, activeListId]);

  const addTask = async (text?: string, dueDate?: string, priority: Priority = 'medium') => {
    const taskText = text || newTaskText;
    if (!taskText.trim()) return;

    const taskDueDate = dueDate || (filterDate ? filterDate : undefined);
    
    const listTasks = tasks.filter(t => t.listId === activeListId);
    const maxIndex = listTasks.length > 0 ? Math.max(...listTasks.map(t => t.index ?? -1)) : -1;

    const newTask: Task = {
      id: Date.now().toString(),
      text: taskText,
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

  const createProject = async (name: string, date?: string) => {
    const maxIndex = projectLists.length > 0 ? Math.max(...projectLists.map(p => p.index ?? -1)) : -1;
    const newProject: ProjectList = { 
      id: Date.now().toString(), 
      name: name.trim(),
      createdDate: date || new Date().toISOString().split('T')[0],
      index: maxIndex + 1
    };
    setProjectLists(prev => [...prev, newProject]);
    setActiveListId(newProject.id);
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

  const updateTask = (id: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: text.trim() } : t));
  };

  const setTaskPriority = (id: string, priority: Priority) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
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

  const reorderTasks = (listId: string, newOrder: Task[]) => {
    setTasks(prev => {
      const otherTasks = prev.filter(t => t.listId !== listId);
      const updatedOrder = newOrder.map((t, i) => ({ ...t, index: i }));
      return [...otherTasks, ...updatedOrder];
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
    if (ipcRenderer) {
      setUpdateStatus('downloading');
      ipcRenderer.send('start-update');
    }
  };

  const installUpdate = () => {
    if (ipcRenderer) {
      ipcRenderer.send('install-update');
    }
  };

  const checkForUpdates = async () => {
    // 1. Native Check (Main Process)
    if (ipcRenderer) {
      ipcRenderer.send('check-for-updates');
    }

    // 2. Fallback Manual Check (GitHub API)
    // This ensures that even if legacy versions are pointing to the wrong update server,
    // the UI will still detect the version mismatch and show the indicator.
    try {
      const response = await fetch('https://api.github.com/repos/s4nby/TaskFlow/releases/latest');
      if (response.ok) {
        const release = await response.json();
        const latestVersion = release.tag_name.replace('v', '');
        
        // Import packageJson dynamically to get local version
        const { version: currentVersion } = await import('../../package.json');
        
        if (latestVersion !== currentVersion && updateStatus === 'none') {
          console.log(`Manual Update Check: New version found ${latestVersion} (Current: ${currentVersion})`);
          setAvailableVersion(latestVersion);
          setUpdateStatus('available');
        }
      }
    } catch (err) {
      console.error('Manual Update Check Failed:', err);
    }
  };

  return {
    state: { 
      activeListId, tasks, projectLists: sortedProjectLists, filterDate, viewDate, 
      isSidebarExpanded, filteredTasks, calendarDays,
      newTaskText,
      theme, themeMode,
      updateStatus, availableVersion, downloadProgress
    },
    commands: { 
      setActiveListId, 
      setFilterDate, 
      setViewDate, 
      setIsSidebarExpanded, 
      setNewTaskText,
      addTask, 
      createProject, 
      deleteProject, 
      toggleProjectPreference,
      updateProjectName,
      toggleTask, 
      deleteTask,
      updateTask,
      setTaskPriority,
      addSubTask,
      toggleSubTask,
      reorderTasks,
      reorderProjects,
      changeMonth,
      setThemeMode,
      startUpdate,
      installUpdate,
      checkForUpdates
    }
  };
};
