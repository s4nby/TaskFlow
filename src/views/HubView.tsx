import React from 'react';
import { Plus, FolderKanban, Trash2, ArrowRight, TrendingUp, Download, Star } from 'lucide-react';
import type { ProjectList, Task } from '../models/types';

interface HubViewProps {
  projectLists: ProjectList[];
  tasks: Task[];
  onInitializeProject: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onExport: () => void;
}

const HubView: React.FC<HubViewProps> = ({ 
  projectLists, tasks, onInitializeProject, onSelectProject, onDeleteProject, onExport
}) => {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="standard-page">
      <header className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Creation Hub</h1>
          <p>Manage your active project landscapes</p>
        </div>
        <button className="themed-secondary-btn export-btn" onClick={onExport}>
          <Download size={14} />
          Export Data
        </button>
      </header>

      <div className="trends-section">
        <div className="trends-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} className="themed-text-accent" />
            Productivity Trends
          </h3>
          <span className="themed-text-accent" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{completionRate}%</span>
        </div>
        <div style={{ height: '4px', background: 'var(--glass-border)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${completionRate}%`, background: 'var(--accent-color)', transition: 'width 1s ease-out' }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          {completedTasks} of {totalTasks} tasks completed across all projects.
        </p>
      </div>

      <div className={`hub-section ${projectLists.length === 0 ? 'empty-state' : ''}`} style={{ marginTop: '32px' }}>
        <div className="sidebar-section-header" style={{ paddingLeft: 0, marginBottom: '12px' }}>
          PROJECTS <div className="divider" />
        </div>
        <div className="hub-grid">
          <div className="hub-card new-trigger" onClick={onInitializeProject}>
            <Plus size={24} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Initialize Project</span>
          </div>
          {projectLists.map(proj => (
            <div key={proj.id} className="hub-card" onClick={() => onSelectProject(proj.id)} style={proj.isPreferred ? { borderColor: 'var(--accent-color)', background: 'rgba(59, 130, 246, 0.03)' } : {}}>
              <div className="hub-card-header">
                {proj.isPreferred ? <Star size={18} fill="#fbbf24" color="#fbbf24" /> : <FolderKanban size={18} color="var(--accent-color)" />}
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
    </div>
  );
};

export default HubView;
