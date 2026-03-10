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
  const projects = projectLists.filter(p => !p.type || p.type === 'project');
  const prompts = projectLists.filter(p => p.type === 'prompt');

  const renderCard = (proj: ProjectList) => (
    <div key={proj.id} className="hub-card" onClick={() => onSelectProject(proj.id)} style={proj.isPreferred ? { borderColor: 'var(--accent-color)', background: 'rgba(59, 130, 246, 0.03)' } : {}}>
      <div className="hub-card-header">
        {proj.isPreferred ? (
          <Star size={18} fill="#fbbf24" color="#fbbf24" />
        ) : (
          proj.type === 'prompt' ? <Scroll size={18} color="var(--accent-color)" /> : <FolderKanban size={18} color="var(--accent-color)" />
        )}
        <button 
          className="entity-delete-trigger" 
          onClick={(e) => {
            e.stopPropagation(); 
            onDeleteProject(proj.id);
          }} 
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <h3>{proj.name}</h3>
      <p>{tasks.filter(t => t.listId === proj.id).length} active items</p>
      <ArrowRight className="hub-card-arrow" size={14} />
    </div>
  );

  return (
    <div className="standard-page">
      <header className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{title}</h1>
          <p>{hideActions ? 'Your curated list of starred workspaces' : 'Manage your active project landscapes'}</p>
        </div>
      </header>

      <div className={`hub-section ${projectLists.length === 0 ? 'empty-state' : ''}`} style={{ marginTop: '32px' }}>
        <div className="sidebar-section-header" style={{ paddingLeft: 0, marginBottom: '12px' }}>
          {hideActions ? 'STARRED PROJECTS' : 'PROJECTS'} <div className="divider" />
        </div>
        <div className="hub-grid" style={{ marginBottom: '32px' }}>
          {!hideActions && (
            <div className="hub-card new-trigger" onClick={() => onInitializeProject('project')}>
              <Plus size={24} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Initialize Project</span>
            </div>
          )}
          {projects.map(renderCard)}
        </div>

        <div className="sidebar-section-header" style={{ paddingLeft: 0, marginBottom: '12px' }}>
          {hideActions ? 'STARRED PROMPTS' : 'USEFUL PROMPTS'} <div className="divider" />
        </div>
        <div className="hub-grid">
          {!hideActions && (
            <div className="hub-card new-trigger" onClick={() => onInitializeProject('prompt')}>
              <Plus size={24} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Initialize Prompt</span>
            </div>
          )}
          {prompts.map(renderCard)}
        </div>
      </div>
    </div>
  );
};

export default HubView;
