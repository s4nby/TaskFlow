export interface Task {
  id: string;
  text: string;
  completed: boolean;
  listId: string;
  dueDate?: string; // ISO YYYY-MM-DD
}

export interface ProjectList {
  id: string;
  name: string;
  createdDate: string; // ISO YYYY-MM-DD
}

export interface DayData {
  day: number;
  isCurrentMonth: boolean;
  dateStr: string;
  tasksForDate: Task[];
  projectsForDate: ProjectList[];
}

export type ViewState = 'hub' | 'todo' | 'calendar' | 'important' | string;
