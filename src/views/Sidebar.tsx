import React from 'react';
import { 
  Layout, List, 
  Calendar as CalendarIcon, Star, FolderKanban, Trash2 
} from 'lucide-react';
import type { ProjectList, ViewState } from '../models/types';

interface SidebarProps {
  isExpanded: boolean;
  activeListId: ViewState;
  projectLists: ProjectList[];
  onNavigate: (id: ViewState) => void;
  onDeleteProject: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isExpanded, activeListId, projectLists, onNavigate, onDeleteProject 
}) => {
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
        <div className={`list-item ${activeListId === 'important' ? 'active' : ''}`} onClick={() => onNavigate('important')}>
          <div className="list-icon"><Star size={18} /></div>
          {isExpanded && <span className="list-name">Important</span>}
        </div>

        <div className="sidebar-section-header">
          {isExpanded ? 'PROJECTS' : <div className="divider" />}
        </div>

        {projectLists.map(project => (
          <div key={project.id} className={`list-item ${activeListId === project.id ? 'active' : ''}`} onClick={() => onNavigate(project.id)}>
            <div className="list-icon"><FolderKanban size={18} /></div>
            {isExpanded && (
              <>
                <span className="list-name">{project.name}</span>
                <button 
                  className="entity-delete-trigger" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  title="Delete Project"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
