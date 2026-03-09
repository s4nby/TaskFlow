import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FolderKanban, ArrowRight, Plus } from 'lucide-react';
import type { DayData, ProjectList } from '../models/types';

interface CalendarViewProps {
  viewDate: Date;
  calendarDays: DayData[];
  onSelectProject: (id: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onInitializeProject: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  viewDate, calendarDays, onSelectProject, onPrevMonth, onNextMonth, onInitializeProject 
}) => {
  const [resolverProjects, setResolverProjects] = useState<ProjectList[] | null>(null);

  const handleCellClick = (dayData: DayData) => {
    if (dayData.projectsForDate.length === 0) return;
    
    if (dayData.projectsForDate.length === 1) {
      onSelectProject(dayData.projectsForDate[0].id);
    } else {
      setResolverProjects(dayData.projectsForDate);
    }
  };

  return (
    <div className="calendar-page full-width-layout">
      <div className="calendar-centered-container">
        <header className="calendar-header clean-nav">
          <h2>{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <div className="calendar-nav locked-baseline">
            <button className="nav-btn-minimal" onClick={onPrevMonth} title="Previous Month">
              <ChevronLeft size={20} />
            </button>
            <div className="nav-gap"></div>
            <button className="nav-btn-minimal" onClick={onNextMonth} title="Next Month">
              <ChevronRight size={20} />
            </button>
          </div>
        </header>
        <div className="calendar-container-7x5 compact-scale">
          <div className="calendar-weekday-header">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="weekday-label">{day}</div>
            ))}
          </div>
          <div className="calendar-grid-7x5">
            {calendarDays.map((dayData, idx) => {
              const projectCount = dayData.projectsForDate.length;
              const hasProjects = projectCount > 0;
              return (
                <div 
                  key={idx} 
                  className={`day-cell ${hasProjects ? 'interactive' : 'empty-cell'} ${!dayData.isCurrentMonth ? 'ghost' : ''} ${dayData.dateStr === new Date().toISOString().split('T')[0] ? 'today' : ''}`} 
                  onClick={hasProjects ? () => handleCellClick(dayData) : undefined}
                >
                  <div className="day-cell-header">
                    <span className="day-number">{dayData.day}</span>
                    <button 
                      className="day-add-project-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onInitializeProject(dayData.dateStr);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Initialize Project on this date"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="day-entities">
                    {projectCount === 1 ? (
                      <div className="project-indicator-label" title={dayData.projectsForDate[0].name}>
                        <FolderKanban size={10} />
                        <span>{dayData.projectsForDate[0].name}</span>
                      </div>
                    ) : projectCount > 1 ? (
                      <div className="project-indicator-badge multi">
                        {projectCount}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {resolverProjects && (
        <div className="modal-overlay" onClick={() => setResolverProjects(null)}>
          <div className="quick-add-flyout glass-effect resolver-modal" onClick={e => e.stopPropagation()}>
            <div className="flyout-header">
              <h3>Select Project</h3>
              <span className="flyout-date">Multiple entities detected</span>
            </div>
            <div className="resolver-list">
              {resolverProjects.map(proj => (
                <div key={proj.id} className="resolver-item" onClick={() => { onSelectProject(proj.id); setResolverProjects(null); }}>
                  <FolderKanban size={14} color="var(--accent-color)" />
                  <span>{proj.name}</span>
                  <ArrowRight size={14} className="resolver-arrow" />
                </div>
              ))}
            </div>
            <div className="flyout-actions" style={{ marginTop: '16px' }}>
              <button className="btn-cancel themed-secondary-btn" onClick={() => setResolverProjects(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
