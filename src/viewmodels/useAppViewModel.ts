import { useState, useEffect, useMemo } from 'react';
import type { Task, ProjectList, DayData, ViewState } from '../models/types';

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

        ipcRenderer.on('update-downloaded', () => {
          setUpdateStatus('ready');
        });
      }
    };
    initTheme();

    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('system-theme-updated');
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('update-downloaded');
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
    if (filterDate) {
      return tasks.filter(t => t.dueDate === filterDate);
    }
    return tasks.filter(t => t.listId === activeListId);
  }, [tasks, activeListId, filterDate]);

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

  const addTask = async (text?: string, dueDate?: string) => {
    const taskText = text || newTaskText;
    if (!taskText.trim()) return;

    const taskDueDate = dueDate || (filterDate ? filterDate : undefined);

    const newTask: Task = {
      id: Date.now().toString(),
      text: taskText,
      completed: false,
      listId: activeListId === 'hub' || activeListId === 'calendar' ? 'todo' : activeListId,
      dueDate: taskDueDate,
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskText('');
  };

  const createProject = async (name: string, date?: string) => {
    const newProject: ProjectList = { 
      id: Date.now().toString(), 
      name: name.trim(),
      createdDate: date || new Date().toISOString().split('T')[0]
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

  return {
    state: { 
      activeListId, tasks, projectLists, filterDate, viewDate, 
      isSidebarExpanded, filteredTasks, calendarDays,
      newTaskText,
      theme, themeMode,
      updateStatus, availableVersion
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
      changeMonth,
      setThemeMode,
      startUpdate,
      installUpdate
    }
  };
};
