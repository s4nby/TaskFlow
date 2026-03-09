import React, { useState } from 'react';
import { 
  Layout, List, 
  Calendar as CalendarIcon, Star, FolderKanban, Trash2, Pencil
} from 'lucide-react';
import type { ProjectList, ViewState } from '../models/types';

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

  return (
    <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="list-container">
        <div className={`list-item ${activeListId === 'hub' ? 'active' : ''}`} onClick={() => onNavigate('hub')}>
          <div className="list-icon"><Layout size={18} /></div>
          {isExpanded && <span className="list-name">Dashboard</span>}
        </div>
        <div className={`list-item ${activeListId === 'todo' ? 'active' : ''}`} onClick={() => onNavigate('todo')}>
          <div className="list-icon"><List size={18} /></div>
          {isExpanded && <span className="list-name">To Do List</span>}
        </div>
        <div className={`list-item ${activeListId === 'calendar' ? 'active' : ''}`} onClick={() => onNavigate('calendar')}>
          <div className="list-icon"><CalendarIcon size={18} /></div>
          {isExpanded && <span className="list-name">Calendar</span>}
        </div>
        
        <div className="sidebar-section-header">
          {isExpanded ? 'IMPORTANT' : <div className="divider" />}
        </div>

        <div className={`list-item ${activeListId === 'important' ? 'active' : ''}`} onClick={() => onNavigate('important')}>
          <div className="list-icon"><Star size={18} /></div>
          {isExpanded && <span className="list-name">All Important</span>}
        </div>

        <div className="sidebar-section-header">
          {isExpanded ? 'PROJECTS' : <div className="divider" />}
        </div>

        {projectLists.map(project => (
          <div key={project.id} className={`list-item ${activeListId === project.id ? 'active' : ''}`} onClick={() => onNavigate(project.id)}>
            <div className="list-icon">
              {project.isPreferred ? <Star size={18} fill="#fbbf24" color="#fbbf24" /> : <FolderKanban size={18} />}
            </div>
            
            {isExpanded && (
              <div className="list-content" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
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
                  <span className="list-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</span>
                )}
              </div>
            )}

            {isExpanded && !editingId && (
              <div className="list-actions" style={{ display: 'flex', gap: '2px' }}>
                <button 
                  className="entity-delete-trigger task-edit-trigger" 
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(project);
                  }}
                  title="Rename Project"
                >
                  <Pencil size={12} />
                </button>
                <button 
                  className="entity-delete-trigger sidebar-delete-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  title="Delete Project"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
