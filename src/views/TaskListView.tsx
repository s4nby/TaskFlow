import React from 'react';
import { Check, Clock, Trash2, FilterX } from 'lucide-react';
import type { Task } from '../models/types';

interface TaskListViewProps {
  title: string;
  tasks: Task[];
  filterDate: string | null;
  newTaskText: string;
  newTaskDate: string;
  onSetNewTaskText: (text: string) => void;
  onSetNewTaskDate: (date: string) => void;
  onAddTask: (e: React.FormEvent) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClearFilter: () => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ 
  title, tasks, filterDate, newTaskText, newTaskDate, 
  onSetNewTaskText, onSetNewTaskDate, onAddTask, onToggleTask, onDeleteTask, onClearFilter 
}) => {
  return (
    <div className="standard-page">
      <header className="header-section">
        <h1>{title}</h1>
        {filterDate ? (
          <div className="filter-badge">
            <span>Filtering for: <strong>{filterDate}</strong></span>
            <button className="clear-filter-btn" onClick={onClearFilter} title="Clear Filter"><FilterX size={12} /></button>
          </div>
        ) : (
          <p>{tasks.length} items in this workspace</p>
        )}
      </header>
      <form className="quick-add-container" onSubmit={onAddTask}>
        <div className="input-group themed-input-container">
          <input type="text" className="quick-add-input" placeholder="Add task to workspace..." value={newTaskText} onChange={(e) => onSetNewTaskText(e.target.value)} />
          {!filterDate && <input type="date" className="date-picker-input themed-date-input" value={newTaskDate} onChange={(e) => onSetNewTaskDate(e.target.value)} />}
        </div>
      </form>
      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="task-item themed-border">
            <div className={`task-checkbox ${task.completed ? 'completed' : ''}`} onClick={() => onToggleTask(task.id)}>
              {task.completed && <Check size={12} color="white" />}
            </div>
            <div className="task-content" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '8px' }}>
              <span className={`task-text ${task.completed ? 'completed' : ''}`}>{task.text}</span>
              {task.dueDate && <span className="task-due-date themed-text-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} />{task.dueDate}</span>}
            </div>
            <button className="entity-delete-trigger" onClick={() => onDeleteTask(task.id)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskListView;
