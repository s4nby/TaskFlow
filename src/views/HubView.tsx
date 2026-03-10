import React from 'react';
import { Plus, FolderKanban, Trash2, ArrowRight, Star, Scroll } from 'lucide-react';
import type { ProjectList, Task } from '../models/types';

interface HubViewProps {
  projectLists: ProjectList[];
  tasks: Task[];
  onInitializeProject: (type?: 'project' | 'prompt') => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onTogglePreference: (id: string) => void;
  title?: string;
  hideActions?: boolean;
}

const HubView: React.FC<HubViewProps> = ({ 
  projectLists, tasks, onInitializeProject, onSelectProject, onDeleteProject, 
  onRenameProject, onTogglePreference,
  title = "Creation Hub",
  hideActions = false
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const startEditing = (proj: ProjectList) => {
    setEditingId(proj.id);
    setEditingName(proj.name);
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      onRenameProject(editingId, editingName);
      setEditingId(null);
    }
  };

  // Migration support: older prompts might not have type:'prompt' but might have 'prompt' in name
  // or be categorized via some other logic if it existed.
  // For now, we strictly follow the 'type' property.
  const projects = projectLists.filter(p => !p.type || p.type === 'project');
  const prompts = projectLists.filter(p => p.type === 'prompt');

  const renderCard = (proj: ProjectList) => {
    const projTasks = tasks.filter(t => t.listId === proj.id);
    const firstTaskText = projTasks.length > 0 ? projTasks[0].text : null;
    const isPrompt = proj.type === 'prompt';

    return (
      <div key={proj.id} className="hub-card" onClick={() => onSelectProject(proj.id)} style={proj.isPreferred ? { borderColor: 'var(--accent-color)', background: 'rgba(59, 130, 246, 0.03)' } : {}}>
        <div className="hub-card-header">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isPrompt ? <Scroll size={14} color="var(--accent-color)" /> : <FolderKanban size={14} color="var(--accent-color)" />}
            <button 
              className={`entity-delete-trigger ${proj.isPreferred ? 'preferred' : ''}`}
              style={{ opacity: proj.isPreferred ? 1 : 0.4, padding: '2px' }}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePreference(proj.id);
              }}
              title={proj.isPreferred ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star size={14} fill={proj.isPreferred ? "#fbbf24" : "none"} color={proj.isPreferred ? "#fbbf24" : "currentColor"} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className="entity-delete-trigger task-edit-trigger" 
              onClick={(e) => {
                e.stopPropagation(); 
                startEditing(proj);
              }} 
              title="Rename"
            >
              <Pencil size={12} />
            </button>
            <button 
              className="entity-delete-trigger" 
              onClick={(e) => {
                e.stopPropagation(); 
                onDeleteProject(proj.id);
              }} 
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        
        {editingId === proj.id ? (
          <input 
            type="text" 
            className="quick-add-input" 
            style={{ padding: '2px 4px', fontSize: '0.85rem', background: 'var(--input-bg)', width: '100%', marginBottom: '4px' }}
            value={editingName} 
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={saveEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEditing();
              if (e.key === 'Escape') setEditingId(null);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 style={{ fontSize: '0.85rem', marginBottom: '2px' }}>
            {isPrompt && projTasks.length > 0 ? (projTasks[0].title || proj.name) : proj.name}
          </h3>
        )}

        {isPrompt && firstTaskText ? (
          <p className="prompt-content" style={{ 
            fontSize: '0.65rem', 
            color: 'var(--text-secondary)', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            opacity: 0.7,
            marginTop: '2px'
          }}>
            {firstTaskText.split('\n')[0]}
          </p>
        ) : (
          <p style={{ fontSize: '0.7rem' }}>{projTasks.length} active items</p>
        )}
        <ArrowRight className="hub-card-arrow" size={12} />
      </div>
    );
  };

  return (
    <div className="standard-page">
      <header className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>{title}</h1>
          <p>{hideActions ? 'Your curated list of starred workspaces' : 'Manage your active project landscapes'}</p>
        </div>
      </header>

      <div className={`hub-section ${projectLists.length === 0 ? 'empty-state' : ''}`} style={{ marginTop: '16px' }}>
        <div className="sidebar-section-header" style={{ paddingLeft: 0, marginBottom: '8px' }}>
          {hideActions ? 'STARRED PROJECTS' : 'PROJECTS'} <div className="divider" />
        </div>
        
        {!hideActions && (
          <div className="hub-card new-trigger" onClick={() => onInitializeProject('project')}>
            <Plus size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Initialize Project</span>
          </div>
        )}

        <div className="hub-grid" style={{ marginBottom: '24px' }}>
          {projects.map(renderCard)}
        </div>

        <div className="sidebar-section-header" style={{ paddingLeft: 0, marginBottom: '8px' }}>
          {hideActions ? 'STARRED PROMPTS' : 'PROMPT MANAGER'} <div className="divider" />
        </div>

        {!hideActions && (
          <div className="hub-card new-trigger" onClick={() => onInitializeProject('prompt')}>
            <Plus size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Initialize Prompt</span>
          </div>
        )}

        <div className="hub-grid">
          {prompts.map(renderCard)}
        </div>
      </div>
    </div>
  );
};

export default HubView;
