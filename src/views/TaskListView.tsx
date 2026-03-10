import React, { useState } from 'react';
import { 
  Check, Clock, Trash2, FilterX, Pencil, X, Star, 
  ChevronDown, ChevronRight, GripVertical, Plus, ChevronUp, Copy
} from 'lucide-react';
import type { Task, Priority, SubTask } from '../models/types';
import AutoExpandingTextarea from '../components/AutoExpandingTextarea';

interface TaskListViewProps {
  title: string;
  tasks: Task[];
  filterDate: string | null;
  newTaskText: string;
  onSetNewTaskText: (text: string) => void;
  onAddTask: (e: React.FormEvent, title?: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, text: string, title?: string) => void;
  onClearFilter: () => void;
  hideQuickAdd?: boolean;
  isPreferred?: boolean;
  onTogglePreference?: () => void;
  onSetPriority: (id: string, priority: Priority) => void;
  onAddSubTask: (taskId: string, text: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onUpdateSubTask: (taskId: string, subTaskId: string, text: string) => void;
  onMergeTasks: (sourceId: string, targetId: string) => void;
  onReorderTasks: (listId: string, newOrder: Task[]) => void;
  isPrompt?: boolean;
}

const TaskListView: React.FC<TaskListViewProps> = ({ 
  title, tasks, filterDate, newTaskText, 
  onSetNewTaskText, onAddTask, onToggleTask, onDeleteTask, onUpdateTask, onClearFilter,
  hideQuickAdd = false, isPreferred = false, onTogglePreference,
  onSetPriority, onAddSubTask, onToggleSubTask, onUpdateSubTask, onMergeTasks, onReorderTasks,
  isPrompt = false
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editingSubTaskText, setEditingSubTaskText] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newSubTaskText, setNewSubTaskText] = useState<{ [key: string]: string }>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditingText(task.text);
    setEditingTitle(task.title || '');
  };

  const saveEditing = () => {
    if (editingId) {
      if (isPrompt && !editingTitle.trim()) return;
      if (!isPrompt && !editingText.trim()) return;
      
      onUpdateTask(editingId, editingText, isPrompt ? editingTitle : undefined);
      setEditingId(null);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    if (isPrompt && !newTaskTitle.trim()) {
      e.preventDefault();
      return;
    }
    onAddTask(e, isPrompt ? newTaskTitle : undefined);
    setIsAddingTask(false);
    setNewTaskTitle('');
  };

  const handleCopy = (task: Task) => {
    const content = isPrompt ? `${task.title}\n\n${task.text}` : task.text;
    navigator.clipboard.writeText(content);
    setCopiedId(task.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderFormattedPrompt = (text: string) => {
    // 1. Split into paragraphs by double-newlines
    const paragraphs = text.split(/\n\s*\n/);
    
    return paragraphs.map((para, pi) => {
      // 2. For each paragraph, check if it's a list or header
      const lines = para.split('\n');
      const isHeader = /^[A-Z0-9\s]+ —|^#+ /.test(lines[0].trim());
      const isList = /^[\s]*[-*•] |^[\s]*\d+\. /.test(lines[0]);

      // Heuristic: If it's a regular paragraph (not list/header), 
      // join lines to allow reflowing.
      let processedContent: React.ReactNode[];
      
      if (!isHeader && !isList) {
        // Join lines with a space
        const joinedText = para.replace(/\n/g, ' ');
        processedContent = renderInlineElements(joinedText);
      } else {
        // Keep lines but process inline elements
        processedContent = lines.map((line, li) => (
          <div key={li}>{renderInlineElements(line)}{li === lines.length - 1 ? '' : '\n'}</div>
        ));
      }

      return (
        <div key={pi} className={isHeader ? "prompt-paragraph-header" : "prompt-paragraph"}>
          {isHeader ? <span className="prompt-header-text">{processedContent}</span> : processedContent}
          {pi === paragraphs.length - 1 ? '' : '\n\n'}
        </div>
      );
    });
  };

  const renderInlineElements = (text: string) => {
    const parts = text.split(/(`[^`]+`)/);
    return parts.map((part, pi) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={pi} className="prompt-inline-code">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const startEditingSubTask = (sub: SubTask) => {
    setEditingSubTaskId(sub.id);
    setEditingSubTaskText(sub.text);
  };

  const saveSubTaskEditing = (taskId: string) => {
    if (editingSubTaskId && editingSubTaskText.trim()) {
      onUpdateSubTask(taskId, editingSubTaskId, editingSubTaskText);
      setEditingSubTaskId(null);
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

    // Determine if we should show merge or reorder based on drag position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    
    // If dragging in the middle 50% of the item, consider it a merge target
    if (relativeY > rect.height * 0.2 && relativeY < rect.height * 0.8) {
      if (mergeTargetId !== targetId) setMergeTargetId(targetId);
    } else {
      if (mergeTargetId !== null) setMergeTargetId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetId) {
      setMergeTargetId(null);
      setDraggedTaskId(null);
      return;
    }

    if (mergeTargetId === targetId) {
      onMergeTasks(draggedTaskId, targetId);
    } else {
      // Reorder logic on drop
      const newTasks = [...tasks];
      const draggedIdx = newTasks.findIndex(t => t.id === draggedTaskId);
      const targetIdx = newTasks.findIndex(t => t.id === targetId);
      
      if (draggedIdx !== -1 && targetIdx !== -1) {
        const [removed] = newTasks.splice(draggedIdx, 1);
        newTasks.splice(targetIdx, 0, removed);
        
        // We pass the new order to the viewmodel
        onReorderTasks(tasks[0].listId, newTasks);
      }
    }
    
    setMergeTargetId(null);
    setDraggedTaskId(null);
  };

  const handleDragLeave = () => {
    setMergeTargetId(null);
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

      <div className="task-list">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className="task-item-container"
            draggable={!isPrompt}
            onDragStart={() => !isPrompt && handleDragStart(task.id)}
            onDragOver={(e) => !isPrompt && handleDragOver(e, task.id)}
            onDrop={(e) => !isPrompt && handleDrop(e, task.id)}
            onDragLeave={() => !isPrompt && handleDragLeave()}
          >
            <div className={`task-item themed-border ${mergeTargetId === task.id ? 'merge-target' : ''}`} style={{ borderLeft: isPrompt ? 'none' : `4px solid ${getPriorityColor(task.priority)}`, position: 'relative' }}>
              {!isPrompt && (
                <div className="task-left-controls">
                  <div className="task-drag-handle"><GripVertical size={14} /></div>
                  <button className="chevron-trigger" onClick={() => toggleExpand(task.id)} title="Sub-tasks">
                    {expandedTasks.has(task.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
              )}
              
              {!isPrompt && (
                <div className={`task-checkbox ${task.completed ? 'completed' : ''}`} onClick={() => onToggleTask(task.id)}>
                  {task.completed && <Check size={12} color="white" />}
                </div>
              )}

              <div className={`task-content ${isPrompt ? 'prompt-body-container' : ''}`} style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '4px', padding: isPrompt ? '16px 0' : '4px 0' }}>
                {editingId === task.id ? (
                  <>
                    {isPrompt && (
                      <input 
                        type="text"
                        className="quick-add-input"
                        style={{ padding: '4px 8px', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', background: 'transparent', borderBottom: '1px solid var(--glass-border)' }}
                        placeholder="Prompt title..."
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        autoFocus
                      />
                    )}
                    <AutoExpandingTextarea 
                      className={`quick-add-input ${isPrompt ? 'prompt-content' : ''}`} 
                      style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                      placeholder={isPrompt ? "Prompt body content..." : "Task description..."}
                      value={editingText} 
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={saveEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          saveEditing();
                        }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus={!isPrompt}
                    />
                  </>
                ) : (
                  <>
                    {isPrompt && task.title && (
                      <div style={{ marginBottom: '12px' }}>
                        <span className="prompt-label" style={{ maxWidth: '100%' }}>{task.title}</span>
                      </div>
                    )}
                    <div className={`${!isPrompt ? 'task-text' : ''} ${task.completed ? 'completed' : ''} ${isPrompt ? 'prompt-content' : ''}`} style={isPrompt ? { marginTop: '4px' } : {}}>
                      {isPrompt ? renderFormattedPrompt(task.text) : task.text}
                    </div>
                    {task.dueDate && <span className="task-due-date themed-text-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} />{task.dueDate}</span>}
                  </>
                )}
              </div>
              <div className="task-actions" style={{ display: 'flex', gap: '4px', alignItems: 'center', alignSelf: 'flex-start', paddingTop: isPrompt ? '16px' : '0' }}>
                {isPrompt ? (
                  <>
                    {copiedId === task.id ? (
                      <div className="copy-success"><Check size={14} /> Copied!</div>
                    ) : (
                      <button className="entity-delete-trigger" onClick={() => handleCopy(task)} title="Copy to Clipboard">
                        <Copy size={16} />
                      </button>
                    )}
                  </>
                ) : (
                  <div className={`priority-indicator-container ${task.priority}`}>
                    {task.priority === 'medium' ? (
                      <>
                        <button 
                          className="priority-btn up" 
                          onClick={() => onSetPriority(task.id, 'high')}
                          title="Set High Priority"
                        >
                          <ChevronUp size={10} />
                        </button>
                        <button 
                          className="priority-btn down" 
                          onClick={() => onSetPriority(task.id, 'low')}
                          title="Set Low Priority"
                        >
                          <ChevronDown size={10} />
                        </button>
                      </>
                    ) : task.priority === 'low' ? (
                      <button 
                        className="priority-btn single" 
                        onClick={() => onSetPriority(task.id, 'medium')}
                        title="Set Medium Priority"
                      >
                        <ChevronUp size={10} />
                      </button>
                    ) : (
                      <button 
                        className="priority-btn single" 
                        onClick={() => onSetPriority(task.id, 'medium')}
                        title="Set Medium Priority"
                      >
                        <ChevronDown size={10} />
                      </button>
                    )}
                  </div>
                )}
                
                {editingId === task.id ? (
                  <button className="entity-delete-trigger" onClick={() => setEditingId(null)} title="Cancel"><X size={14} /></button>
                ) : (
                  <button className="entity-delete-trigger task-edit-trigger" onClick={() => startEditing(task)} title="Edit"><Pencil size={14} /></button>
                )}
                <button className="entity-delete-trigger" onClick={() => onDeleteTask(task.id)} title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
            
            {!isPrompt && expandedTasks.has(task.id) && (
              <div className="subtask-section">
                {task.subTasks?.map(sub => (
                  <div key={sub.id} className="subtask-item">
                    <div className={`task-checkbox mini ${sub.completed ? 'completed' : ''}`} onClick={() => onToggleSubTask(task.id, sub.id)}>
                      {sub.completed && <Check size={8} color="white" />}
                    </div>
                    {editingSubTaskId === sub.id ? (
                      <input 
                        className="subtask-input"
                        value={editingSubTaskText}
                        onChange={(e) => setEditingSubTaskText(e.target.value)}
                        onBlur={() => saveSubTaskEditing(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveSubTaskEditing(task.id);
                          if (e.key === 'Escape') setEditingSubTaskId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className={`subtask-text ${sub.completed ? 'completed' : ''}`}>{sub.text}</span>
                        <button className="subtask-edit-btn" onClick={() => startEditingSubTask(sub)}>
                          <Pencil size={10} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                <div className="subtask-add">
                  <input 
                    type="text" 
                    placeholder="Add sub-task..." 
                    className="subtask-input"
                    value={newSubTaskText[task.id] || ''}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
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

      {!hideQuickAdd && (
        <div className={`add-task-trigger-container ${tasks.length === 0 ? 'empty-state' : ''}`}>
          {!isAddingTask ? (
            <button 
              className="add-task-btn" 
              onClick={() => setIsAddingTask(true)}
              title="Add Prompt"
            >
              <Plus size={24} />
            </button>
          ) : (
            <form className="quick-add-container inline-quick-add" style={{ flexDirection: 'column' }} onSubmit={handleAddTask}>
              {isPrompt && (
                <div className="input-group themed-input-container" style={{ borderBottom: '1px solid var(--glass-border)', borderRadius: 'var(--radius-standard) var(--radius-standard) 0 0' }}>
                  <input 
                    type="text"
                    className="quick-add-input"
                    style={{ padding: '12px 16px', fontSize: '1rem', fontWeight: 700 }}
                    placeholder="Prompt title (required)..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
              <div className="input-group themed-input-container" style={isPrompt ? { borderRadius: '0 0 var(--radius-standard) var(--radius-standard)' } : {}}>
                <AutoExpandingTextarea 
                  className={`quick-add-input ${isPrompt ? 'prompt-content' : ''}`} 
                  placeholder={isPrompt ? "Paste or type your prompt body content here..." : "What needs to be done?"} 
                  value={newTaskText} 
                  onChange={(e) => onSetNewTaskText(e.target.value)}
                  onBlur={() => {
                    if (!newTaskText.trim() && !newTaskTitle.trim()) setIsAddingTask(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddTask(e as any);
                    }
                    if (e.key === 'Escape') setIsAddingTask(false);
                  }}
                  autoFocus={!isPrompt}
                />
                <button type="submit" style={{ display: 'none' }} />
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskListView;
