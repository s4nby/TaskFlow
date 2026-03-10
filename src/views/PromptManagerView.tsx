import React, { useState } from 'react';
import { 
  Trash2, Pencil, X, Star, Plus, Copy, Check, ArrowRight, Scroll, ChevronLeft
} from 'lucide-react';
import type { Task, ProjectList } from '../models/types';
import AutoExpandingTextarea from '../components/AutoExpandingTextarea';

interface PromptManagerViewProps {
  title: string;
  prompts: Task[];
  onAddTask: (e: React.FormEvent, title?: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, text: string, title?: string) => void;
  isPreferred?: boolean;
  onTogglePreference?: () => void;
}

const PromptManagerView: React.FC<PromptManagerViewProps> = ({ 
  title, prompts, onAddTask, onDeleteTask, onUpdateTask, isPreferred = false, onTogglePreference
}) => {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(e, newTitle);
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
    const content = `${prompt.title}\n\n${prompt.text}`;
    navigator.clipboard.writeText(content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
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

  // GALLERY VIEW
  if (!selectedPromptId && !isAddingPrompt) {
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

        <div className="hub-section" style={{ marginTop: '16px' }}>
          <div className="hub-card new-trigger" onClick={() => setIsAddingPrompt(true)}>
            <Plus size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Initialize New Prompt</span>
          </div>

          <div className="hub-grid">
            {prompts.map(prompt => (
              <div key={prompt.id} className="hub-card" onClick={() => setSelectedPromptId(prompt.id)}>
                <div className="hub-card-header">
                  <Scroll size={14} color="var(--accent-color)" />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="entity-delete-trigger" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(prompt.id);
                      }} 
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '2px' }}>{prompt.title || 'Untitled Prompt'}</h3>
                <p className="prompt-content" style={{ 
                  fontSize: '0.65rem', 
                  color: 'var(--text-secondary)', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  opacity: 0.7,
                  marginTop: '2px'
                }}>
                  {prompt.text.split('\n')[0]}
                </p>
                <ArrowRight className="hub-card-arrow" size={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ADD PROMPT VIEW
  if (isAddingPrompt) {
    return (
      <div className="standard-page">
        <header className="header-section">
          <button className="nav-btn-minimal" onClick={() => setIsAddingPrompt(false)} style={{ marginBottom: '12px', marginLeft: '-8px' }}>
            <ChevronLeft size={18} /> Back to Gallery
          </button>
          <h1>Initialize New Prompt</h1>
        </header>

        <form className="quick-add-container inline-quick-add" style={{ flexDirection: 'column' }} onSubmit={handleCreatePrompt}>
          <div className="input-group themed-input-container" style={{ borderBottom: '1px solid var(--glass-border)', borderRadius: 'var(--radius-standard) var(--radius-standard) 0 0' }}>
            <input 
              type="text"
              className="quick-add-input"
              style={{ padding: '12px 16px', fontSize: '1.1rem', fontWeight: 700 }}
              placeholder="Prompt title (required)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="input-group themed-input-container" style={{ borderRadius: '0 0 var(--radius-standard) var(--radius-standard)' }}>
            <AutoExpandingTextarea 
              className="quick-add-input prompt-content" 
              style={{ minHeight: '200px', padding: '16px' }}
              placeholder="Paste or type your full prompt content here..." 
              value={newText} 
              onChange={(e) => setNewText(e.target.value)}
            />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="themed-secondary-btn" onClick={() => setIsAddingPrompt(false)}>Cancel</button>
            <button type="submit" className="themed-primary-btn" disabled={!newTitle.trim()}>Initialize Prompt</button>
          </div>
        </form>
      </div>
    );
  }

  // DETAIL VIEW
  return (
    <div className="standard-page">
      <header className="header-section">
        <button className="nav-btn-minimal" onClick={() => setSelectedPromptId(null)} style={{ marginBottom: '12px', marginLeft: '-8px' }}>
          <ChevronLeft size={18} /> Back to Gallery
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {editingId === selectedPrompt?.id ? (
              <input 
                type="text"
                className="quick-add-input prompt-label"
                style={{ width: '100%', background: 'transparent' }}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <span className="prompt-label">{selectedPrompt?.title}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
            {selectedPrompt && (
              <>
                {copiedId === selectedPrompt.id ? (
                  <div className="copy-success"><Check size={14} /> Copied!</div>
                ) : (
                  <button className="entity-delete-trigger" onClick={() => handleCopy(selectedPrompt)} title="Copy to Clipboard">
                    <Copy size={18} />
                  </button>
                )}
              </>
            )}
            {editingId === selectedPrompt?.id ? (
              <button className="entity-delete-trigger" onClick={saveEditing} title="Save"><Check size={18} /></button>
            ) : (
              <button className="entity-delete-trigger" onClick={() => selectedPrompt && startEditing(selectedPrompt)} title="Edit"><Pencil size={18} /></button>
            )}
            <button className="entity-delete-trigger" onClick={() => {
              if (selectedPrompt) {
                onDeleteTask(selectedPrompt.id);
                setSelectedPromptId(null);
              }
            }} title="Delete"><Trash2 size={18} /></button>
          </div>
        </div>
      </header>

      <div className="prompt-body-container" style={{ marginTop: '24px' }}>
        {editingId === selectedPrompt?.id ? (
          <AutoExpandingTextarea 
            className="quick-add-input prompt-content" 
            style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}
            value={editingText} 
            onChange={(e) => setEditingText(e.target.value)}
          />
        ) : (
          <div className="prompt-content">
            {selectedPrompt ? renderFormattedPrompt(selectedPrompt.text) : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptManagerView;
