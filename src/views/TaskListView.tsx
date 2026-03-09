import React, { useState } from 'react';
import { 
  Check, Clock, Trash2, FilterX, Pencil, X, Star, 
  ChevronDown, ChevronRight, GripVertical
} from 'lucide-react';
import type { Task, Priority } from '../models/types';

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
  hideQuickAdd?: boolean;
  isPreferred?: boolean;
  onTogglePreference?: () => void;
  onSetPriority: (id: string, priority: Priority) => void;
  onAddSubTask: (taskId: string, text: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onReorderTasks: (listId: string, newOrder: Task[]) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ 
  title, tasks, filterDate, newTaskText, 
  onSetNewTaskText, onAddTask, onToggleTask, onDeleteTask, onUpdateTask, onClearFilter,
  hideQuickAdd = false, isPreferred = false, onTogglePreference,
  onSetPriority, onAddSubTask, onToggleSubTask, onReorderTasks
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newSubTaskText, setNewSubTaskText] = useState<{ [key: string]: string }>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

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

  const toggleExpand = (taskId: string) => {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setExpandedTasks(next);
  };

  const handleDragStart = (id: string) => setDraggedTaskId(id);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetId) return;
    
    const newTasks = [...tasks];
    const draggedIdx = newTasks.findIndex(t => t.id === draggedTaskId);
    const targetIdx = newTasks.findIndex(t => t.id === targetId);
    
    const [removed] = newTasks.splice(draggedIdx, 1);
    newTasks.splice(targetIdx, 0, removed);
    
    onReorderTasks(tasks[0].listId, newTasks);
  };

  const getPriorityColor = (p: Priority) => {
    switch(p) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return 'transparent';
    }
  };

  return (
    <div className="standard-page">
      <header className="header-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1>{title}</h1>
          {onTogglePreference && (
            <button 
              className={`entity-delete-trigger ${isPreferred ? 'preferred' : ''}`}
              style={{ opacity: isPreferred ? 1 : 0.4, padding: '4px' }}
              onClick={onTogglePreference}
              title={isPreferred ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star size={20} fill={isPreferred ? "#fbbf24" : "none"} color={isPreferred ? "#fbbf24" : "currentColor"} />
            </button>
          )}
        </div>
        {filterDate ? (
          <div className="filter-badge">
            <span>Filtering for: <strong>{filterDate}</strong></span>
            <button className="clear-filter-btn" onClick={onClearFilter} title="Clear Filter"><FilterX size={12} /></button>
          </div>
        ) : (
          <p>{tasks.length} items in this workspace</p>
        )}
      </header>
      {!hideQuickAdd && (
        <form className="quick-add-container" onSubmit={onAddTask}>
          <div className="input-group themed-input-container">
            <input type="text" className="quick-add-input" placeholder="Add task to workspace..." value={newTaskText} onChange={(e) => onSetNewTaskText(e.target.value)} />
          </div>
        </form>
      )}
      <div className="task-list">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className="task-item-container"
            draggable
            onDragStart={() => handleDragStart(task.id)}
            onDragOver={(e) => handleDragOver(e, task.id)}
          >
            <div className="task-item themed-border" style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}>
              <div className="task-drag-handle"><GripVertical size={14} /></div>
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
                      if (e.key === 'Escape') setEditingId(null);
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
              <div className="task-actions" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <select 
                  className="priority-select" 
                  value={task.priority} 
                  onChange={(e) => onSetPriority(task.id, e.target.value as Priority)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Med</option>
                  <option value="high">High</option>
                </select>
                <button className="entity-delete-trigger" onClick={() => toggleExpand(task.id)} title="Sub-tasks">
                  {expandedTasks.has(task.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {editingId === task.id ? (
                  <button className="entity-delete-trigger" onClick={() => setEditingId(null)} title="Cancel"><X size={14} /></button>
                ) : (
                  <button className="entity-delete-trigger task-edit-trigger" onClick={() => startEditing(task)} title="Edit Task"><Pencil size={14} /></button>
                )}
                <button className="entity-delete-trigger" onClick={() => onDeleteTask(task.id)} title="Delete Task"><Trash2 size={14} /></button>
              </div>
            </div>
            
            {expandedTasks.has(task.id) && (
              <div className="subtask-section">
                {task.subTasks?.map(sub => (
                  <div key={sub.id} className="subtask-item">
                    <div className={`task-checkbox mini ${sub.completed ? 'completed' : ''}`} onClick={() => onToggleSubTask(task.id, sub.id)}>
                      {sub.completed && <Check size={8} color="white" />}
                    </div>
                    <span className={`subtask-text ${sub.completed ? 'completed' : ''}`}>{sub.text}</span>
                  </div>
                ))}
                <div className="subtask-add">
                  <input 
                    type="text" 
                    placeholder="Add sub-task..." 
                    className="subtask-input"
                    value={newSubTaskText[task.id] || ''}
                    onChange={(e) => setNewSubTaskText({ ...newSubTaskText, [task.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubTaskText[task.id]?.trim()) {
                        onAddSubTask(task.id, newSubTaskText[task.id]);
                        setNewSubTaskText({ ...newSubTaskText, [task.id]: '' });
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskListView;
