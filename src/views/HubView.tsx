import React from 'react';
import { Plus, FolderKanban, Trash2, ArrowRight } from 'lucide-react';
import type { ProjectList, Task } from '../models/types';

interface HubViewProps {
  projectLists: ProjectList[];
  tasks: Task[];
  onInitializeProject: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const HubView: React.FC<HubViewProps> = ({ 
  projectLists, tasks, onInitializeProject, onSelectProject, onDeleteProject 
}) => {
  return (
    <div className="standard-page">
      <header className="header-section">
        <h1>Creation Hub</h1>
        <p>Manage your active project landscapes</p>
      </header>
      <div className="hub-grid">
        <div className="hub-card new-trigger" onClick={onInitializeProject}>
          <Plus size={24} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Initialize Project</span>
        </div>
        {projectLists.map(proj => (
          <div key={proj.id} className="hub-card" onClick={() => onSelectProject(proj.id)}>
            <div className="hub-card-header">
              <FolderKanban size={18} color="var(--accent-color)" />
              <button 
                className="entity-delete-trigger" 
                onClick={(e) => {
                  e.stopPropagation(); 
                  onDeleteProject(proj.id);
                }} 
                title="Delete Project"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <h3>{proj.name}</h3>
            <p>{tasks.filter(t => t.listId === proj.id).length} active items</p>
            <ArrowRight className="hub-card-arrow" size={14} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HubView;
