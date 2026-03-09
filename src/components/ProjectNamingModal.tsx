import React, { useRef, useEffect, useState } from 'react';

interface ProjectNamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const ProjectNamingModal: React.FC<ProjectNamingModalProps> = ({ isOpen, onClose, onCreate }) => {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-add-flyout glass-effect" onClick={e => e.stopPropagation()}>
        <div className="flyout-header">
          <h3>Initialize Workspace</h3>
          <span className="flyout-date">Define your new project scope</span>
        </div>
        <form onSubmit={handleSubmit}>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Project Name (e.g. Q1 Marketing)" 
            value={name} 
            onChange={handleChange} 
            className={`flyout-input themed-field ${error ? 'error-field' : ''}`} 
          />
          {error && <div className="error-text">Project name is required</div>}
          <div className="flyout-actions">
            <button type="button" className="btn-cancel themed-secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit themed-primary-btn">Initialize Project</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectNamingModal;
