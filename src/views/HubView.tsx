import React from 'react';
import { Plus, FolderKanban, Trash2, ArrowRight, Star, Scroll } from 'lucide-react';
import type { ProjectList, Task } from '../models/types';

interface HubViewProps {
  projectLists: ProjectList[];
  tasks: Task[];
  onInitializeProject: (type?: 'project' | 'prompt') => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  title?: string;
  hideActions?: boolean;
}

const HubView: React.FC<HubViewProps> = ({ 
  projectLists, tasks, onInitializeProject, onSelectProject, onDeleteProject,
  title = "Creation Hub",
  hideActions = false
}) => {
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
          {proj.isPreferred ? (
            <Star size={14} fill="#fbbf24" color="#fbbf24" />
          ) : (
            isPrompt ? <Scroll size={14} color="var(--accent-color)" /> : <FolderKanban size={14} color="var(--accent-color)" />
          )}
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
        <h3 style={{ fontSize: '0.85rem' }}>{proj.name}</h3>
        {isPrompt && firstTaskText ? (
          <p style={{ 
            fontSize: '0.7rem', 
            color: 'var(--text-secondary)', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            marginTop: '2px'
          }}>
            {firstTaskText}
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
          {hideActions ? 'STARRED PROMPTS' : 'USEFUL PROMPTS'} <div className="divider" />
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
