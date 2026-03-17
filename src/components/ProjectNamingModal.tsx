import React, { useRef, useEffect, useState } from 'react';
import { X, FolderKanban, Scroll, ArrowRight } from 'lucide-react';

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

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={isPrompt ? 'Create prompt group' : 'Create workspace'}>
      <div className={`naming-modal ${isPrompt ? 'naming-modal--prompt' : 'naming-modal--project'}`} onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Close" aria-label="Close">
          <X size={16} aria-hidden="true" />
        </button>

        <div className="naming-modal-header">
          <div className="naming-modal-icon">
            {isPrompt ? <Scroll size={20} aria-hidden="true" /> : <FolderKanban size={20} aria-hidden="true" />}
          </div>
          <div>
            <h3 className="naming-modal-title">
              {isPrompt ? 'New Prompt Group' : 'New Workspace'}
            </h3>
            <p className="naming-modal-subtitle">
              {isPrompt ? 'Categorize your reusable instructions' : 'Define the scope of your next project'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="naming-modal-field">
            <label className="naming-modal-label">
              {isPrompt ? 'Group Name' : 'Project Title'}
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder={isPrompt ? 'e.g. Content Strategy' : 'e.g. Product Launch 2026'}
              value={name}
              onChange={handleChange}
              className={`naming-modal-input${error ? ' naming-modal-input--error' : ''}`}
              maxLength={200}
              aria-label={isPrompt ? 'Group name' : 'Project title'}
              aria-invalid={error}
            />
            {error && (
              <p className="naming-modal-error" role="alert">
                {isPrompt ? 'A group name is required.' : 'A project title is required.'}
              </p>
            )}
          </div>

          <div className="naming-modal-footer">
            <button type="button" className="themed-secondary-btn naming-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="naming-modal-submit">
              <span>{isPrompt ? 'Create Group' : 'Initialize'}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectNamingModal;
