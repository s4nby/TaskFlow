import { useState, useEffect, useMemo } from 'react';
import type { Task, ProjectList, DayData, ViewState } from '../models/types';

export const useAppViewModel = () => {
  const [activeListId, setActiveListId] = useState<ViewState>('hub');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectLists, setProjectLists] = useState<ProjectList[]>([]);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // New internal state for task creation
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTasks = localStorage.getItem('tasks');
        const savedProjects = localStorage.getItem('projects');
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        if (savedProjects) setProjectLists(JSON.parse(savedProjects));
      } catch (err) {
        console.error("Failed to load data asynchronously", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      localStorage.setItem('tasks', JSON.stringify(tasks));
      localStorage.setItem('projects', JSON.stringify(projectLists));
    };
    saveData();
  }, [tasks, projectLists]);

  const filteredTasks = useMemo(() => {
    if (filterDate) {
      return tasks.filter(t => t.dueDate === filterDate);
    }
    return tasks.filter(t => t.listId === activeListId);
  }, [tasks, activeListId, filterDate]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days: DayData[] = [];
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nextMonthDate = new Date(year, month + 1, 1);

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ 
        day: i, 
        isCurrentMonth: true, 
        dateStr,
        tasksForDate: tasks.filter(t => t.dueDate === dateStr),
        projectsForDate: projectLists.filter(p => p.createdDate === dateStr)
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
        tasksForDate: tasks.filter(t => t.dueDate === dateStr),
        projectsForDate: projectLists.filter(p => p.createdDate === dateStr)
      });
    }
    return days.slice(0, 35);
  }, [viewDate, tasks, projectLists]);

  const addTask = async (text?: string, dueDate?: string) => {
    const taskText = text || newTaskText;
    if (!taskText.trim()) return;

    const taskDueDate = dueDate || (filterDate ? filterDate : (activeListId === 'calendar' ? newTaskDate : undefined));

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

  const createProject = async (name: string) => {
    const newProject: ProjectList = { 
      id: Date.now().toString(), 
      name: name.trim(),
      createdDate: new Date().toISOString().split('T')[0]
    };
    setProjectLists(prev => [...prev, newProject]);
    setActiveListId(newProject.id);
  };

  const deleteProject = async (id: string) => {
    setProjectLists(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.listId !== id));
    setActiveListId('hub');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const changeMonth = (offset: number) => {
    const d = new Date(viewDate);
    d.setMonth(viewDate.getMonth() + offset);
    setViewDate(d);
  };

  return {
    state: { 
      activeListId, tasks, projectLists, filterDate, viewDate, 
      isSidebarExpanded, filteredTasks, calendarDays,
      newTaskText, newTaskDate
    },
    commands: { 
      setActiveListId, 
      setFilterDate, 
      setViewDate, 
      setIsSidebarExpanded, 
      setNewTaskText,
      setNewTaskDate,
      addTask, 
      createProject, 
      deleteProject, 
      toggleTask, 
      deleteTask,
      changeMonth
    }
  };
};
