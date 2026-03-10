export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  text: string;
  title?: string; // For prompts
  completed: boolean;
  listId: string;
  dueDate?: string;
  priority: Priority;
  index: number;
  subTasks: SubTask[];
}


export interface ProjectList {
  id: string;
  name: string;
  createdDate: string; // ISO YYYY-MM-DD
  isPreferred?: boolean;
  index: number;
  type?: 'project' | 'prompt';
}

export interface DayData {
  day: number;
  isCurrentMonth: boolean;
  dateStr: string;
  tasksForDate: Task[];
  projectsForDate: ProjectList[];
}

export type ViewState = 'hub' | 'todo' | 'calendar' | 'important' | string;
export type UpdateStatus = 'none' | 'available' | 'downloading' | 'ready' | 'error';
