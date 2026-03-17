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

  const cancelEditing = () => {
    setEditingId(null);
  };

  const renderListItem = (project: ProjectList) => (
    <div key={project.id} className={`list-item ${activeListId === project.id ? 'active' : ''}`} onClick={() => onNavigate(project.id)}>
      <div className="list-icon">
        {project.isPreferred ? (
          <Star size={18} fill="#fbbf24" color="#fbbf24" />
        ) : (
          project.type === 'prompt' ? <Scroll size={18} /> : <FolderKanban size={18} />
        )}
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
            />
          ) : (
            <span className="list-name">{project.name}</span>
          )}
        </div>
      )}

      {showContent && !editingId && (
        <div className="list-actions" style={{ display: 'flex', gap: '2px' }}>
          <button
            className="entity-delete-trigger task-edit-trigger"
            onClick={(e) => {
              e.stopPropagation();
              startEditing(project);
            }}
            title="Rename"
          >
            <Pencil size={12} />
          </button>
          <button
            className="entity-delete-trigger sidebar-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteProject(project.id);
            }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`} onTransitionEnd={handleTransitionEnd}>
      <div className="list-container">
        <div className={`list-item ${activeListId === 'hub' ? 'active' : ''}`} onClick={() => onNavigate('hub')}>
          <div className="list-icon"><Layout size={18} /></div>
          {showContent && (
            <div className="list-content">
              <span className="list-name">Dashboard</span>
            </div>
          )}
        </div>
        <div className={`list-item ${activeListId === 'todo' ? 'active' : ''}`} onClick={() => onNavigate('todo')}>
          <div className="list-icon"><List size={18} /></div>
          {showContent && (
            <div className="list-content">
              <span className="list-name">Quick to-do list</span>

            </div>
          )}
        </div>
        <div className={`list-item ${activeListId === 'important' ? 'active' : ''}`} onClick={() => onNavigate('important')}>
          <div className="list-icon"><Star size={18} /></div>
          {showContent && (
            <div className="list-content">
              <span className="list-name">Favorites</span>
            </div>
          )}
        </div>

        <div className="sidebar-section-header">
          {showContent ? 'PROJECTS' : <div className="divider" />}
        </div>
        {projects.map(renderListItem)}

        <div className="sidebar-section-header">
          {showContent ? 'PROMPT MANAGER' : <div className="divider" />}
        </div>
        {prompts.map(renderListItem)}
      </div>
      <div className="sidebar-footer">
        <span className="app-version-label">v{packageJson.version}</span>
      </div>
    </aside>
  );
};

export default Sidebar;
