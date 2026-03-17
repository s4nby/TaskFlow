import React, { useState, useEffect } from 'react';
import {
  Layout, List,
  Star, FolderKanban, Trash2, Pencil, Scroll
} from 'lucide-react';
import type { ProjectList, ViewState } from '../models/types';
import packageJson from '../../package.json';

interface SidebarProps {
  isExpanded: boolean;
  activeListId: ViewState;
  projectLists: ProjectList[];
  onNavigate: (id: ViewState) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isExpanded, activeListId, projectLists, onNavigate, onDeleteProject, onRenameProject
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingText] = useState('');
  const [showContent, setShowContent] = useState(isExpanded);

  useEffect(() => {
    if (isExpanded) setShowContent(true);
  }, [isExpanded]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'width' && !isExpanded) {
      setShowContent(false);
    }
  };

  const projects = projectLists.filter(p => !p.type || p.type === 'project');
  const prompts = projectLists.filter(p => p.type === 'prompt');

  const startEditing = (project: ProjectList) => {
    setEditingId(project.id);
    setEditingText(project.name);
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      onRenameProject(editingId, editingName);
      setEditingId(null);
    }
  };

  const cancelEditing = () => setEditingId(null);

  const renderListItem = (project: ProjectList) => (
    <div
      key={project.id}
      className={`list-item ${activeListId === project.id ? 'active' : ''}`}
      onClick={() => onNavigate(project.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(project.id); }}
      aria-current={activeListId === project.id ? 'page' : undefined}
    >
      <div className="list-icon">
        {project.isPreferred
          ? <Star size={15} fill="#fbbf24" color="#fbbf24" aria-hidden="true" />
          : project.type === 'prompt'
            ? <Scroll size={15} aria-hidden="true" />
            : <FolderKanban size={15} aria-hidden="true" />}
      </div>

      {showContent && (
        <div className="list-content">
          {editingId === project.id ? (
            <input
              type="text"
              className="quick-add-input"
              style={{ padding: '2px 4px', fontSize: '0.85rem', background: 'var(--input-bg)' }}
              value={editingName}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={saveEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing();
                if (e.key === 'Escape') cancelEditing();
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              aria-label="Rename project"
            />
          ) : (
            <span className="list-name">{project.name}</span>
          )}
        </div>
      )}

      {showContent && !editingId && (
        <div className="list-actions">
          <button
            className="entity-delete-trigger task-edit-trigger"
            onClick={(e) => { e.stopPropagation(); startEditing(project); }}
            title="Rename"
            aria-label={`Rename ${project.name}`}
          >
            <Pencil size={11} aria-hidden="true" />
          </button>
          <button
            className="entity-delete-trigger sidebar-delete-btn"
            onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
            title="Delete"
            aria-label={`Delete ${project.name}`}
          >
            <Trash2 size={11} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`} onTransitionEnd={handleTransitionEnd}>
      <nav className="list-container" aria-label="Navigation">

        {/* Core navigation */}
        <div
          className={`list-item ${activeListId === 'hub' ? 'active' : ''}`}
          onClick={() => onNavigate('hub')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('hub'); }}
          aria-current={activeListId === 'hub' ? 'page' : undefined}
        >
          <div className="list-icon"><Layout size={15} aria-hidden="true" /></div>
          {showContent && <div className="list-content"><span className="list-name">Dashboard</span></div>}
        </div>

        <div
          className={`list-item ${activeListId === 'todo' ? 'active' : ''}`}
          onClick={() => onNavigate('todo')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('todo'); }}
          aria-current={activeListId === 'todo' ? 'page' : undefined}
        >
          <div className="list-icon"><List size={15} aria-hidden="true" /></div>
          {showContent && <div className="list-content"><span className="list-name">Quick to-do list</span></div>}
        </div>

        <div
          className={`list-item ${activeListId === 'important' ? 'active' : ''}`}
          onClick={() => onNavigate('important')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('important'); }}
          aria-current={activeListId === 'important' ? 'page' : undefined}
        >
          <div className="list-icon"><Star size={15} aria-hidden="true" /></div>
          {showContent && <div className="list-content"><span className="list-name">Favorites</span></div>}
        </div>

        {/* Projects section */}
        <div
          className="list-item sidebar-section-nav"
          onClick={() => onNavigate('hub')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('hub'); }}
          title="Projects"
        >
          <div className="list-icon"><FolderKanban size={13} aria-hidden="true" /></div>
          {showContent && <span className="sidebar-section-label">Projects</span>}
        </div>
        {projects.map(renderListItem)}

        {/* Prompt Manager section */}
        <div
          className="list-item sidebar-section-nav"
          onClick={() => onNavigate('hub')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('hub'); }}
          title="Prompt Manager"
        >
          <div className="list-icon"><Scroll size={13} aria-hidden="true" /></div>
          {showContent && <span className="sidebar-section-label">Prompt Manager</span>}
        </div>
        {prompts.map(renderListItem)}

      </nav>

      <div className="sidebar-footer">
        <span className="app-version-label">v{packageJson.version}</span>
      </div>
    </aside>
  );
};

export default Sidebar;
