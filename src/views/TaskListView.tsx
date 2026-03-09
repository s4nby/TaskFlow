import React, { useState } from 'react';
import { Check, Clock, Trash2, FilterX, Pencil, X } from 'lucide-react';
import type { Task } from '../models/types';

interface TaskListViewProps {
  title: string;
  tasks: Task[];
  filterDate: string | null;
  newTaskText: string;
  onSetNewTaskText: (text: string) => void;
  onAddTask: (e: React.FormEvent) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, text: string) => void;
  onClearFilter: () => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ 
  title, tasks, filterDate, newTaskText, 
  onSetNewTaskText, onAddTask, onToggleTask, onDeleteTask, onUpdateTask, onClearFilter 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditingText(task.text);
  };

  const saveEditing = () => {
    if (editingId && editingText.trim()) {
      onUpdateTask(editingId, editingText);
      setEditingId(null);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

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
        </div>
      </form>
      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="task-item themed-border">
            <div className={`task-checkbox ${task.completed ? 'completed' : ''}`} onClick={() => onToggleTask(task.id)}>
              {task.completed && <Check size={12} color="white" />}
            </div>
            <div className="task-content" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '8px' }}>
              {editingId === task.id ? (
                <input 
                  type="text" 
                  className="quick-add-input" 
                  style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                  value={editingText} 
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={saveEditing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditing();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <span className={`task-text ${task.completed ? 'completed' : ''}`}>{task.text}</span>
                  {task.dueDate && <span className="task-due-date themed-text-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} />{task.dueDate}</span>}
                </>
              )}
            </div>
            <div className="task-actions" style={{ display: 'flex', gap: '4px' }}>
              {editingId === task.id ? (
                <button className="entity-delete-trigger" onClick={cancelEditing} title="Cancel"><X size={14} /></button>
              ) : (
                <button className="entity-delete-trigger" onClick={() => startEditing(task)} title="Edit Task"><Pencil size={14} /></button>
              )}
              <button className="entity-delete-trigger" onClick={() => onDeleteTask(task.id)} title="Delete Task"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskListView;
