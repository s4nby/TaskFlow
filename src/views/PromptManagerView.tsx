import React, { useState } from 'react';
import { 
  Trash2, Pencil, Star, Plus, Copy, Check, ChevronDown, ChevronRight
} from 'lucide-react';
import type { Task } from '../models/types';
import AutoExpandingTextarea from '../components/AutoExpandingTextarea';

interface PromptManagerViewProps {
  title: string;
  prompts: Task[];
  onAddTask: (e: React.FormEvent, title?: string, text?: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, text: string, title?: string) => void;
  isPreferred?: boolean;
  onTogglePreference?: () => void;
}

const PromptManagerView: React.FC<PromptManagerViewProps> = ({ 
  title, prompts, onAddTask, onDeleteTask, onUpdateTask, isPreferred = false, onTogglePreference
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(e, newTitle, newText);
    setIsAddingPrompt(false);
    setNewTitle('');
    setNewText('');
  };

  const startEditing = (prompt: Task) => {
    setEditingId(prompt.id);
    setEditingText(prompt.text);
    setEditingTitle(prompt.title || '');
  };

  const saveEditing = () => {
    if (editingId && editingTitle.trim()) {
      onUpdateTask(editingId, editingText, editingTitle);
      setEditingId(null);
    }
  };

  const handleCopy = (prompt: Task) => {
    const content = prompt.text;
    navigator.clipboard.writeText(content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedPrompts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedPrompts(next);
  };

  const renderFormattedPrompt = (text: string) => {
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs.map((para, pi) => {
      const lines = para.split('\n');
      const isHeader = /^[A-Z0-9\s]+ —|^#+ /.test(lines[0].trim());
      const isList = /^[\s]*[-*•] |^[\s]*\d+\. /.test(lines[0]);

      let processedContent: React.ReactNode[];
      if (!isHeader && !isList) {
        const joinedText = para.replace(/\n/g, ' ');
        processedContent = renderInlineElements(joinedText);
      } else {
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
        <p>{prompts.length} administrative prompts in this group</p>
      </header>

      <div className="task-list">
        {prompts.map(prompt => (
          <div key={prompt.id} className="task-item-container">
            <div className="task-item themed-border" style={{ borderLeft: '4px solid var(--accent-color)', padding: '12px 16px' }}>
              <div className="task-left-controls">
                <button className="chevron-trigger" onClick={() => toggleExpand(prompt.id)} title="View Prompt Content">
                  {expandedPrompts.has(prompt.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>

              <div className="task-content" style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                {editingId === prompt.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <input 
                      type="text"
                      className="quick-add-input"
                      style={{ padding: '4px 8px', fontSize: '1rem', fontWeight: 700, background: 'var(--input-bg)' }}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                    />
                    <AutoExpandingTextarea 
                      className="quick-add-input prompt-content"
                      style={{ padding: '8px', fontSize: '0.85rem', background: 'var(--input-bg)', minHeight: '100px' }}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="themed-secondary-btn" onClick={() => setEditingId(null)} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Cancel</button>
                      <button className="themed-primary-btn" onClick={saveEditing} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="prompt-label" style={{ fontSize: '1rem', padding: '2px 10px' }}>{prompt.title}</span>
                      {!expandedPrompts.has(prompt.id) && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.6 }}>
                          {prompt.text.substring(0, 60)}...
                        </span>
                      )}
                    </div>
                    {expandedPrompts.has(prompt.id) && (
                      <div className="prompt-content" style={{ marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--glass-border)', fontSize: '0.85rem' }}>
                        {renderFormattedPrompt(prompt.text)}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="task-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }}>
                {copiedId === prompt.id ? (
                  <div className="copy-success"><Check size={14} /> Copied!</div>
                ) : (
                  <button className="entity-delete-trigger" onClick={() => handleCopy(prompt)} title="Copy Content">
                    <Copy size={16} />
                  </button>
                )}
                <button className="entity-delete-trigger task-edit-trigger" onClick={() => startEditing(prompt)} title="Edit Prompt">
                  <Pencil size={16} />
                </button>
                <button className="entity-delete-trigger" onClick={() => onDeleteTask(prompt.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`add-task-trigger-container ${prompts.length === 0 ? 'empty-state' : ''}`}>
        {!isAddingPrompt ? (
          <button 
            className="add-task-btn" 
            onClick={() => setIsAddingPrompt(true)}
            title="Add New Prompt"
          >
            <Plus size={24} />
          </button>
        ) : (
          <form className="quick-add-container inline-quick-add" style={{ flexDirection: 'column' }} onSubmit={handleCreatePrompt}>
            <div className="input-group themed-input-container" style={{ borderBottom: '1px solid var(--glass-border)', borderRadius: 'var(--radius-standard) var(--radius-standard) 0 0' }}>
              <input 
                type="text"
                className="quick-add-input"
                style={{ padding: '12px 16px', fontSize: '1rem', fontWeight: 700 }}
                placeholder="Prompt title (required)..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="input-group themed-input-container" style={{ borderRadius: '0 0 var(--radius-standard) var(--radius-standard)' }}>
              <AutoExpandingTextarea 
                className="quick-add-input prompt-content" 
                style={{ minHeight: '120px', padding: '16px', fontSize: '0.9rem' }}
                placeholder="Prompt content..." 
                value={newText} 
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleCreatePrompt(e as any);
                  }
                  if (e.key === 'Escape') setIsAddingPrompt(false);
                }}
              />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="themed-secondary-btn" onClick={() => setIsAddingPrompt(false)} style={{ padding: '6px 16px' }}>Cancel</button>
              <button type="submit" className="themed-primary-btn" disabled={!newTitle.trim()} style={{ padding: '6px 16px' }}>Add Prompt</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PromptManagerView;
