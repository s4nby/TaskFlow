import React, { useRef, useEffect, useState } from 'react';
import { X, FolderKanban, Scroll, ArrowRight, Target } from 'lucide-react';

interface ProjectNamingModalProps {
  isOpen: boolean;
  type?: 'project' | 'prompt';
  onClose: () => void;
  onCreate: (name: string) => void;
}

const ProjectNamingModal: React.FC<ProjectNamingModalProps> = ({ isOpen, type = 'project', onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setName('');
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name);
    } else {
      setError(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) setError(false);
  };

  const isPrompt = type === 'prompt';
  const accentColor = isPrompt ? '#227a39' : 'var(--accent-color)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="quick-add-flyout glass-effect project-naming-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '32px' }}
      >
        <button className="modal-close-btn" onClick={onClose} title="Close">
          <X size={20} />
        </button>
        
        <div className="flyout-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div className="modal-icon-container" style={{ background: `${accentColor}15`, color: accentColor, padding: '12px', borderRadius: '12px' }}>
            {isPrompt ? <Scroll size={24} /> : <FolderKanban size={24} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
              {isPrompt ? 'Initialize Prompt Group' : 'New Workspace'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, marginTop: '2px' }}>
              {isPrompt ? 'Categorize your administrative instructions' : 'Define the scope of your next big achievement'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-with-label" style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isPrompt ? 'Group Name' : 'Project Title'}
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                ref={inputRef}
                type="text" 
                placeholder={isPrompt ? "e.g. Content Strategy" : "e.g. Product Launch 2026"} 
                value={name} 
                onChange={handleChange} 
                className={`themed-field naming-input ${error ? 'error-field' : ''}`}
                style={{ 
                  fontSize: '1rem', 
                  padding: '14px 16px', 
                  marginBottom: 0,
                  borderWidth: '1px',
                  background: 'rgba(255,255,255,0.02)'
                }}
              />
              <Target size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.2 }} />
            </div>
            {error && <div className="error-text" style={{ marginTop: '8px', fontSize: '0.7rem' }}>{isPrompt ? 'A group name is required to continue' : 'A project title is required to initialize'}</div>}
          </div>

          <div className="modal-footer" style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button 
              type="button" 
              className="themed-secondary-btn" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="themed-primary-btn" 
              style={{ 
                flex: 2, 
                background: accentColor, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px' 
              }}
            >
              <span>{isPrompt ? 'Create Group' : 'Initialize Workspace'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .project-naming-modal {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid var(--glass-border);
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4);
        }
        .naming-input:focus {
          border-color: ${accentColor} !important;
          box-shadow: 0 0 0 4px ${accentColor}10;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ProjectNamingModal;
